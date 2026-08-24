import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { posyandu, desa } from "@/db/schema";
import { combine, searchCond, softDeleteCond, paginate } from "@/lib/query";
import { insertReturning, updateByIdReturning } from "@/db/repo";
import { runImport, createLookups, req, type ImportResult } from "@/modules/shared/import";

export type PosyanduInput = { nama: string; desa_id: number };

async function assertDesaValid(desaId: number) {
  const rows = await db
    .select({ id: desa.id })
    .from(desa)
    .where(and(eq(desa.id, desaId), isNull(desa.deleted_at)))
    .limit(1);
  if (!rows[0]) throw new Error("Desa tidak valid");
}

export async function listPosyandu(opts: {
  search?: string;
  trashed?: boolean;
  page: number;
  pageSize: number;
}) {
  const where = combine(
    softDeleteCond(posyandu.deleted_at, opts.trashed),
    searchCond(opts.search, [posyandu.nama])
  );
  const res = await paginate<typeof posyandu.$inferSelect>({
    table: posyandu,
    where,
    orderBy: desc(posyandu.created_at),
    page: opts.page,
    pageSize: opts.pageSize,
  });
  const desaRows = await db.select({ id: desa.id, nama: desa.nama }).from(desa);
  const desaMap = new Map(desaRows.map((d) => [d.id, d.nama]));
  const data = res.data.map((p) => ({ ...p, desa_nama: desaMap.get(p.desa_id) ?? null }));
  return { ...res, data };
}

export async function getPosyandu(id: number) {
  const rows = await db.select().from(posyandu).where(eq(posyandu.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createPosyandu(input: PosyanduInput) {
  const nama = input.nama?.trim();
  if (!nama) throw new Error("Nama posyandu wajib diisi");
  await assertDesaValid(input.desa_id);
  const rows = await insertReturning(posyandu, { nama, desa_id: input.desa_id });
  return rows[0];
}

export async function updatePosyandu(id: number, input: Partial<PosyanduInput>) {
  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (input.nama !== undefined) {
    const nama = input.nama?.trim();
    if (!nama) throw new Error("Nama posyandu wajib diisi");
    patch.nama = nama;
  }
  if (input.desa_id !== undefined) {
    await assertDesaValid(input.desa_id);
    patch.desa_id = input.desa_id;
  }
  const rows = await updateByIdReturning(posyandu, id, patch);
  if (!rows[0]) throw new Error("Posyandu tidak ditemukan");
  return rows[0];
}

export async function softDeletePosyandu(id: number) {
  await db.update(posyandu).set({ deleted_at: new Date() }).where(eq(posyandu.id, id));
}

export async function restorePosyandu(id: number) {
  await db.update(posyandu).set({ deleted_at: null }).where(eq(posyandu.id, id));
}

export async function getTrashedPosyandu(page = 1, pageSize = 50) {
  return listPosyandu({ trashed: true, page, pageSize });
}

/** Import massal posyandu dari Excel/CSV. Kolom: nama*, desa (nama). */
export async function importPosyandu(rows: any[]): Promise<ImportResult> {
  const lk = await createLookups();
  return runImport(rows, async (r) => {
    const nama = req(r, "nama", "Nama Posyandu");
    const desa_id = lk.desaId(r.desa);
    if (!desa_id) throw new Error(`Desa "${r.desa || ""}" tidak ditemukan`);
    await createPosyandu({ nama, desa_id });
  });
}
