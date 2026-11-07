/**
 * GEMATI Pagerwojo — Schema versi MySQL (mirror schema.pg.ts).
 * Nama tabel & kolom IDENTIK dengan versi Postgres agar service layer tidak berubah.
 * Aturan loop: snake_case, TANPA foreign key, soft delete `deleted_at`, timestamps, index.
 */
import {
  mysqlTable,
  bigint,
  varchar,
  text,
  boolean,
  int,
  double,
  timestamp,
  index,
} from "drizzle-orm/mysql-core";

const pk = () => bigint("id", { mode: "number" }).autoincrement().primaryKey();

// ---------- users ----------
export const users = mysqlTable(
  "users",
  {
    id: pk(),
    username: varchar("username", { length: 100 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    nama: varchar("nama", { length: 150 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    desa_id: int("desa_id"),
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
export const desa = mysqlTable(
  "desa",
  {
    id: pk(),
    nama: varchar("nama", { length: 120 }).notNull(),
    kecamatan: varchar("kecamatan", { length: 120 }).notNull().default("Pagerwojo"),
    kabupaten: varchar("kabupaten", { length: 120 }).notNull().default("Tulungagung"),
    lat: double("lat"),
    lng: double("lng"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => ({ idxDeleted: index("idx_desa_deleted_at").on(t.deleted_at) })
);

// ---------- posyandu ----------
export const posyandu = mysqlTable(
  "posyandu",
  {
    id: pk(),
    nama: varchar("nama", { length: 120 }).notNull(),
    desa_id: int("desa_id").notNull(),
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
export const balita = mysqlTable(
  "balita",
  {
    id: pk(),
    nik: varchar("nik", { length: 255 }).notNull(),
    nik_hash: varchar("nik_hash", { length: 64 }),
    nama: varchar("nama", { length: 150 }).notNull(),
    jenis_kelamin: varchar("jenis_kelamin", { length: 1 }).notNull(),
    tempat_lahir: varchar("tempat_lahir", { length: 120 }),
    tanggal_lahir: varchar("tanggal_lahir", { length: 10 }).notNull(),
    nama_ayah: varchar("nama_ayah", { length: 150 }),
    nama_ibu: varchar("nama_ibu", { length: 150 }).notNull(),
    no_hp: varchar("no_hp", { length: 255 }),
    alamat: text("alamat"),
    rt: varchar("rt", { length: 10 }),
    rw: varchar("rw", { length: 10 }),
    dusun: varchar("dusun", { length: 120 }),
    desa_id: int("desa_id").notNull(),
    posyandu_id: int("posyandu_id"),
    kader_id: int("kader_id"),
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

// ---------- pendampingan ----------
export const pendampingan = mysqlTable(
  "pendampingan",
  {
    id: pk(),
    balita_id: int("balita_id").notNull(),
    tanggal: varchar("tanggal", { length: 10 }).notNull(),
    hari_ke: int("hari_ke"),
    jam: varchar("jam", { length: 8 }),
    makan_telur: boolean("makan_telur").notNull().default(true),
    jumlah_butir: int("jumlah_butir"),
    sasaran_genting: boolean("sasaran_genting").notNull().default(false),
    bantuan_genting: text("bantuan_genting"),
    nama_ota: varchar("nama_ota", { length: 150 }),
    kader_id: int("kader_id"),
    nama_pendamping: varchar("nama_pendamping", { length: 150 }),
    keterangan: text("keterangan"),
    foto_dokumentasi: text("foto_dokumentasi"),
    lokasi_lat: double("lokasi_lat"),
    lokasi_lng: double("lokasi_lng"),
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

// ---------- pengukuran ----------
export const pengukuran = mysqlTable(
  "pengukuran",
  {
    id: pk(),
    balita_id: int("balita_id").notNull(),
    tanggal: varchar("tanggal", { length: 10 }).notNull(),
    berat_badan: double("berat_badan").notNull(),
    tinggi_badan: double("tinggi_badan").notNull(),
    lingkar_kepala: double("lingkar_kepala"),
    lingkar_lengan_atas: double("lingkar_lengan_atas"),
    z_score: double("z_score"),
    status_gizi: varchar("status_gizi", { length: 20 }),
    risiko_stunting: varchar("risiko_stunting", { length: 20 }),
    kader_id: int("kader_id"),
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
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: pk(),
    user_id: int("user_id"),
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
export const appSettings = mysqlTable("app_settings", {
  id: int("id").primaryKey().default(1),
  nama_aplikasi: varchar("nama_aplikasi", { length: 200 })
    .notNull()
    .default("GEMATI - Pendampingan Makan Telur Cegah Stunting"),
  kecamatan: varchar("kecamatan", { length: 120 }).notNull().default("Pagerwojo"),
  kabupaten: varchar("kabupaten", { length: 120 }).notNull().default("Tulungagung"),
  provinsi: varchar("provinsi", { length: 120 }).notNull().default("Jawa Timur"),
  session_timeout: int("session_timeout").notNull().default(30),
  batas_login: int("batas_login").notNull().default(5),
  mode_maintenance: boolean("mode_maintenance").notNull().default(false),
  notif_email: boolean("notif_email").notNull().default(true),
  notif_push: boolean("notif_push").notNull().default(true),
  backup_otomatis: boolean("backup_otomatis").notNull().default(true),
  last_backup: timestamp("last_backup"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- notifications ----------
export const notifications = mysqlTable(
  "notifications",
  {
    id: pk(),
    user_id: int("user_id"),
    judul: varchar("judul", { length: 200 }).notNull(),
    pesan: text("pesan"),
    dibaca: boolean("dibaca").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ idxUser: index("idx_notif_user_id").on(t.user_id) })
);
