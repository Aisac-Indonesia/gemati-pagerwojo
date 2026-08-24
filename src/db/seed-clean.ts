/**
 * Seed BERSIH untuk produksi — isi HANYA data master:
 *   - users (admin/ppkbd/kader)  → biar bisa login
 *   - desa (10) + posyandu       → struktur wilayah
 *   - app_settings
 * KOSONG (tanpa dummy): balita, pendampingan, pengukuran, audit_logs, notifications.
 * Jalankan: npm run db:seed:clean
 */
import { config } from "dotenv";
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { db, engine } from "./index";
import { insertReturning } from "./repo";
import { users, desa, posyandu, appSettings } from "./schema";
import { sql } from "drizzle-orm";

const hash = (p: string) => bcrypt.hashSync(p, 10);

async function main() {
  console.log("🌱 Seeding BERSIH (master saja, tanpa dummy data)...");

  const tables = [
    "users", "desa", "posyandu", "balita", "pendampingan",
    "pengukuran", "audit_logs", "app_settings", "notifications",
  ];
  if (engine === "mysql") {
    for (const t of tables) await db.execute(sql.raw(`TRUNCATE TABLE \`${t}\``));
  } else {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
  }

  // ---------- DESA (10) ----------
  const desaNama = [
    "Mulyosari", "Kedungcangkring", "Samar", "Segawe", "Pagerwojo",
    "Penjor", "Gambiran", "Gondanggunung", "Kradinan", "Sidomulyo",
  ];
  const desaKoord: Array<[number, number]> = [
    [-8.1291, 111.7712], [-8.1401, 111.7602], [-8.1512, 111.7501], [-8.1623, 111.7405],
    [-8.1189, 111.781], [-8.1078, 111.7905], [-8.1701, 111.7305], [-8.181, 111.7208],
    [-8.135, 111.765], [-8.145, 111.755],
  ];
  const desaRows = await insertReturning(
    desa,
    desaNama.map((nama, i) => ({
      nama, kecamatan: "Pagerwojo", kabupaten: "Tulungagung",
      lat: desaKoord[i][0], lng: desaKoord[i][1],
    }))
  );
  const desaId = (nama: string) => desaRows.find((d: any) => d.nama === nama)!.id;
  console.log(`  ✓ ${desaRows.length} desa`);

  // ---------- POSYANDU ----------
  const posyanduDef: Array<[string, string]> = [
    ["Melati I", "Mulyosari"], ["Melati II", "Mulyosari"], ["Kenanga I", "Kedungcangkring"],
    ["Mawar I", "Pagerwojo"], ["Anggrek I", "Samar"], ["Dahlia I", "Segawe"],
  ];
  const posyanduRows = await insertReturning(
    posyandu,
    posyanduDef.map(([nama, d]) => ({ nama, desa_id: desaId(d) }))
  );
  console.log(`  ✓ ${posyanduRows.length} posyandu`);

  // ---------- USERS (8) ----------
  const usersDef = [
    { username: "admin", nama: "Sutrisno, S.KM", role: "admin", desa: null, phone: "081234567890" },
    { username: "ppkbd.mulyosari", nama: "Siti Aminah", role: "ppkbd", desa: "Mulyosari", phone: "081234567891" },
    { username: "ppkbd.kedungcangkring", nama: "Joko Prasetyo", role: "ppkbd", desa: "Kedungcangkring", phone: "081234567892" },
    { username: "ppkbd.pagerwojo", nama: "Endang Wahyuni", role: "ppkbd", desa: "Pagerwojo", phone: "081234567893" },
    { username: "kader.mulyosari01", nama: "Maryam Safitri", role: "kader", desa: "Mulyosari", phone: "081234567894" },
    { username: "kader.mulyosari02", nama: "Ahmad Fauzi", role: "kader", desa: "Mulyosari", phone: "081234567895" },
    { username: "kader.kedungcangkring01", nama: "Nur Hidayah", role: "kader", desa: "Kedungcangkring", phone: "081234567896" },
    { username: "kader.pagerwojo01", nama: "Wahyu Setiawan", role: "kader", desa: "Pagerwojo", phone: "081234567897" },
  ];
  const userRows = await insertReturning(
    users,
    usersDef.map((u) => ({
      username: u.username,
      password: hash(u.role === "admin" ? "admin123" : "kader123"),
      nama: u.nama, role: u.role,
      desa_id: u.desa ? desaId(u.desa) : null,
      phone: u.phone, email: `${u.username}@pagerwojo.go.id`, active: true,
    }))
  );
  console.log(`  ✓ ${userRows.length} users (admin/admin123, lainnya /kader123)`);

  // ---------- APP SETTINGS ----------
  await db.insert(appSettings).values({ id: 1 });
  console.log("  ✓ app_settings");

  console.log("✅ Seed bersih selesai! Balita/pendampingan/pengukuran KOSONG (siap input data asli).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seed bersih gagal:", e);
    process.exit(1);
  });
