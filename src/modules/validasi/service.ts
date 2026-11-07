import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { balita, pendampingan, pengukuran, users } from "@/db/schema";
import { updateReturning } from "@/db/repo";
import type { SessionUser } from "@/lib/session";

export type ValidasiTipe = "balita" | "pendampingan" | "pengukuran";

export type ValidasiItem = {
  tipe: "Balita" | "Pendampingan" | "Pengukuran";
  tipe_key: ValidasiTipe;
  id: number;
  balita_nama: string;
  detail: string;
  tanggal: string;
  kader_nama: string;
  validasi_status: string;
};

const TABLES = { balita, pendampingan, pengukuran };

export async function listValidasi(session: SessionUser, opts: { status?: string }) {
  // scope: ppkbd → desanya; admin → semua desa
  const scopeDesa = session.role === "ppkbd" ? session.desa_id : null;

  const balitaRows = await db
    .select({
      id: balita.id,
      nama: balita.nama,
      jenis_kelamin: balita.jenis_kelamin,
      nama_ibu: balita.nama_ibu,
      kader_id: balita.kader_id,
      validasi: balita.validasi_status,
      created_at: balita.created_at,
    })
    .from(balita)
    .where(and(isNull(balita.deleted_at), scopeDesa ? eq(balita.desa_id, scopeDesa) : undefined));

  const balitaIds = balitaRows.map((b) => b.id);
  const nameOf = new Map(balitaRows.map((b) => [b.id, b.nama]));

  const userRows = await db
    .select({ id: users.id, nama: users.nama })
    .from(users)
    .where(isNull(users.deleted_at));
  const userName = new Map(userRows.map((u) => [u.id, u.nama]));

  const [pendRows, pengRows] = await Promise.all([
    balitaIds.length
      ? db
          .select({
            id: pendampingan.id,
            balita_id: pendampingan.balita_id,
            tanggal: pendampingan.tanggal,
            makan: pendampingan.makan_telur,
            jumlah: pendampingan.jumlah_butir,
            kader_id: pendampingan.kader_id,
            nama_pendamping: pendampingan.nama_pendamping,
            genting: pendampingan.sasaran_genting,
            validasi: pendampingan.validasi_status,
          })
          .from(pendampingan)
          .where(and(inArray(pendampingan.balita_id, balitaIds), isNull(pendampingan.deleted_at)))
      : Promise.resolve([]),
    balitaIds.length
      ? db
          .select({
            id: pengukuran.id,
            balita_id: pengukuran.balita_id,
            tanggal: pengukuran.tanggal,
            bb: pengukuran.berat_badan,
            tb: pengukuran.tinggi_badan,
            z: pengukuran.z_score,
            kader_id: pengukuran.kader_id,
            validasi: pengukuran.validasi_status,
          })
          .from(pengukuran)
          .where(and(inArray(pengukuran.balita_id, balitaIds), isNull(pengukuran.deleted_at)))
      : Promise.resolve([]),
  ]);

  const items: ValidasiItem[] = [];

  for (const b of balitaRows) {
    items.push({
      tipe: "Balita",
      tipe_key: "balita",
      id: b.id,
      balita_nama: b.nama,
      detail: `${b.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} · Ibu ${b.nama_ibu}`,
      tanggal: (b.created_at ? new Date(b.created_at) : new Date()).toISOString().slice(0, 10),
      kader_nama: b.kader_id ? userName.get(b.kader_id) || "-" : "-",
      validasi_status: b.validasi,
    });
  }

  for (const p of pendRows as any[]) {
    const kader = p.nama_pendamping || (p.kader_id ? userName.get(p.kader_id) : "") || "-";
    items.push({
      tipe: "Pendampingan",
      tipe_key: "pendampingan",
      id: p.id,
      balita_nama: nameOf.get(p.balita_id) || "-",
      detail: `${p.makan ? `Makan ${p.jumlah ?? 1} butir` : "Tidak makan telur"}${p.genting ? " · Sasaran GENTING" : ""} · ${kader}`,
      tanggal: p.tanggal || "-",
      kader_nama: kader,
      validasi_status: p.validasi,
    });
  }

  for (const p of pengRows as any[]) {
    const kader = p.kader_id ? userName.get(p.kader_id) || "-" : "-";
    items.push({
      tipe: "Pengukuran",
      tipe_key: "pengukuran",
      id: p.id,
      balita_nama: nameOf.get(p.balita_id) || "-",
      detail: `BB ${p.bb}kg · TB ${p.tb}cm${p.z != null ? ` · Z ${p.z}` : ""}`,
      tanggal: p.tanggal || "-",
      kader_nama: kader,
      validasi_status: p.validasi,
    });
  }

  items.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  const counts = {
    menunggu: items.filter((i) => i.validasi_status === "menunggu").length,
    disetujui: items.filter((i) => i.validasi_status === "disetujui").length,
    ditolak: items.filter((i) => i.validasi_status === "ditolak").length,
    total: items.length,
  };

  const filtered = opts.status ? items.filter((i) => i.validasi_status === opts.status) : items;

  return { items: filtered, counts };
}

export async function setValidasi(tipe: ValidasiTipe, id: number, status: string) {
  const table: any = TABLES[tipe];
  if (!table) throw new Error("Tipe tidak valid");
  const rows = await updateReturning(
    table,
    { validasi_status: status, updated_at: new Date() },
    eq(table.id, id)
  );
  if (!rows[0]) throw new Error("Data tidak ditemukan");
  return rows[0];
}
