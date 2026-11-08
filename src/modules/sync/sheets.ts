/**
 * Snapshot seluruh data aktif untuk disalin ke Google Spreadsheet (SATU ARAH: website → sheet).
 * Dibaca oleh Google Apps Script (lihat docs/google-sheets-sync.gs) lewat GET /api/sync/sheets.
 * Data di Sampah (deleted_at terisi) tidak ikut — di sheet ikut hilang pada sync berikutnya.
 *
 * PII (NIK, No. HP): default DISAMARKAN. Set SHEETS_SYNC_PII=full di env untuk menampilkan penuh
 * (pastikan spreadsheet hanya dibagikan ke orang yang berwenang — UU PDP).
 */
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { balita, pendampingan, pengukuran, desa, posyandu, users } from "@/db/schema";
import { decryptPII } from "@/lib/crypto";
import { maskNik, maskPhone } from "@/lib/mask";
import { hitungUmur } from "@/lib/utils";

type Cell = string | number | boolean | null;
export type SheetTab = {
  name: string;
  headers: string[];
  /** indeks kolom yang harus disimpan sebagai TEKS (NIK, No. HP, RT, tanggal, jam) */
  text: number[];
  rows: Cell[][];
};

const LABEL_VALIDASI: Record<string, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};
const yaTidak = (v: unknown) => (v ? "Ya" : "Tidak");
const ts = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().replace("T", " ").slice(0, 19) : "";

function tab(name: string, cols: { h: string; text?: boolean }[], rows: Cell[][]): SheetTab {
  return {
    name,
    headers: cols.map((c) => c.h),
    text: cols.flatMap((c, i) => (c.text ? [i] : [])),
    rows,
  };
}

export async function buildSheetsSnapshot(): Promise<{ generated_at: string; pii: "full" | "masked"; tabs: SheetTab[] }> {
  const full = (process.env.SHEETS_SYNC_PII || "").toLowerCase() === "full";
  const nik = (v: string | null) => {
    const plain = decryptPII(v) ?? "";
    return full ? plain : maskNik(plain);
  };
  const hp = (v: string | null) => {
    const plain = decryptPII(v) ?? "";
    return full ? plain : maskPhone(plain);
  };

  const [desaRows, posyRows, userRows, balitaRows, pendRows, pengRows] = await Promise.all([
    db.select().from(desa).where(isNull(desa.deleted_at)),
    db.select().from(posyandu).where(isNull(posyandu.deleted_at)),
    db.select().from(users).where(isNull(users.deleted_at)),
    db.select().from(balita).where(isNull(balita.deleted_at)),
    db.select().from(pendampingan).where(isNull(pendampingan.deleted_at)),
    db.select().from(pengukuran).where(isNull(pengukuran.deleted_at)),
  ]);

  const desaNama = new Map(desaRows.map((d) => [d.id, d.nama]));
  const posyNama = new Map(posyRows.map((p) => [p.id, p.nama]));
  const userNama = new Map(userRows.map((u) => [u.id, u.nama]));
  const balitaById = new Map(balitaRows.map((b) => [b.id, b]));
  // pendampingan/pengukuran milik balita yang ada di Sampah tidak ikut (konsisten dengan data aktif)
  const pendAktif = pendRows.filter((p) => balitaById.has(p.balita_id));
  const pengAktif = pengRows.filter((p) => balitaById.has(p.balita_id));

  const sortBy = <T>(arr: T[], key: (x: T) => string | number) =>
    [...arr].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

  const tabs: SheetTab[] = [
    tab(
      "Balita",
      [
        { h: "ID" }, { h: "NIK", text: true }, { h: "Nama Balita" }, { h: "JK" },
        { h: "Tempat Lahir" }, { h: "Tanggal Lahir", text: true }, { h: "Umur" },
        { h: "Nama Ayah" }, { h: "Nama Ibu" }, { h: "No. HP", text: true }, { h: "Alamat" },
        { h: "RT", text: true }, { h: "RW", text: true }, { h: "Dusun" }, { h: "Desa" },
        { h: "Posyandu" }, { h: "Kader" }, { h: "Status" }, { h: "Validasi" },
        { h: "Dibuat", text: true }, { h: "Diperbarui", text: true },
      ],
      sortBy(balitaRows, (b) => b.id).map((b) => [
        b.id, nik(b.nik), b.nama, b.jenis_kelamin, b.tempat_lahir ?? "", b.tanggal_lahir,
        hitungUmur(b.tanggal_lahir), b.nama_ayah ?? "", b.nama_ibu, hp(b.no_hp), b.alamat ?? "",
        b.rt ?? "", b.rw ?? "", b.dusun ?? "", desaNama.get(b.desa_id) ?? "",
        b.posyandu_id ? posyNama.get(b.posyandu_id) ?? "" : "",
        b.kader_id ? userNama.get(b.kader_id) ?? "" : "", b.status,
        LABEL_VALIDASI[b.validasi_status] ?? b.validasi_status, ts(b.created_at), ts(b.updated_at),
      ])
    ),
    tab(
      "Pendampingan",
      [
        { h: "ID" }, { h: "Tanggal", text: true }, { h: "Hari Ke" }, { h: "Jam", text: true },
        { h: "NIK Balita", text: true }, { h: "Nama Balita" }, { h: "Desa" },
        { h: "Makan Telur" }, { h: "Jumlah Butir" }, { h: "Sasaran GENTING" },
        { h: "Bantuan GENTING" }, { h: "Nama OTA" }, { h: "Nama Pendamping" }, { h: "Keterangan" },
        { h: "Lokasi Lat" }, { h: "Lokasi Lng" }, { h: "Validasi" }, { h: "Dibuat", text: true },
      ],
      sortBy(pendAktif, (p) => `${p.tanggal}#${String(p.id).padStart(10, "0")}`).map((p) => {
        const b = balitaById.get(p.balita_id)!;
        return [
          p.id, p.tanggal, p.hari_ke ?? "", p.jam ?? "", nik(b.nik), b.nama,
          desaNama.get(b.desa_id) ?? "", yaTidak(p.makan_telur), p.makan_telur ? p.jumlah_butir ?? "" : "",
          yaTidak(p.sasaran_genting), p.bantuan_genting ?? "", p.nama_ota ?? "",
          p.nama_pendamping ?? (p.kader_id ? userNama.get(p.kader_id) ?? "" : ""), p.keterangan ?? "",
          p.lokasi_lat ?? "", p.lokasi_lng ?? "", LABEL_VALIDASI[p.validasi_status] ?? p.validasi_status,
          ts(p.created_at),
        ];
      })
    ),
    tab(
      "Pengukuran",
      [
        { h: "ID" }, { h: "Tanggal", text: true }, { h: "NIK Balita", text: true }, { h: "Nama Balita" },
        { h: "Desa" }, { h: "Berat Badan (kg)" }, { h: "Tinggi Badan (cm)" }, { h: "Lingkar Kepala (cm)" },
        { h: "LiLA (cm)" }, { h: "Z-Score" }, { h: "Status Gizi" }, { h: "Risiko Stunting" },
        { h: "Kader" }, { h: "Validasi" }, { h: "Dibuat", text: true },
      ],
      sortBy(pengAktif, (p) => `${p.tanggal}#${String(p.id).padStart(10, "0")}`).map((p) => {
        const b = balitaById.get(p.balita_id)!;
        return [
          p.id, p.tanggal, nik(b.nik), b.nama, desaNama.get(b.desa_id) ?? "", p.berat_badan,
          p.tinggi_badan, p.lingkar_kepala ?? "", p.lingkar_lengan_atas ?? "", p.z_score ?? "",
          p.status_gizi ?? "", p.risiko_stunting ?? "", p.kader_id ? userNama.get(p.kader_id) ?? "" : "",
          LABEL_VALIDASI[p.validasi_status] ?? p.validasi_status, ts(p.created_at),
        ];
      })
    ),
    tab(
      "Desa",
      [{ h: "ID" }, { h: "Nama Desa" }, { h: "Kecamatan" }, { h: "Kabupaten" }, { h: "Lat" }, { h: "Lng" }],
      sortBy(desaRows, (d) => d.nama).map((d) => [d.id, d.nama, d.kecamatan, d.kabupaten, d.lat ?? "", d.lng ?? ""])
    ),
    tab(
      "Posyandu",
      [{ h: "ID" }, { h: "Nama Posyandu" }, { h: "Desa" }],
      sortBy(posyRows, (p) => `${desaNama.get(p.desa_id) ?? ""}#${p.nama}`).map((p) => [
        p.id, p.nama, desaNama.get(p.desa_id) ?? "",
      ])
    ),
    // Pengguna TANPA password/no. HP/email
    tab(
      "Kader & PPKBD",
      [{ h: "ID" }, { h: "Nama" }, { h: "Username" }, { h: "Role" }, { h: "Desa" }, { h: "Aktif" }],
      sortBy(
        userRows.filter((u) => u.role !== "admin"),
        (u) => `${u.role}#${u.nama}`
      ).map((u) => [
        u.id, u.nama, u.username, u.role === "kader" ? "Kader (KPK)" : "PPKBD",
        u.desa_id ? desaNama.get(u.desa_id) ?? "" : "", yaTidak(u.active),
      ])
    ),
  ];

  return { generated_at: new Date().toISOString(), pii: full ? "full" : "masked", tabs };
}
