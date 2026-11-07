import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { desa, posyandu, balita } from "@/db/schema";
import { blindIndex } from "@/lib/crypto";
import { normalizeDateInput, normalizeTimeInput } from "@/lib/utils";

export type ImportResult = {
  inserted: number;
  failed: number;
  errors: { row: number; message: string }[];
};

/** Jalankan import baris demi baris. Baris kosong dilewati. Error dikumpulkan (tidak menggagalkan semua). */
export async function runImport(
  rows: any[],
  handler: (row: any) => Promise<void>
): Promise<ImportResult> {
  const errors: { row: number; message: string }[] = [];
  let inserted = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || Object.values(r).every((v) => v === "" || v == null)) continue;
    try {
      await handler(r);
      inserted++;
    } catch (e: any) {
      // +2 = baris spreadsheet (header di baris 1, data mulai baris 2)
      errors.push({ row: i + 2, message: e?.message || "Gagal" });
    }
  }
  return { inserted, failed: errors.length, errors };
}

/** Preload lookup desa & posyandu (hindari query per baris). */
export async function createLookups() {
  const [desaRows, posyRows] = await Promise.all([
    db.select().from(desa).where(isNull(desa.deleted_at)),
    db.select().from(posyandu).where(isNull(posyandu.deleted_at)),
  ]);
  const norm = (s: string) => String(s || "").toLowerCase().replace(/^desa\s+/i, "").trim();
  const desaByName = new Map(desaRows.map((d) => [norm(d.nama), d.id]));
  const posyByName = new Map(
    posyRows.map((p) => [String(p.nama || "").toLowerCase().trim(), { id: p.id, desa_id: p.desa_id }])
  );
  return {
    desaId: (nama?: string): number | null =>
      nama ? desaByName.get(norm(nama)) ?? null : null,
    posyanduId: (nama?: string): number | null => {
      if (!nama) return null;
      const p = posyByName.get(String(nama).toLowerCase().trim());
      return p ? p.id : null;
    },
  };
}

/** Cari balita by NIK (via blind index, karena NIK terenkripsi). */
export async function findBalitaIdByNik(nik: string): Promise<number | null> {
  const hash = blindIndex(String(nik || "").trim());
  if (!hash) return null;
  const rows = await db
    .select({ id: balita.id })
    .from(balita)
    .where(and(eq(balita.nik_hash, hash), isNull(balita.deleted_at)))
    .limit(1);
  return rows[0]?.id ?? null;
}

export function req(row: any, key: string, label: string): string {
  const v = row[key];
  if (v === undefined || v === null || String(v).trim() === "")
    throw new Error(`${label} wajib diisi`);
  return String(v).trim();
}

/**
 * Import dua tahap — mengurangi round-trip ke database (krusial di hosting dengan DB remote
 * seperti Neon: 150 baris × 2 query sekuensial bisa melewati batas waktu request → "Import gagal"):
 *  1) `prepare` memvalidasi & mengubah tiap baris TANPA insert; error dikumpulkan per baris.
 *  2) baris valid di-insert per chunk (1 query per chunk). Bila satu chunk gagal (mis. data melanggar
 *     constraint), chunk itu diulang baris demi baris agar error tercatat pada baris yang benar.
 */
export async function runImportBatched<T>(
  rows: any[],
  prepare: (row: any, index: number) => Promise<T> | T,
  insertMany: (items: T[]) => Promise<void>,
  chunkSize = 50
): Promise<ImportResult> {
  const errors: { row: number; message: string }[] = [];
  const valid: { row: number; item: T }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || Object.values(r).every((v) => v === "" || v == null)) continue;
    try {
      valid.push({ row: i + 2, item: await prepare(r, i) });
    } catch (e: any) {
      errors.push({ row: i + 2, message: e?.message || "Gagal" });
    }
  }
  let inserted = 0;
  for (let i = 0; i < valid.length; i += chunkSize) {
    const chunk = valid.slice(i, i + chunkSize);
    try {
      await insertMany(chunk.map((c) => c.item));
      inserted += chunk.length;
    } catch {
      for (const c of chunk) {
        try {
          await insertMany([c.item]);
          inserted++;
        } catch (e: any) {
          errors.push({ row: c.row, message: e?.message || "Gagal menyimpan" });
        }
      }
    }
  }
  errors.sort((a, b) => a.row - b.row);
  return { inserted, failed: errors.length, errors };
}

/**
 * Lookup balita aktif sekali query (NIK → id, plus data dasar untuk hitung umur/gizi),
 * pengganti `findBalitaIdByNik` per baris pada import massal.
 */
export async function createBalitaLookup() {
  const rows = await db
    .select({
      id: balita.id,
      nik_hash: balita.nik_hash,
      tanggal_lahir: balita.tanggal_lahir,
      jenis_kelamin: balita.jenis_kelamin,
      desa_id: balita.desa_id,
    })
    .from(balita)
    .where(isNull(balita.deleted_at));
  const byHash = new Map<string, number>();
  const byId = new Map<number, (typeof rows)[number]>();
  for (const r of rows) {
    byId.set(r.id, r);
    if (r.nik_hash) byHash.set(r.nik_hash, r.id);
  }
  const hashOf = (nik: string) => blindIndex(String(nik || "").trim());
  return {
    /** id balita aktif dengan NIK tsb, atau null */
    idByNik: (nik: string): number | null => {
      const h = hashOf(nik);
      return h ? byHash.get(h) ?? null : null;
    },
    hasNik: (nik: string): boolean => {
      const h = hashOf(nik);
      return !!h && byHash.has(h);
    },
    byId,
  };
}

/** Tanggal wajib — serial Excel / DD-MM-YYYY dinormalisasi ke YYYY-MM-DD; error jelas bila tak dikenali. */
export function reqDate(row: any, key: string, label: string): string {
  const raw = req(row, key, label);
  const d = normalizeDateInput(row[key]);
  if (!d) throw new Error(`${label} "${raw}" tidak dikenali — gunakan format YYYY-MM-DD`);
  return d;
}

/** Jam opsional — pecahan hari Excel / "9:00" dinormalisasi ke HH:MM; kosong → null. */
export function optTime(row: any, key: string, label: string): string | null {
  const v = row[key];
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const t = normalizeTimeInput(v);
  if (!t) throw new Error(`${label} "${String(v).trim()}" tidak dikenali — gunakan format HH:MM`);
  return t;
}

/** Teks opsional: kosong → null; selain itu di-trim. */
export function optText(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Nomor HP: Excel menghilangkan "0" di depan bila sel bertipe angka → pulihkan. */
export function optPhone(v: any): string | null {
  if (typeof v === "number") return Number.isFinite(v) ? "0" + String(Math.trunc(v)) : null;
  return optText(v);
}

/** Parse "Ya"/"y"/"1"/"true" → true; selain itu false; kosong → default. */
export function parseYaTidak(v: any, def: boolean): boolean {
  if (v === undefined || v === null || String(v).trim() === "") return def;
  const s = String(v).trim().toLowerCase();
  return s === "ya" || s === "y" || s === "1" || s === "true";
}
