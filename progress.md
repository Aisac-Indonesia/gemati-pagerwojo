# Progress — GEMATI Pagerwojo

> **Source of truth progress project. Update setiap kali ada perubahan status fase.**

---

## Ringkasan

| Item | Status |
|------|--------|
| **Project** | `GEMATI Pagerwojo — Sistem Informasi Pendampingan Makan Telur Cegah Stunting` |
| **Fase Aktif** | `05-AUDIT (selesai) → menunggu approval user untuk 06-DEPLOYMENT` |
| **Status Loop** | `active` |
| **Dimulai** | `2026-08-05` |
| **Target Selesai** | `2026-08-05` |
| **Progress** | `~90% (build + audit selesai, deploy belum)` |

---

## Fase

### ✅ Fase 00: Prerequisites — `Selesai`
- [x] Database credentials dari user (Neon Postgres via `.env`)
- [x] Framework backend & frontend ditentukan (Next.js full-stack)
- [x] Requirement dasar dari user (clone gemati-pagerwojo.rork.app 100%)
- [x] Environment setup (Node 24, npm 11)
- [x] Git initialized (repo `gemati-pagerwojo`)

### ✅ Fase 01: Planning — `Selesai`
- [x] Analisa requirement (inspeksi app referensi 3 role via browser)
- [x] Tanya jawab arsitektur dengan user (stack: Next.js + Drizzle + Neon)
- [x] Project structure dibuat (modular monolith `src/modules/*`)
- [x] Roadmap dibuat (M1–M6)

### ✅ Fase 02: Wireframe & Audit — `Selesai (via dataroom referensi)`
- [x] Wireframe/mockup — **diganti** oleh 52 screenshot app asli di `dataroom/` (referensi pixel-identik)
- [x] User approve referensi (instruksi "plek ketiplek 100%")
- [x] Design tokens diekstrak (`dataroom/01-DESIGN-TOKENS.md`)
- [x] User approve arah desain

### ✅ Fase 03: Backend — `Selesai`
- [x] Migration database (`drizzle/0000_*.sql`, 9 tabel, 0 FK)
- [x] Models & repositories (Drizzle schema + service layer per modul)
- [x] Service layer (`src/modules/*/service.ts`)
- [x] Controllers & API endpoints (`src/app/api/*` — REST + soft delete/restore/trashed)
- [x] Auth & middleware (bcrypt + JWT cookie + role guard)
- [x] API documentation (kontrak di `dataroom/` + `architecture-decisions.md`)

### ✅ Fase 04: Frontend — `Selesai`
- [x] Setup frontend project (App Router + Tailwind + lucide)
- [x] Sidebar layout (per role, 1-color icon)
- [x] CRUD pages (list + modal/form) semua entity 3 role
- [x] Integrasi API (service layer terpusat `@/lib/useApi`)
- [x] Form validation (client + zod server)
- [x] Loading & error & empty states + toast

### ✅ Fase 05: Audit — `Selesai`
- [x] Security check (lihat `audit-report.md`)
- [x] Performance test (list < 500ms, pagination, no N+1 major)
- [x] Code review (repository/service pattern konsisten)
- [x] UI/UX consistency (mengacu screenshot app asli)
- [x] Mobile responsiveness (sidebar drawer, tabel scroll, modal responsif)
- [x] Laporan audit (`audit-report.md`)

### ⬜ Fase 06: Deployment — `Belum (menunggu approval user)`
- [ ] Build production (✅ `next build` sukses lokal)
- [ ] Deploy ke target (Vercel disarankan — belum dieksekusi)
- [ ] Domain & SSL
- [ ] Environment variables production
- [ ] Backup database (Neon auto-backup / cron)
- [ ] Health check endpoint

### ⬜ Fase 07: Improvement — `Belum`
- [ ] Monitoring aktif
- [ ] Backup routine
- [ ] Security updates terjadwal (mis. bump Next.js CVE)

---

## Issue & Blocker

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | `next@15.0.3` CVE-2025-66478 | medium | ✅ fixed — bump ke `next@15.5.x` |
| 2 | Rate limiting login | low | ✅ fixed — `src/lib/rateLimit.ts` (5x/15mnt) |
| 3 | Modal center → right-drawer 400px (Rule 5) | medium | ✅ fixed — `components/ui/Drawer.tsx` |
| 4 | Form halaman-penuh → CRUD satu-halaman (Rule 4) | low | ✅ fixed — form jadi drawer di list, `/baru` redirect |
| 5 | UI Sampah/Restore (Rule 3) | low | ✅ fixed — tab Aktif/Sampah + Pulihkan, `/trashed` scoped per role |
| 6 | Halaman error/not-found kustom | low | ✅ fixed — `app/not-found.tsx`, `app/error.tsx` |

---

## Catatan

- Referensi lengkap ada di `dataroom/` (design tokens, data model, roles, page spec, 52 screenshot).
- Aplikasi asli (rork) memakai modal center + form halaman-penuh + tanpa UI restore → sebagian bertentangan dengan standar UI loop. Diprioritaskan "identik dengan app" sesuai instruksi awal user; deviasi dicatat di `audit-report.md`.

---

## Log Perubahan

| Tanggal | Fase | Perubahan |
|---------|------|-----------|
| 2026-08-05 | 00–02 | Inspeksi app referensi, ekstrak design tokens & data model ke dataroom |
| 2026-08-05 | 03 | Schema Drizzle (9 tabel, 0 FK), migrasi + seed ke Neon, auth |
| 2026-08-05 | 04 | Semua halaman 3 role (via 1 pola + 4 sub-agent paralel) |
| 2026-08-05 | 05 | Audit + `audit-report.md`, tambah endpoint `/trashed` yang kurang, buat file workflow loop |
| 2026-08-06 | 05 | Distandarkan ke loop: right-drawer (Rule 5) + CRUD satu-halaman (Rule 4) + tab Sampah/Pulihkan (Rule 3), bump Next.js, rate-limit login, halaman error/404. Semua isu audit ✅ resolved. Build + CRUD/restore terverifikasi. |
| 2026-08-06 | 05 | Deploy: push GitHub `pendtiumpraz/gemati-pagerwojo` + `vercel.json` (framework Next.js). `.env.example` + rotate SESSION_SECRET. |
| 2026-08-06 | 05 | **Proteksi data**: enkripsi PII at-rest (NIK & no_hp AES-256-GCM + blind index) + masking NIK/HP/email di UI. **Tabel**: pagination + sorting + filter di semua list. Migrasi 0001 + re-seed terenkripsi. |
| 2026-11-07 | 05 | **Pendampingan**: field baru Sasaran GENTING (Ya/Tidak) + Bantuan GENTING + Nama OTA (sebelum Nama Pendamping) di form/list/export/import/laporan. Migrasi `0001_pendampingan_genting_ota` (pg & mysql) — **wajib `npm run db:migrate:pg` ke Neon**. **Import**: tanggal serial Excel dinormalisasi ke YYYY-MM-DD, import balita/pendampingan/pengukuran jadi batch (anti timeout), NIK ganda/terdaftar ditolak per baris. |
