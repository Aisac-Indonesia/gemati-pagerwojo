/**
 * GEMATI Pagerwojo — Database Schema (Drizzle / PostgreSQL / Neon)
 *
 * Aturan loop:
 *  - snake_case untuk semua tabel & kolom
 *  - TANPA foreign key constraint (relasi divalidasi di service layer)
 *  - Soft delete: kolom `deleted_at` (nullable) + index
 *  - Timestamps: created_at, updated_at
 */
import {
  pgTable,
  bigserial,
  text,
  varchar,
  boolean,
  integer,
  doublePrecision,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ---------- Enums (as text + check di app layer) ----------
export const ROLES = ["admin", "ppkbd", "kader"] as const;
export const JENIS_KELAMIN = ["L", "P"] as const;
export const STATUS_AKTIF = ["aktif", "nonaktif"] as const;
export const VALIDASI = ["menunggu", "disetujui", "ditolak"] as const;
export const STATUS_GIZI = ["normal", "kurang", "sangat_kurang"] as const;
export const RISIKO = ["normal", "tinggi"] as const;

// ---------- users ----------
export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    username: varchar("username", { length: 100 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    nama: varchar("nama", { length: 150 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(), // admin|ppkbd|kader
    desa_id: integer("desa_id"), // null untuk admin
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    active: boolean("active").notNull().default(true),
    last_login: timestamp("last_login"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    idxUsername: index("idx_users_username").on(t.username),
    idxRole: index("idx_users_role").on(t.role),
    idxDesa: index("idx_users_desa_id").on(t.desa_id),
    idxDeleted: index("idx_users_deleted_at").on(t.deleted_at),
  })
);

// ---------- desa ----------
export const desa = pgTable(
  "desa",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nama: varchar("nama", { length: 120 }).notNull(),
    kecamatan: varchar("kecamatan", { length: 120 }).notNull().default("Pagerwojo"),
    kabupaten: varchar("kabupaten", { length: 120 }).notNull().default("Tulungagung"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    idxDeleted: index("idx_desa_deleted_at").on(t.deleted_at),
  })
);

// ---------- posyandu ----------
export const posyandu = pgTable(
  "posyandu",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nama: varchar("nama", { length: 120 }).notNull(),
    desa_id: integer("desa_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    idxDesa: index("idx_posyandu_desa_id").on(t.desa_id),
    idxDeleted: index("idx_posyandu_deleted_at").on(t.deleted_at),
  })
);

// ---------- balita ----------
export const balita = pgTable(
  "balita",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nik: varchar("nik", { length: 255 }).notNull(), // terenkripsi (AES-GCM) — panjang lebih besar
    nik_hash: varchar("nik_hash", { length: 64 }), // blind index (HMAC) untuk search/unik
    nama: varchar("nama", { length: 150 }).notNull(),
    jenis_kelamin: varchar("jenis_kelamin", { length: 1 }).notNull(), // L|P
    tempat_lahir: varchar("tempat_lahir", { length: 120 }),
    tanggal_lahir: varchar("tanggal_lahir", { length: 10 }).notNull(), // YYYY-MM-DD
    nama_ayah: varchar("nama_ayah", { length: 150 }),
    nama_ibu: varchar("nama_ibu", { length: 150 }).notNull(),
    no_hp: varchar("no_hp", { length: 255 }), // terenkripsi (AES-GCM)
    alamat: text("alamat"),
    rt: varchar("rt", { length: 10 }),
    rw: varchar("rw", { length: 10 }),
    dusun: varchar("dusun", { length: 120 }),
    desa_id: integer("desa_id").notNull(),
    posyandu_id: integer("posyandu_id"),
    kader_id: integer("kader_id"),
    foto: text("foto"),
    status: varchar("status", { length: 20 }).notNull().default("aktif"),
    validasi_status: varchar("validasi_status", { length: 20 }).notNull().default("menunggu"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    idxNikHash: index("idx_balita_nik_hash").on(t.nik_hash),
    idxDesa: index("idx_balita_desa_id").on(t.desa_id),
    idxKader: index("idx_balita_kader_id").on(t.kader_id),
    idxValidasi: index("idx_balita_validasi").on(t.validasi_status),
    idxDeleted: index("idx_balita_deleted_at").on(t.deleted_at),
  })
);

// ---------- pendampingan (konsumsi telur harian) ----------
export const pendampingan = pgTable(
  "pendampingan",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    balita_id: integer("balita_id").notNull(),
    tanggal: varchar("tanggal", { length: 10 }).notNull(),
    hari_ke: integer("hari_ke"),
    jam: varchar("jam", { length: 8 }),
    makan_telur: boolean("makan_telur").notNull().default(true),
    jumlah_butir: integer("jumlah_butir"),
    sasaran_genting: boolean("sasaran_genting").notNull().default(false), // sasaran GENTING (Gerakan Orang Tua Asuh Cegah Stunting)?
    bantuan_genting: text("bantuan_genting"), // bantuan GENTING yang diterima/dibutuhkan
    nama_ota: varchar("nama_ota", { length: 150 }), // nama OTA (Orang Tua Asuh)
    kader_id: integer("kader_id"),
    nama_pendamping: varchar("nama_pendamping", { length: 150 }),
    keterangan: text("keterangan"),
    foto_dokumentasi: text("foto_dokumentasi"),
    lokasi_lat: doublePrecision("lokasi_lat"),
    lokasi_lng: doublePrecision("lokasi_lng"),
    validasi_status: varchar("validasi_status", { length: 20 }).notNull().default("menunggu"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    idxBalita: index("idx_pendampingan_balita_id").on(t.balita_id),
    idxKader: index("idx_pendampingan_kader_id").on(t.kader_id),
    idxValidasi: index("idx_pendampingan_validasi").on(t.validasi_status),
    idxTanggal: index("idx_pendampingan_tanggal").on(t.tanggal),
    idxDeleted: index("idx_pendampingan_deleted_at").on(t.deleted_at),
  })
);

// ---------- pengukuran (antropometri) ----------
export const pengukuran = pgTable(
  "pengukuran",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    balita_id: integer("balita_id").notNull(),
    tanggal: varchar("tanggal", { length: 10 }).notNull(),
    berat_badan: doublePrecision("berat_badan").notNull(),
    tinggi_badan: doublePrecision("tinggi_badan").notNull(),
    lingkar_kepala: doublePrecision("lingkar_kepala"),
    lingkar_lengan_atas: doublePrecision("lingkar_lengan_atas"),
    z_score: doublePrecision("z_score"),
    status_gizi: varchar("status_gizi", { length: 20 }),
    risiko_stunting: varchar("risiko_stunting", { length: 20 }),
    kader_id: integer("kader_id"),
    validasi_status: varchar("validasi_status", { length: 20 }).notNull().default("menunggu"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({
    idxBalita: index("idx_pengukuran_balita_id").on(t.balita_id),
    idxValidasi: index("idx_pengukuran_validasi").on(t.validasi_status),
    idxDeleted: index("idx_pengukuran_deleted_at").on(t.deleted_at),
  })
);

// ---------- audit_logs ----------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    user_id: integer("user_id"),
    user_nama: varchar("user_nama", { length: 150 }),
    user_role: varchar("user_role", { length: 20 }),
    aksi: varchar("aksi", { length: 50 }).notNull(),
    modul: varchar("modul", { length: 50 }).notNull(),
    detail: text("detail"),
    ip_address: varchar("ip_address", { length: 50 }),
    browser: varchar("browser", { length: 150 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    idxUser: index("idx_audit_user_id").on(t.user_id),
    idxAksi: index("idx_audit_aksi").on(t.aksi),
  })
);

// ---------- app_settings (single row id=1) ----------
export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  nama_aplikasi: varchar("nama_aplikasi", { length: 200 })
    .notNull()
    .default("GEMATI - Pendampingan Makan Telur Cegah Stunting"),
  kecamatan: varchar("kecamatan", { length: 120 }).notNull().default("Pagerwojo"),
  kabupaten: varchar("kabupaten", { length: 120 }).notNull().default("Tulungagung"),
  provinsi: varchar("provinsi", { length: 120 }).notNull().default("Jawa Timur"),
  session_timeout: integer("session_timeout").notNull().default(30),
  batas_login: integer("batas_login").notNull().default(5),
  mode_maintenance: boolean("mode_maintenance").notNull().default(false),
  notif_email: boolean("notif_email").notNull().default(true),
  notif_push: boolean("notif_push").notNull().default(true),
  backup_otomatis: boolean("backup_otomatis").notNull().default(true),
  last_backup: timestamp("last_backup"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- notifications ----------
export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    user_id: integer("user_id"),
    judul: varchar("judul", { length: 200 }).notNull(),
    pesan: text("pesan"),
    dibaca: boolean("dibaca").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    idxUser: index("idx_notif_user_id").on(t.user_id),
  })
);

// ---------- Types ----------
export type User = typeof users.$inferSelect;
export type Desa = typeof desa.$inferSelect;
export type Posyandu = typeof posyandu.$inferSelect;
export type Balita = typeof balita.$inferSelect;
export type Pendampingan = typeof pendampingan.$inferSelect;
export type Pengukuran = typeof pengukuran.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
