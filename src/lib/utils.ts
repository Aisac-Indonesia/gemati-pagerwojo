import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Hitung umur "X th Y bln" dari tanggal lahir */
export function hitungUmur(tanggalLahir: string | Date, ref: Date = new Date()): string {
  const lahir = new Date(tanggalLahir);
  let bulan = (ref.getFullYear() - lahir.getFullYear()) * 12 + (ref.getMonth() - lahir.getMonth());
  if (ref.getDate() < lahir.getDate()) bulan--;
  if (bulan < 0) bulan = 0;
  const th = Math.floor(bulan / 12);
  const bln = bulan % 12;
  return `${th} th ${bln} bln`;
}

/** Umur dalam bulan (untuk z-score) */
export function umurBulan(tanggalLahir: string | Date, ref: Date = new Date()): number {
  const lahir = new Date(tanggalLahir);
  let bulan = (ref.getFullYear() - lahir.getFullYear()) * 12 + (ref.getMonth() - lahir.getMonth());
  if (ref.getDate() < lahir.getDate()) bulan--;
  return Math.max(0, bulan);
}

export function formatTanggal(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function inisial(nama: string): string {
  return nama
    .replace(/,.*$/, "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatDateISO(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/* ---------- Normalisasi input import (Excel/CSV) ---------- */

const pad2 = (n: number) => String(n).padStart(2, "0");

function isoFromParts(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Normalisasi tanggal dari file import menjadi "YYYY-MM-DD".
 * Excel menyimpan tanggal sebagai angka serial (mis. 44469 = 2021-09-30) — penyebab umum
 * import gagal / tanggal lahir kacau. Menerima juga objek Date, "YYYY-MM-DD", "DD/MM/YYYY",
 * "DD-MM-YYYY", "YYYY/MM/DD". Mengembalikan null bila tidak dikenali.
 */
export function normalizeDateInput(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  if (typeof v === "number") {
    // serial Excel = jumlah hari sejak 1899-12-30 (rentang wajar 20000–80000 ≈ tahun 1954–2119)
    if (!Number.isFinite(v) || v < 20000 || v > 80000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return isoFromParts(+m[3], +m[2], +m[1]);
  if (/^\d{5}$/.test(s)) return normalizeDateInput(Number(s)); // serial Excel yang terlanjur jadi teks
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return null;
}

/**
 * Normalisasi jam dari file import menjadi "HH:MM".
 * Excel menyimpan jam sebagai pecahan hari (0.375 = 09:00). Menerima juga "9:00", "09.00", "09:00:00".
 */
export function normalizeTimeInput(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return `${pad2(v.getHours())}:${pad2(v.getMinutes())}`;
  }
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 0) return null;
    const total = Math.round((v - Math.floor(v)) * 24 * 60);
    return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
  }
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${pad2(h)}:${pad2(mi)}`;
}
