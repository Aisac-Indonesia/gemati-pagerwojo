import { and, eq, isNull, desc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { balita, desa, posyandu, users, pendampingan, pengukuran } from "@/db/schema";
import { combine, softDeleteCond, paginate } from "@/lib/query";
import { insertReturning, updateByIdReturning } from "@/db/repo";
import { hitungUmur } from "@/lib/utils";
import { encryptPII, decryptPII, blindIndex } from "@/lib/crypto";
import {
  runImportBatched,
  createLookups,
  createBalitaLookup,
  req,
  reqDate,
  optText,
  optPhone,
  type ImportResult,
} from "@/modules/shared/import";
import type { SessionUser } from "@/lib/session";

export type BalitaInput = {
  nik: string;
  nama: string;
  jenis_kelamin: "L" | "P";
  tempat_lahir?: string | null;
  tanggal_lahir: string;
  nama_ayah?: string | null;
  nama_ibu: string;
  no_hp?: string | null;
  alamat?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  desa_id: number;
  posyandu_id?: number | null;
  foto?: string | null;
  status?: "aktif" | "nonaktif";
};

type BalitaRow = typeof balita.$inferSelect;

/** Peta referensi (desa, posyandu, kader) untuk enrich */
async function refMaps() {
  const [desaRows, posyanduRows, kaderRows] = await Promise.all([
    db.select({ id: desa.id, nama: desa.nama }).from(desa),
    db.select({ id: posyandu.id, nama: posyandu.nama }).from(posyandu),
    db.select({ id: users.id, nama: users.nama }).from(users),
  ]);
  return {
    desa: new Map(desaRows.map((d) => [d.id, d.nama])),
    posyandu: new Map(posyanduRows.map((p) => [p.id, p.nama])),
    kader: new Map(kaderRows.map((u) => [u.id, u.nama])),
  };
}

function enrichRow(
  b: BalitaRow,
  maps: { desa: Map<number, string>; posyandu: Map<number, string>; kader: Map<number, string> }
) {
  return {
    ...b,
    nik: decryptPII(b.nik), // dekripsi PII saat baca
    no_hp: decryptPII(b.no_hp),
    desa_nama: b.desa_id ? maps.desa.get(b.desa_id) ?? null : null,
    posyandu_nama: b.posyandu_id ? maps.posyandu.get(b.posyandu_id) ?? null : null,
    kader_nama: b.kader_id ? maps.kader.get(b.kader_id) ?? null : null,
    umur: hitungUmur(b.tanggal_lahir),
  };
}

export async function listBalita(opts: {
  role: "admin" | "ppkbd" | "kader";
  desa_id?: number | null;
  kader_id?: number | null;
  search?: string;
  trashed?: boolean;
  page: number;
  pageSize: number;
}) {
  // scoping per role
  let scopeCond;
  if (opts.role === "ppkbd") {
    scopeCond = opts.desa_id ? eq(balita.desa_id, opts.desa_id) : sql`false`;
  } else if (opts.role === "kader") {
    scopeCond = opts.kader_id ? eq(balita.kader_id, opts.kader_id) : sql`false`;
  }

  // NIK terenkripsi → cari via nik_hash (exact) bila query numerik; selain itu nama/ibu
  let searchC;
  if (opts.search) {
    const term = opts.search.trim();
    const conds = [ilike(balita.nama, `%${term}%`), ilike(balita.nama_ibu, `%${term}%`)];
    if (/^\d{4,}$/.test(term)) {
      const h = blindIndex(term);
      if (h) conds.push(eq(balita.nik_hash, h));
    }
    searchC = or(...conds);
  }

  const where = combine(
    softDeleteCond(balita.deleted_at, opts.trashed),
    scopeCond,
    searchC
  );

  const res = await paginate<BalitaRow>({
    table: balita,
    where,
    orderBy: desc(balita.created_at),
    page: opts.page,
    pageSize: opts.pageSize,
  });

  const maps = await refMaps();
  const data = res.data.map((b) => enrichRow(b, maps));
  return { ...res, data };
}

export async function getBalita(id: number) {
  const rows = await db.select().from(balita).where(eq(balita.id, id)).limit(1);
  if (!rows[0]) return null;
  const maps = await refMaps();
  const detail = enrichRow(rows[0], maps);

  // ringkasan
  const [pendCount, pendMakan, pengCount] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(pendampingan)
      .where(and(eq(pendampingan.balita_id, id), isNull(pendampingan.deleted_at))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(pendampingan)
      .where(and(eq(pendampingan.balita_id, id), eq(pendampingan.makan_telur, true), isNull(pendampingan.deleted_at))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(pengukuran)
      .where(and(eq(pengukuran.balita_id, id), isNull(pengukuran.deleted_at))),
  ]);

  const jumlah_pendampingan = pendCount[0]?.c ?? 0;
  const makan = pendMakan[0]?.c ?? 0;
  const jumlah_pengukuran = pengCount[0]?.c ?? 0;
  const persen_konsumsi = jumlah_pendampingan > 0 ? Math.round((makan / jumlah_pendampingan) * 100) : 0;

  return {
    ...detail,
    ringkasan: {
      jumlah_pendampingan,
      jumlah_pengukuran,
      persen_konsumsi,
    },
  };
}

/** Validasi referensi desa (pengganti FK, aturan loop) */
async function assertDesaValid(desaId: number) {
  const rows = await db
    .select({ id: desa.id })
    .from(desa)
    .where(and(eq(desa.id, desaId), isNull(desa.deleted_at)))
    .limit(1);
  if (!rows[0]) throw new Error("Desa tidak valid");
}

/** Bentuk row insert balita (PII dienkripsi at-rest) — dipakai form & import massal. */
function toBalitaRow(input: BalitaInput, kaderId?: number | null) {
  return {
    nik: encryptPII(input.nik)!, // enkripsi PII at-rest
    nik_hash: blindIndex(input.nik),
    nama: input.nama,
    jenis_kelamin: input.jenis_kelamin,
    tempat_lahir: input.tempat_lahir ?? null,
    tanggal_lahir: input.tanggal_lahir,
    nama_ayah: input.nama_ayah ?? null,
    nama_ibu: input.nama_ibu,
    no_hp: encryptPII(input.no_hp),
    alamat: input.alamat ?? null,
    rt: input.rt ?? null,
    rw: input.rw ?? null,
    dusun: input.dusun ?? null,
    desa_id: input.desa_id,
    posyandu_id: input.posyandu_id ?? null,
    kader_id: kaderId ?? null,
    foto: input.foto ?? null,
    status: input.status ?? "aktif",
    validasi_status: "menunggu",
  };
}

export async function createBalita(input: BalitaInput, kaderId?: number | null) {
  await assertDesaValid(input.desa_id);
  const rows = await insertReturning(balita, toBalitaRow(input, kaderId));
  return rows[0];
}

export async function updateBalita(id: number, input: Partial<BalitaInput>) {
  if (input.desa_id !== undefined) await assertDesaValid(input.desa_id);

  const patch: Record<string, unknown> = { updated_at: new Date() };
  const fields: (keyof BalitaInput)[] = [
    "nama", "jenis_kelamin", "tempat_lahir", "tanggal_lahir",
    "nama_ayah", "nama_ibu", "alamat", "rt", "rw", "dusun",
    "desa_id", "posyandu_id", "foto", "status",
  ];
  for (const f of fields) {
    if (input[f] !== undefined) patch[f] = input[f];
  }
  // PII terenkripsi
  if (input.nik !== undefined) {
    patch.nik = encryptPII(input.nik);
    patch.nik_hash = blindIndex(input.nik);
  }
  if (input.no_hp !== undefined) patch.no_hp = encryptPII(input.no_hp);

  const rows = await updateByIdReturning(balita, id, patch);
  if (!rows[0]) throw new Error("Balita tidak ditemukan");
  return rows[0];
}

export async function softDeleteBalita(id: number) {
  await db.update(balita).set({ deleted_at: new Date() }).where(eq(balita.id, id));
}

export async function restoreBalita(id: number) {
  await db.update(balita).set({ deleted_at: null }).where(eq(balita.id, id));
}

export async function getTrashed(opts: { search?: string; page: number; pageSize: number }) {
  return listBalita({ role: "admin", trashed: true, ...opts });
}

/** Opsi posyandu (untuk form), boleh difilter per desa */
export async function listPosyanduOpsi(desaId?: number) {
  const where = combine(
    isNull(posyandu.deleted_at),
    desaId ? eq(posyandu.desa_id, desaId) : undefined
  );
  const q = db.select({ id: posyandu.id, nama: posyandu.nama, desa_id: posyandu.desa_id }).from(posyandu);
  if (where) q.where(where);
  return q.orderBy(posyandu.nama);
}

/**
 * Import massal balita dari Excel/CSV. Kolom lihat IMPORT_FIELDS.balita.
 * Dua tahap (validasi semua baris → insert per chunk) agar tidak ada query per baris;
 * NIK yang sudah terdaftar / ganda di file ditolak supaya import ulang tidak menggandakan data.
 */
export async function importBalita(rows: any[], session: SessionUser): Promise<ImportResult> {
  const [lk, existing] = await Promise.all([createLookups(), createBalitaLookup()]);
  const kaderId = session.role === "kader" ? session.id : null;

  // kader/ppkbd dikunci ke desanya — validasi sekali, bukan per baris
  let desaAkunValid = true;
  if (session.role !== "admin") {
    desaAkunValid = !!session.desa_id;
    if (desaAkunValid) {
      try {
        await assertDesaValid(session.desa_id!);
      } catch {
        desaAkunValid = false;
      }
    }
  }

  const seenHash = new Set<string>(); // NIK ganda di dalam file yang sama

  return runImportBatched(
    rows,
    (r) => {
      const nik = req(r, "nik", "NIK").replace(/\s+/g, "");
      const hash = blindIndex(nik)!;
      if (existing.hasNik(nik)) throw new Error(`NIK ${nik} sudah terdaftar`);
      if (seenHash.has(hash)) throw new Error(`NIK ${nik} ganda di dalam file`);
      seenHash.add(hash);

      const nama = req(r, "nama", "Nama Balita");
      const jk = req(r, "jenis_kelamin", "Jenis Kelamin").toUpperCase();
      if (jk !== "L" && jk !== "P") throw new Error("Jenis Kelamin harus L atau P");
      const tanggal_lahir = reqDate(r, "tanggal_lahir", "Tanggal Lahir");
      const nama_ibu = req(r, "nama_ibu", "Nama Ibu");

      let desa_id: number;
      if (session.role === "admin") {
        const found = lk.desaId(optText(r.desa) ?? undefined);
        if (!found) throw new Error(`Desa "${r.desa || ""}" tidak ditemukan`);
        desa_id = found;
      } else {
        if (!desaAkunValid) throw new Error("Akun Anda belum terhubung ke desa yang valid");
        desa_id = session.desa_id!;
        // Cegah balita desa lain tercatat ke desa akun ini: kolom Desa (bila diisi) harus cocok.
        const desaFile = optText(r.desa);
        if (desaFile && lk.desaId(desaFile) !== desa_id)
          throw new Error(
            `Desa "${desaFile}" bukan desa akun Anda — import oleh admin atau akun desa tersebut`
          );
      }

      const status = String(r.status || "aktif").trim().toLowerCase();
      return toBalitaRow(
        {
          nik,
          nama,
          jenis_kelamin: jk as "L" | "P",
          tempat_lahir: optText(r.tempat_lahir),
          tanggal_lahir,
          nama_ayah: optText(r.nama_ayah),
          nama_ibu,
          no_hp: optPhone(r.no_hp),
          alamat: optText(r.alamat),
          rt: optText(r.rt),
          rw: optText(r.rw),
          dusun: optText(r.dusun),
          desa_id,
          posyandu_id: lk.posyanduId(optText(r.posyandu) ?? undefined),
          status: status === "nonaktif" ? "nonaktif" : "aktif",
        },
        kaderId
      );
    },
    async (items) => {
      await db.insert(balita).values(items);
    }
  );
}
