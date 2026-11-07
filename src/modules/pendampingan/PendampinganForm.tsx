"use client";
import { useEffect, useState } from "react";
import { Egg, MapPin, Camera, Save, Calendar, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";
import { formatDateISO } from "@/lib/utils";

type BalitaOpt = { id: number; nama: string; umur?: string | null };

type PendampinganDetail = {
  balita_id: number;
  tanggal: string;
  jam: string | null;
  makan_telur: boolean;
  jumlah_butir: number | null;
  sasaran_genting: boolean | null;
  bantuan_genting: string | null;
  nama_ota: string | null;
  nama_pendamping: string | null;
  keterangan: string | null;
  foto_dokumentasi: string | null;
  lokasi_lat: number | null;
  lokasi_lng: number | null;
};

/**
 * Isi Drawer form Pendampingan (single-column 400px).
 * Tambah bila tanpa id, edit + prefill bila ada id. Footer aksi mandiri.
 */
export function PendampinganForm({
  id,
  namaPendamping = "",
  onSaved,
  onCancel,
}: {
  id?: number;
  namaPendamping?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const { data: balitaData } = useList<{ data: BalitaOpt[] }>("/api/balita?pageSize=200");
  const balitaOpts = balitaData?.data || [];

  const [form, setForm] = useState({
    balita_id: "",
    tanggal: formatDateISO(),
    jam: "",
    makan_telur: true,
    butirMode: "1" as "1" | "2" | "lainnya",
    butirLain: "",
    sasaran_genting: false,
    bantuan_genting: "",
    nama_ota: "",
    nama_pendamping: namaPendamping,
    keterangan: "",
  });
  const [foto, setFoto] = useState<string>("");
  const [lokasi, setLokasi] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoadingDetail(true);
    apiFetch<PendampinganDetail>(`/api/pendampingan/${id}`).then((res) => {
      if (!alive) return;
      if (res.ok && res.data) {
        const r = res.data;
        const butir = r.jumlah_butir;
        setForm({
          balita_id: String(r.balita_id),
          tanggal: String(r.tanggal).slice(0, 10),
          jam: r.jam || "",
          makan_telur: !!r.makan_telur,
          butirMode: butir === 1 ? "1" : butir === 2 ? "2" : butir != null ? "lainnya" : "1",
          butirLain: butir != null && butir !== 1 && butir !== 2 ? String(butir) : "",
          sasaran_genting: !!r.sasaran_genting,
          bantuan_genting: r.bantuan_genting || "",
          nama_ota: r.nama_ota || "",
          nama_pendamping: r.nama_pendamping || "",
          keterangan: r.keterangan || "",
        });
        setFoto(r.foto_dokumentasi || "");
        setLokasi({ lat: r.lokasi_lat ?? null, lng: r.lokasi_lng ?? null });
      } else {
        toast(res.message || "Gagal memuat data", "error");
      }
      setLoadingDetail(false);
    });
    return () => {
      alive = false;
    };
  }, [id, toast]);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function detectGPS() {
    if (!navigator.geolocation) {
      toast("Geolokasi tidak didukung browser ini", "error");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasi({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
        toast("Lokasi berhasil dideteksi");
      },
      () => {
        setGpsBusy(false);
        toast("Gagal mendeteksi lokasi", "error");
      }
    );
  }

  async function save() {
    if (!form.balita_id) return toast("Pilih balita terlebih dahulu", "error");
    if (!form.tanggal) return toast("Tanggal wajib diisi", "error");
    if (form.sasaran_genting && !form.bantuan_genting.trim())
      return toast("Isi bantuan GENTING yang diterima/dibutuhkan", "error");

    let jumlah_butir: number | null = null;
    if (form.makan_telur) {
      jumlah_butir =
        form.butirMode === "lainnya" ? Number(form.butirLain) || null : Number(form.butirMode);
    }

    const payload = {
      balita_id: Number(form.balita_id),
      tanggal: form.tanggal,
      jam: form.jam || null,
      makan_telur: form.makan_telur,
      jumlah_butir,
      sasaran_genting: form.sasaran_genting,
      bantuan_genting: form.sasaran_genting ? form.bantuan_genting.trim() || null : null,
      nama_ota: form.nama_ota.trim() || null,
      nama_pendamping: form.nama_pendamping || null,
      keterangan: form.keterangan || null,
      foto_dokumentasi: foto || null,
      lokasi_lat: lokasi.lat,
      lokasi_lng: lokasi.lng,
    };

    setSaving(true);
    const res = id
      ? await apiFetch(`/api/pendampingan/${id}`, { method: "PUT", body: JSON.stringify(payload) })
      : await apiFetch("/api/pendampingan", { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      toast(id ? "Data berhasil diperbarui" : "Pendampingan berhasil disimpan");
      onSaved();
    } else {
      toast(res.message || "Gagal menyimpan", "error");
    }
  }

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* DATA PENDAMPINGAN */}
      <div className="flex items-center gap-2 text-primary">
        <Egg className="w-4 h-4" />
        <span className="font-semibold text-xs uppercase">Data Pendampingan</span>
      </div>

      <Field label="Pilih Balita" required>
        <Select value={form.balita_id} onChange={(e) => set("balita_id", e.target.value)}>
          <option value="">-- Pilih balita dampingan --</option>
          {balitaOpts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nama}
              {b.umur ? ` (${b.umur})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tanggal" required>
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            type="date"
            className="pl-9"
            value={form.tanggal}
            onChange={(e) => set("tanggal", e.target.value)}
          />
        </div>
      </Field>

      <Field label="Jam Pendampingan">
        <div className="relative">
          <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            type="time"
            className="pl-9"
            value={form.jam}
            onChange={(e) => set("jam", e.target.value)}
          />
        </div>
      </Field>

      <Field label="Apakah balita makan telur hari ini?">
        <div className="flex gap-3">
          {[
            { v: true, label: "Ya" },
            { v: false, label: "Tidak" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set("makan_telur", opt.v)}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                form.makan_telur === opt.v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-darkcard"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      {form.makan_telur && (
        <Field label="Jumlah Telur">
          <div className="flex flex-wrap gap-3">
            {[
              { v: "1", label: "1 Butir" },
              { v: "2", label: "2 Butir" },
              { v: "lainnya", label: "Lainnya" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => set("butirMode", opt.v as "1" | "2" | "lainnya")}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  form.butirMode === opt.v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-darkcard"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {form.butirMode === "lainnya" && (
              <Input
                type="number"
                min={1}
                placeholder="Jumlah butir"
                className="w-32"
                value={form.butirLain}
                onChange={(e) => set("butirLain", e.target.value)}
              />
            )}
          </div>
        </Field>
      )}

      <Field label="Apakah sasaran GENTING?">
        <div className="flex gap-3">
          {[
            { v: true, label: "Ya" },
            { v: false, label: "Tidak" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set("sasaran_genting", opt.v)}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                form.sasaran_genting === opt.v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-darkcard"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">GENTING = Gerakan Orang Tua Asuh Cegah Stunting</p>
      </Field>

      {form.sasaran_genting && (
        <Field label="Bantuan GENTING apa?" required>
          <Input
            list="opsi-bantuan-genting"
            value={form.bantuan_genting}
            onChange={(e) => set("bantuan_genting", e.target.value)}
            placeholder="Contoh: bantuan nutrisi / sanitasi / edukasi"
          />
          <datalist id="opsi-bantuan-genting">
            <option value="Bantuan nutrisi (makanan bergizi)" />
            <option value="Bantuan non-nutrisi (sanitasi / air bersih / rumah layak)" />
            <option value="Edukasi & pendampingan keluarga" />
          </datalist>
        </Field>
      )}

      <Field label="Nama OTA">
        <Input
          value={form.nama_ota}
          onChange={(e) => set("nama_ota", e.target.value)}
          placeholder="Masukkan nama Orang Tua Asuh"
        />
      </Field>

      <Field label="Nama Pendamping">
        <Input
          value={form.nama_pendamping}
          onChange={(e) => set("nama_pendamping", e.target.value)}
          placeholder="Nama pendamping"
        />
      </Field>

      <Field label="Keterangan">
        <Textarea
          value={form.keterangan}
          onChange={(e) => set("keterangan", e.target.value)}
          placeholder="Contoh: Balita makan telur dengan lahap"
        />
      </Field>

      {/* DOKUMENTASI & LOKASI */}
      <div className="flex items-center gap-2 text-primary pt-1">
        <Camera className="w-4 h-4" />
        <span className="font-semibold text-xs uppercase">Dokumentasi &amp; Lokasi</span>
      </div>

      <Field label="Foto Dokumentasi">
        <label className="flex items-center justify-center gap-2 px-4 py-5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-darkcard">
          <Camera className="w-5 h-5" />
          <span className="text-sm truncate">{foto ? foto : "Ambil / unggah foto"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFoto(e.target.files?.[0]?.name || "")}
          />
        </label>
      </Field>

      <div>
        <Button type="button" variant="outline" onClick={detectGPS} disabled={gpsBusy}>
          <MapPin className="w-4 h-4" /> {gpsBusy ? "Mendeteksi..." : "Deteksi Lokasi GPS"}
        </Button>
        {lokasi.lat != null && lokasi.lng != null && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {lokasi.lat.toFixed(5)}, {lokasi.lng.toFixed(5)}
          </p>
        )}
      </div>

      {/* Footer aksi (mandiri) */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" type="button" onClick={onCancel}>
          Batal
        </Button>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
