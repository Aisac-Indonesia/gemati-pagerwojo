# GEMATI Pagerwojo

![GEMATI - Sistem Informasi Pendampingan Makan Telur](promo/banner.png)

**Sistem Informasi Pendampingan Makan Telur Cegah Stunting** — Kecamatan Pagerwojo, Kabupaten Tulungagung.

Next.js 15 (App Router) · TypeScript · Tailwind · lucide-react · Drizzle ORM · **multi-database (Neon / PostgreSQL / MySQL)** · Recharts · Leaflet.

3 role: **Admin Kecamatan**, **PPKBD** (validasi per desa), **Kader/KPK** (input data). Dibangun mengikuti standar workflow `loop/` (Sainskerta): modular monolith, no foreign key, soft delete, snake_case.

---

## 1. Ringkasan Multi-Database (tanpa ketergantungan)

Aplikasi bisa jalan di **3 engine** dan **2 mode deploy**, dipilih lewat konfigurasi:

| Mode deploy | Engine yang didukung |
|-------------|----------------------|
| **Vercel** (serverless) | **Neon** (Postgres serverless) — WAJIB |
| **Non-Vercel** (VPS/Docker/self-host) | **PostgreSQL biasa** atau **MySQL/MariaDB** (Neon juga bisa) |

Engine dipilih via `DB_ENGINE` di `.env` **atau** lewat halaman **Superadmin → Deployment & DB** (Admin login → menu "Deployment & DB" → pilih mode + engine + isi koneksi + **Test Koneksi** + Simpan). Perubahan aktif setelah **migrate + restart**.

> Catatan: pemilihan engine adalah konfigurasi **saat deploy/boot**, bukan hot-swap runtime. Halaman Superadmin menyimpan pilihan + koneksi (ke `.env` pada self-host), lalu Anda menjalankan migrate & restart.

---

## 2. Prasyarat

- Node.js ≥ 20 (disarankan 22/24), npm ≥ 10
- Salah satu database: Neon / PostgreSQL / MySQL
- `git`

```bash
npm install
```

---

## 3. Konfigurasi `.env` per Engine

Buat file `.env` di root. Selalu isi `SESSION_SECRET` (dan opsional `PII_KEY` untuk enkripsi NIK/No.HP).

```env
SESSION_SECRET=ganti_dengan_string_acak_panjang
PII_KEY=ganti_dengan_kunci_enkripsi_pii
```

### A. Neon (Postgres serverless — untuk Vercel)
```env
DB_ENGINE=neon
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### B. PostgreSQL biasa (VPS/Docker)
```env
DB_ENGINE=postgres
DEPLOY_TARGET=node
DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/gemati
# PGSSL=true   # aktifkan bila server Postgres pakai SSL
```

### C. MySQL / MariaDB (VPS/Docker)
```env
DB_ENGINE=mysql
DEPLOY_TARGET=node
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=rahasia
MYSQL_DATABASE=gemati
# atau satu baris:
# MYSQL_URL=mysql://root:rahasia@127.0.0.1:3306/gemati
```

---

## 4. Migrate & Seed per Engine

Skema & migrasi terpisah per dialek (`drizzle/pg`, `drizzle/mysql`). Seed sama untuk semua (`npm run db:seed`, otomatis mengikuti `DB_ENGINE`).

### A. Neon / Postgres
```bash
# buat/ubah migrasi (kalau ganti schema)
npm run db:generate:pg
# terapkan migrasi ke database
npm run db:migrate:pg
#   — atau cara cepat (sinkron langsung tanpa file migrasi):
#   npm run db:push:pg

# isi data awal
npm run db:seed
```

### B. MySQL
```bash
# pastikan database `gemati` sudah dibuat di server MySQL:
#   CREATE DATABASE gemati CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

npm run db:generate:mysql       # (opsional, sudah ada file bawaan)
npm run db:migrate:mysql        # terapkan skema
#   — atau: npm run db:push:mysql

npm run db:seed                 # DB_ENGINE=mysql di .env
```

> Ganti engine = ubah `DB_ENGINE` di `.env` (atau lewat halaman Superadmin) → jalankan migrate engine tsb → `npm run db:seed` → restart.

Akun demo setelah seed:
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| PPKBD | `ppkbd.mulyosari` | `kader123` |
| Kader | `kader.mulyosari01` | `kader123` |

---

## 5. Menjalankan (development)

```bash
npm run dev          # http://localhost:3000
```

Build & start production lokal:
```bash
npm run build
npm run start
```

---

## 6. Deploy ke **Vercel** (dengan Neon)

1. Buat database di **Neon** (https://neon.tech) → salin connection string.
2. Push repo ke GitHub, import project di **Vercel**.
3. Di **Vercel → Settings → Environment Variables**, isi:
   ```
   DB_ENGINE=neon
   DATABASE_URL=postgresql://...-pooler...neon.tech/neondb?sslmode=require
   DATABASE_URL_UNPOOLED=postgresql://...neon.tech/neondb?sslmode=require
   SESSION_SECRET=...
   PII_KEY=...
   ```
   (Di Vercel, engine terkunci ke Neon otomatis.)
4. Jalankan migrasi + seed **sekali** dari lokal (arahkan ke DB Neon produksi):
   ```bash
   npm run db:migrate:pg
   npm run db:seed
   ```
5. **Deploy**. Framework preset: **Next.js** (sudah otomatis).

> Vercel serverless tidak bisa menulis `.env` — konfigurasi via dashboard Environment Variables, lalu redeploy.

---

## 7. Deploy **Non-Vercel** (VPS / Docker) — Postgres biasa / MySQL

> **DomaiNesia (cPanel Hosting) + Neon?** Lihat panduan khusus langkah demi langkah: [`DEPLOY-DOMAINESIA.md`](DEPLOY-DOMAINESIA.md) (pakai `server.js` + fitur cPanel "Setup Node.js App").

### Opsi A — VPS (Node + PM2 + Nginx)
```bash
# di server
git clone <repo> && cd gemati-pagerwojo
npm install
# buat .env sesuai engine (bagian 3B atau 3C)
npm run db:migrate:pg   # atau db:migrate:mysql
npm run db:seed
npm run build
# jalankan (contoh PM2)
npm i -g pm2
pm2 start "npm run start" --name gemati
pm2 save
```
Nginx reverse proxy ke `localhost:3000` + SSL (certbot):
```nginx
server {
  server_name gemati.example.go.id;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
}
# certbot --nginx -d gemati.example.go.id
```

### Opsi B — Docker Compose (app + Postgres/MySQL)
Contoh dengan MySQL:
```yaml
services:
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rahasia
      MYSQL_DATABASE: gemati
    ports: ["3306:3306"]
    volumes: ["dbdata:/var/lib/mysql"]
  app:
    build: .
    environment:
      DB_ENGINE: mysql
      DEPLOY_TARGET: node
      MYSQL_HOST: db
      MYSQL_USER: root
      MYSQL_PASSWORD: rahasia
      MYSQL_DATABASE: gemati
      SESSION_SECRET: ganti_ini
      PII_KEY: ganti_ini
    ports: ["3000:3000"]
    depends_on: [db]
volumes: { dbdata: {} }
```
Setelah `docker compose up -d`, jalankan migrate + seed di dalam container app:
```bash
docker compose exec app npm run db:migrate:mysql
docker compose exec app npm run db:seed
```
(Untuk Postgres biasa: ganti service `db` ke `image: postgres:16`, set `DB_ENGINE=postgres` + `DATABASE_URL=postgresql://...@db:5432/gemati`, jalankan `db:migrate:pg`.)

---

## 8. Halaman Superadmin → Deployment & DB

Login sebagai **Admin** → menu **"Deployment & DB"**:
- Pilih **Mode Deployment** (Vercel / Non-Vercel) — Vercel otomatis mengunci engine ke Neon.
- Pilih **Engine** (Neon / Postgres / MySQL).
- Isi **Koneksi** lalu klik **Test Koneksi** (mengecek koneksi live + versi server).
- **Simpan** — menyimpan pilihan (dan koneksi ke `.env` pada self-host). Lalu jalankan migrate engine terkait + **restart** aplikasi.

---

## 9. Struktur Proyek (Modular Monolith)

```
src/
├── app/(app)/*        # halaman terproteksi per role (sidebar + topbar)
├── app/api/*          # REST endpoints (controller)
├── modules/*          # service per domain (business logic)
├── db/                # schema.pg.ts, schema.mysql.ts, schema.ts (barrel), index.ts (factory), repo.ts, seed.ts
├── lib/               # db-config, db-test, session, crypto (PII), rateLimit, query, menu, gizi, utils
└── middleware.ts      # role guard (edge)
drizzle/pg  drizzle/mysql   # migrasi per dialek
dataroom/                    # referensi desain + 52 screenshot app asli
loop/                        # workflow Sainskerta
```

---

## 10. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `DATABASE_URL tidak ditemukan` | Pastikan `.env` terisi & (untuk script) pakai `--env-file=.env` (sudah di npm scripts) |
| Postgres SSL error/warning | Tambah `?sslmode=require` di URL, atau `PGSSL=true`; warning `sslmode` node-postgres aman diabaikan |
| MySQL `ECONNREFUSED` | Server MySQL belum jalan / host-port salah; cek via **Test Koneksi** |
| Ganti engine tidak berubah | Setelah ubah `.env`/Superadmin, **restart** app dan jalankan migrate engine baru |
| Vercel "no public output" | Framework preset harus **Next.js** (bukan "Other") |
| Data NIK tampak acak di DB | Normal — NIK & No.HP dienkripsi AES-256-GCM (`crypto.ts`), didekripsi di aplikasi |

---

## 11. Standar loop & Audit

Kepatuhan aturan `loop/` didokumentasikan di `architecture-decisions.md`, progres di `progress.md`, dan hasil audit keamanan/performa di `audit-report.md`. Ringkas: modular monolith ✅, no FK ✅, soft delete + restore + trashed ✅, snake_case ✅, migration ✅, backend-first ✅, rate-limit login ✅, enkripsi PII ✅.

---

## 🎨 Brand & Promotion Kit

Aset promosi siap pakai ada di [`promo/`](promo/). Logo **tidak diubah** —
`logo.png` dan `logo-wordmark.png` dirender persis dari spesifikasi brand yang
sudah ada di [`dataroom/01-DESIGN-TOKENS.md`](dataroom/01-DESIGN-TOKENS.md)
(kotak rounded hijau `#2e7d32` + ikon telur lucide `Egg` amber `#FBC02D`).

| Aset | File | Kegunaan |
| --- | --- | --- |
| Logo mark | `promo/logo.png` | Ikon / avatar (1024x1024, dari design tokens) |
| Logo lockup | `promo/logo-wordmark.png` | Docs, kop surat, slide |
| Software box | `promo/software-box.png` | Render produk 3D |
| Poster | `promo/poster.png` | Key art / cetak (portrait) |
| Banner | `promo/banner.png` | Hero wide / header README |
| Social preview | `promo/social-preview.png` | GitHub/Open Graph (1280x640) |
| Feature showcase | `promo/feature-showcase.png` | Dashboard, Data Balita, Validasi, Laporan |
| Social square | `promo/social-square.png` | Post IG / X (1:1) |
| Video iklan | `promo/gemati-ad-15s.mp4` | Iklan 15 detik 1080p + audio |

Palet brand: hijau `#2e7d32`, amber telur `#FBC02D`, hijau-hitam `#0b140f`.
