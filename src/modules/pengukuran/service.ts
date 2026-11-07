import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pengukuran, balita, desa } from "@/db/schema";
import { combine, softDeleteCond, searchCond } from "@/lib/query";
import { insertReturning, updateByIdReturning } from "@/db/repo";
import { hitungUmur, umurBulan } from "@/lib/utils";
import { hitungStatusGizi } from "@/lib/gizi";
import { runImportBatched, createBalitaLookup, req, reqDate, type ImportResult } from "@/modules/shared/import";
import type { SessionUser } from "@/lib/session";

export type PengukuranInput = {
  balita_id: number;
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  lingkar_kepala?: number | null;
  lingkar_lengan_atas?: number | null;
};

export type ListPengukuranOpts = {
  role: "admin" | "ppkbd" | "kader";
  desa_id?: number | null;
  kader_id?: number | null;
  balita_id?: number | null;
  search?: string;
  trashed?: boolean;
  page: number;
  pageSize: number;
};

/** Scoping: admin=semua, ppkbd=desanya (via balita.desa_id), kader=miliknya (kader_id). */
function scopeConds(opts: ListPengukuranOpts): Array<SQL | undefined> {
  const conds: Array<SQL | undefined> = [
    softDeleteCond(pengukuran.deleted_at, opts.trashed),
  ];
  if (opts.role === "kader" && opts.kader_id) {
    conds.push(eq(pengukuran.kader_id, opts.kader_id));
  } else if (opts.role === "ppkbd" && opts.desa_id) {
    conds.push(
      sql`${pengukuran.balita_id} IN (SELECT id FROM balita WHERE desa_id = ${opts.desa_id} AND deleted_at IS NULL)`
    );
  }
  if (opts.balita_id) conds.push(eq(pengukuran.balita_id, opts.balita_id));
  if (opts.search) conds.push(searchCond(opts.search, [pengukuran.status_gizi]));
  return conds;
}

export async function listPengukuran(opts: ListPengukuranOpts) {
  const where = combine(...scopeConds(opts)) as SQL;
  const offset = (opts.page - 1) * opts.pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(pengukuran)
      .where(where)
      .orderBy(desc(pengukuran.tanggal), desc(pengukuran.id))
      .limit(opts.pageSize)
      .offset(offset),
    db.select({ c: sql<number>`count(*)::int` }).from(pengukuran).where(where),
  ]);

  const balitaRows = await db.select().from(balita);
  const desaRows = await db.select({ id: desa.id, nama: desa.nama }).from(desa);
  const desaMap = new Map(desaRows.map((d) => [d.id, d.nama]));
  const balitaMap = new Map(balitaRows.map((b) => [b.id, b]));

  const data = rows.map((r) => {
    const b = balitaMap.get(r.balita_id);
    return {
      ...r,
      balita_nama: b?.nama ?? null,
      balita_umur: b ? hitungUmur(b.tanggal_lahir) : null,
      balita_desa: b ? desaMap.get(b.desa_id) ?? null : null,
    };
  });

  return { data, total: countRows[0]?.c ?? 0, page: opts.page, pageSize: opts.pageSize };
}

export async function getPengukuran(id: number) {
  const rows = await db.select().from(pengukuran).where(eq(pengukuran.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createPengukuran(input: PengukuranInput, kaderId: number | null) {
  const balitaRows = await db
    .select()
    .from(balita)
    .where(and(eq(balita.id, input.balita_id), isNull(balita.deleted_at)))
    .limit(1);
  const b = balitaRows[0];
  if (!b) throw new Error("Balita tidak ditemukan");

  const bulan = umurBulan(b.tanggal_lahir, new Date(input.tanggal));
  const gizi = hitungStatusGizi(
    input.tinggi_badan,
    bulan,
    b.jenis_kelamin as "L" | "P"
  );

  const rows = await insertReturning(pengukuran, {
    balita_id: input.balita_id,
    tanggal: input.tanggal,
    berat_badan: input.berat_badan,
    tinggi_badan: input.tinggi_badan,
    lingkar_kepala: input.lingkar_kepala ?? null,
    lingkar_lengan_atas: input.lingkar_lengan_atas ?? null,
    z_score: gizi.z_score,
    status_gizi: gizi.status_gizi,
    risiko_stunting: gizi.risiko_stunting,
    kader_id: kaderId,
    validasi_status: "menunggu",
  });
  return rows[0];
}

export async function updatePengukuran(id: number, input: Partial<PengukuranInput>) {
  const current = await getPengukuran(id);
  if (!current) throw new Error("Pengukuran tidak ditemukan");

  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (input.balita_id !== undefined) patch.balita_id = input.balita_id;
  if (input.tanggal !== undefined) patch.tanggal = input.tanggal;
  if (input.berat_badan !== undefined) patch.berat_badan = input.berat_badan;
  if (input.tinggi_badan !== undefined) patch.tinggi_badan = input.tinggi_badan;
  if (input.lingkar_kepala !== undefined) patch.lingkar_kepala = input.lingkar_kepala;
  if (input.lingkar_lengan_atas !== undefined)
    patch.lingkar_lengan_atas = input.lingkar_lengan_atas;

  // hitung ulang gizi bila tinggi/tanggal/balita berubah
  const balitaId = (input.balita_id ?? current.balita_id) as number;
  const tinggi = (input.tinggi_badan ?? current.tinggi_badan) as number;
  const tanggal = (input.tanggal ?? current.tanggal) as string;
  if (
    input.tinggi_badan !== undefined ||
    input.tanggal !== undefined ||
    input.balita_id !== undefined
  ) {
    const bRows = await db.select().from(balita).where(eq(balita.id, balitaId)).limit(1);
    const b = bRows[0];
    if (b) {
      const bulan = umurBulan(b.tanggal_lahir, new Date(tanggal));
      const gizi = hitungStatusGizi(tinggi, bulan, b.jenis_kelamin as "L" | "P");
      patch.z_score = gizi.z_score;
      patch.status_gizi = gizi.status_gizi;
      patch.risiko_stunting = gizi.risiko_stunting;
    }
  }

  const rows = await updateByIdReturning(pengukuran, id, patch);
  return rows[0];
}

export async function softDeletePengukuran(id: number) {
  await db.update(pengukuran).set({ deleted_at: new Date() }).where(eq(pengukuran.id, id));
}

export async function restorePengukuran(id: number) {
  await db.update(pengukuran).set({ deleted_at: null }).where(eq(pengukuran.id, id));
}

export async function getTrashedPengukuran(page = 1, pageSize = 50) {
  return listPengukuran({ role: "admin", trashed: true, page, pageSize });
}

/** Parse angka desimal ("9,2" atau "9.2"). Kosong → null; NaN → throw. */
function numOrNull(v: any, label: string): number | null {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (Number.isNaN(n)) throw new Error(`${label} bukan angka valid`);
  return n;
}

function numReq(v: any, label: string): number {
  const n = numOrNull(v, label);
  if (n === null) throw new Error(`${label} wajib diisi`);
  return n;
}

/** Import massal pengukuran dari Excel/CSV. Kolom lihat IMPORT_FIELDS.pengukuran. */
export async function importPengukuran(
  rows: any[],
  session: SessionUser
): Promise<ImportResult> {
  // Lookup balita sekali query; validasi semua baris dulu, lalu insert per chunk (tanpa query per baris).
  const lookup = await createBalitaLookup();
  return runImportBatched(
    rows,
    (r) => {
      const nik = req(r, "nik", "NIK Balita");
      const balita_id = lookup.idByNik(nik);
      const b = balita_id ? lookup.byId.get(balita_id) : undefined;
      if (!balita_id || !b) throw new Error(`NIK ${nik} tidak ditemukan`);
      const tanggal = reqDate(r, "tanggal", "Tanggal");
      const berat_badan = numReq(r.berat_badan, "Berat Badan");
      const tinggi_badan = numReq(r.tinggi_badan, "Tinggi Badan");

      const bulan = umurBulan(b.tanggal_lahir, new Date(tanggal));
      const gizi = hitungStatusGizi(tinggi_badan, bulan, b.jenis_kelamin as "L" | "P");

      return {
        balita_id,
        tanggal,
        berat_badan,
        tinggi_badan,
        lingkar_kepala: numOrNull(r.lingkar_kepala, "Lingkar Kepala"),
        lingkar_lengan_atas: numOrNull(r.lingkar_lengan_atas, "Lingkar Lengan Atas"),
        z_score: gizi.z_score,
        status_gizi: gizi.status_gizi,
        risiko_stunting: gizi.risiko_stunting,
        kader_id: session.id,
        validasi_status: "menunggu",
      };
    },
    async (items) => {
      await db.insert(pengukuran).values(items);
    }
  );
}
