/**
 * Aksi massal (pilih banyak) untuk tabel dengan soft delete:
 *   - delete  : pindahkan ke Sampah (isi deleted_at)
 *   - restore : pulihkan dari Sampah (kosongkan deleted_at)
 *   - purge   : HAPUS PERMANEN — hanya untuk data yang sudah ada di Sampah, hanya admin
 *
 * Hak akses & cakupan data mengikuti aksi satuan:
 *   balita       : admin semua, ppkbd desanya, kader miliknya (kader_id)
 *   pendampingan : admin semua, kader miliknya
 *   pengukuran   : admin semua, kader miliknya
 *   desa / posyandu / users : admin saja
 * ID di luar cakupan atau status yang salah (mis. purge data aktif) dilewati, tidak error.
 */
import { and, eq, inArray, isNotNull, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { balita, pendampingan, pengukuran, desa, posyandu, users, notifications } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { SessionUser } from "@/lib/session";

export const BULK_ACTIONS = ["delete", "restore", "purge"] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

export const BULK_ENTITIES = ["balita", "pendampingan", "pengukuran", "desa", "posyandu", "users"] as const;
export type BulkEntity = (typeof BULK_ENTITIES)[number];

type Role = SessionUser["role"];

type EntityCfg = {
  table: any;
  modul: string;
  /** role yang boleh delete & restore */
  roles: Role[];
  /** role yang boleh hapus permanen */
  purgeRoles: Role[];
  /** batasi baris sesuai role (undefined = tanpa batasan tambahan) */
  scope?: (s: SessionUser) => SQL | undefined;
};

const NONE = -1; // id mustahil → kondisi selalu false bila sesi tak punya desa

const CFG: Record<BulkEntity, EntityCfg> = {
  balita: {
    table: balita,
    modul: "Balita",
    roles: ["admin", "ppkbd", "kader"],
    purgeRoles: ["admin"],
    scope: (s) =>
      s.role === "ppkbd"
        ? eq(balita.desa_id, s.desa_id ?? NONE)
        : s.role === "kader"
          ? eq(balita.kader_id, s.id)
          : undefined,
  },
  pendampingan: {
    table: pendampingan,
    modul: "Pendampingan",
    roles: ["admin", "kader"],
    purgeRoles: ["admin"],
    scope: (s) => (s.role === "kader" ? eq(pendampingan.kader_id, s.id) : undefined),
  },
  pengukuran: {
    table: pengukuran,
    modul: "Pengukuran",
    roles: ["admin", "kader"],
    purgeRoles: ["admin"],
    scope: (s) => (s.role === "kader" ? eq(pengukuran.kader_id, s.id) : undefined),
  },
  desa: { table: desa, modul: "Desa", roles: ["admin"], purgeRoles: ["admin"] },
  posyandu: { table: posyandu, modul: "Posyandu", roles: ["admin"], purgeRoles: ["admin"] },
  users: { table: users, modul: "Pengguna", roles: ["admin"], purgeRoles: ["admin"] },
};

export function bulkModul(entity: BulkEntity) {
  return CFG[entity].modul;
}

export type BulkResult = { affected: number; skipped: number; notes: string[] };

export async function bulkAction(
  entity: BulkEntity,
  action: BulkAction,
  ids: number[],
  session: SessionUser
): Promise<BulkResult> {
  const cfg = CFG[entity];
  const allowed = action === "purge" ? cfg.purgeRoles : cfg.roles;
  if (!allowed.includes(session.role)) {
    throw new ApiError(
      403,
      action === "purge" ? "Hapus permanen hanya untuk Admin" : "Tidak diizinkan"
    );
  }

  const t = cfg.table;
  const uniq = Array.from(new Set(ids));
  const conds = [
    inArray(t.id, uniq),
    action === "delete" ? isNull(t.deleted_at) : isNotNull(t.deleted_at),
    cfg.scope?.(session),
  ].filter(Boolean) as SQL[];
  const found: { id: number }[] = await db.select({ id: t.id }).from(t).where(and(...conds));
  let target = found.map((r) => r.id);
  const notes: string[] = [];

  // Akun sendiri tidak boleh dihapus / dihapus permanen
  if (entity === "users" && action !== "restore" && target.includes(session.id)) {
    target = target.filter((id) => id !== session.id);
    notes.push("akun Anda sendiri dilewati");
  }

  // ---- Jaga relasi (tanpa FK di DB, jadi dicek di sini) ----
  // Hapus permanen DITOLAK bila masih dirujuk data lain — termasuk data yang ada di Sampah,
  // supaya tidak ada rujukan "yatim" kalau data itu nanti dipulihkan.
  if (action === "purge" && target.length) {
    const exclude = async (label: string, refs: Promise<{ id: number | null }[]>[]) => {
      const rows = (await Promise.all(refs)).flat();
      const used = new Set<number>(rows.map((r) => Number(r.id)));
      const before = target.length;
      target = target.filter((id) => !used.has(id));
      if (target.length < before) notes.push(`${before - target.length} ${label}`);
    };
    if (entity === "desa") {
      await exclude("desa masih dipakai data balita/posyandu/pengguna", [
        db.select({ id: balita.desa_id }).from(balita).where(inArray(balita.desa_id, target)),
        db.select({ id: posyandu.desa_id }).from(posyandu).where(inArray(posyandu.desa_id, target)),
        db.select({ id: users.desa_id }).from(users).where(inArray(users.desa_id, target)),
      ]);
    } else if (entity === "posyandu") {
      await exclude("posyandu masih dipakai data balita", [
        db.select({ id: balita.posyandu_id }).from(balita).where(inArray(balita.posyandu_id, target)),
      ]);
    } else if (entity === "users") {
      await exclude("pengguna masih tercatat sebagai kader di data balita/pendampingan/pengukuran", [
        db.select({ id: balita.kader_id }).from(balita).where(inArray(balita.kader_id, target)),
        db.select({ id: pendampingan.kader_id }).from(pendampingan).where(inArray(pendampingan.kader_id, target)),
        db.select({ id: pengukuran.kader_id }).from(pengukuran).where(inArray(pengukuran.kader_id, target)),
      ]);
    }
  }

  // Pulihkan DITOLAK bila bentrok dengan data aktif (NIK / username sudah dipakai lagi)
  if (action === "restore" && target.length && (entity === "balita" || entity === "users")) {
    const before = target.length;
    if (entity === "balita") {
      const trashed = await db
        .select({ id: balita.id, h: balita.nik_hash })
        .from(balita)
        .where(inArray(balita.id, target));
      const hashes = trashed.map((r) => r.h).filter(Boolean) as string[];
      const aktif = hashes.length
        ? await db
            .select({ h: balita.nik_hash })
            .from(balita)
            .where(and(inArray(balita.nik_hash, hashes), isNull(balita.deleted_at)))
        : [];
      const taken = new Set(aktif.map((r) => r.h));
      const seen = new Set<string>();
      target = trashed
        .filter((r) => {
          if (!r.h) return true;
          if (taken.has(r.h) || seen.has(r.h)) return false;
          seen.add(r.h);
          return true;
        })
        .map((r) => r.id);
      if (target.length < before) notes.push(`${before - target.length} balita NIK-nya sudah terdaftar di data aktif`);
    } else {
      const trashed = await db
        .select({ id: users.id, u: users.username })
        .from(users)
        .where(inArray(users.id, target));
      const names = trashed.map((r) => r.u);
      const aktif = names.length
        ? await db
            .select({ u: users.username })
            .from(users)
            .where(and(inArray(users.username, names), isNull(users.deleted_at)))
        : [];
      const taken = new Set(aktif.map((r) => r.u));
      const seen = new Set<string>();
      target = trashed
        .filter((r) => {
          if (taken.has(r.u) || seen.has(r.u)) return false;
          seen.add(r.u);
          return true;
        })
        .map((r) => r.id);
      if (target.length < before) notes.push(`${before - target.length} username sudah dipakai akun aktif`);
    }
  }

  if (target.length) {
    if (action === "delete") {
      await db.update(t).set({ deleted_at: new Date() }).where(inArray(t.id, target));
    } else if (action === "restore") {
      await db.update(t).set({ deleted_at: null }).where(inArray(t.id, target));
    } else {
      // purge — data turunan milik baris ini ikut dihapus (tanpa FK, jadi manual).
      // Turunan dihapus lebih dulu: bila proses terputus, tidak ada data yatim.
      if (entity === "balita") {
        await db.delete(pendampingan).where(inArray(pendampingan.balita_id, target));
        await db.delete(pengukuran).where(inArray(pengukuran.balita_id, target));
      } else if (entity === "users") {
        await db.delete(notifications).where(inArray(notifications.user_id, target));
        // audit_logs sengaja dipertahankan (riwayat; nama pengguna tersimpan di user_nama)
      }
      await db.delete(t).where(inArray(t.id, target));
    }
  }

  return { affected: target.length, skipped: uniq.length - target.length, notes };
}
