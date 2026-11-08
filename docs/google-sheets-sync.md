# Sinkron ke Google Spreadsheet (satu arah)

Website tetap satu-satunya tempat input. Spreadsheet hanya **menerima** salinan data setiap 5 menit.
Edit di spreadsheet **tidak** dikirim balik ke website.

## Alur

```
Google Apps Script (di spreadsheet, tiap 5 menit)
   └─ GET https://DOMAIN/api/sync/sheets   (Authorization: Bearer TOKEN)
        └─ website mengirim snapshot data aktif (balita, pendampingan, pengukuran, desa, posyandu, kader & PPKBD)
   └─ tulis ke tab "GEMATI - Balita", "GEMATI - Pendampingan", dst.
```

- Hanya tab berawalan `GEMATI - ` yang ditulis. Tab lain di spreadsheet tidak disentuh.
- Data yang dipindah ke Sampah di website ikut hilang dari spreadsheet pada sync berikutnya.
- Password, No. HP & email pengguna tidak pernah dikirim.
- NIK & No. HP balita **disamarkan** secara default. Untuk tampil penuh set `SHEETS_SYNC_PII=full`
  (hanya bila spreadsheet dibagikan terbatas ke orang yang berwenang).

## Langkah pasang (sekali saja)

1. **Buat token** di komputer:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Hosting** (cPanel → Setup Node.js App → Environment variables), tambahkan lalu **Restart**:
   ```
   SHEETS_SYNC_TOKEN=<token dari langkah 1>
   SHEETS_SYNC_PII=masked
   ```
3. **Spreadsheet** → menu **Ekstensi → Apps Script** → hapus isi `Code.gs`, tempel isi
   `docs/google-sheets-sync.gs` → Simpan.
4. Di Apps Script → **Setelan Project (ikon gerigi) → Properti skrip** → tambah:
   | Properti | Nilai |
   |---|---|
   | `GEMATI_URL` | `https://domain-website-kamu` (tanpa `/` di akhir) |
   | `GEMATI_TOKEN` | token yang sama dengan langkah 1 |
5. Kembali ke editor → pilih fungsi **`pasangOtomatis`** → **Jalankan** → izinkan akses
   (akses spreadsheet + koneksi ke URL luar). Sync pertama langsung jalan.
6. Muat ulang spreadsheet → muncul menu **GEMATI → Sync sekarang** untuk sync manual.

Matikan sync: jalankan `hapusOtomatis`, atau kosongkan `SHEETS_SYNC_TOKEN` di hosting.

## Cek cepat

```bash
curl -H "Authorization: Bearer TOKEN" https://DOMAIN/api/sync/sheets
```
`404` = token belum diset di hosting · `401` = token salah · `200` = OK.
