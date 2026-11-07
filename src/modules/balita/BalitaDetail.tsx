"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Baby, Calendar, MapPin, Phone, User, Heart, Home, UserCog,
  ClipboardList, Ruler, LineChart, Loader2, Inbox, Pencil, Eye, EyeOff,
} from "lucide-react";
import { Button, Badge, Card, LABEL_VALIDASI } from "@/components/ui/primitives";
import { apiFetch, useList } from "@/lib/useApi";
import { formatTanggal } from "@/lib/utils";
import { maskNik, maskPhone } from "@/lib/mask";

type Detail = {
  id: number;
  nama: string;
  nik: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string;
  tempat_lahir?: string | null;
  nama_ayah?: string | null;
  nama_ibu: string;
  no_hp?: string | null;
  alamat?: string | null;
  status: string;
  validasi_status: string;
  umur: string;
  desa_nama?: string | null;
  posyandu_nama?: string | null;
  kader_nama?: string | null;
  ringkasan: { jumlah_pendampingan: number; jumlah_pengukuran: number; persen_konsumsi: number };
};

type Pendampingan = {
  tanggal: string;
  hari_ke?: number | null;
  jumlah_butir?: number | null;
  makan_telur: boolean;
  sasaran_genting?: boolean | null;
  bantuan_genting?: string | null;
  nama_ota?: string | null;
  nama_pendamping?: string | null;
  keterangan?: string | null;
  validasi_status: string;
};

type Pengukuran = {
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  z_score?: number | null;
  status_gizi?: string | null;
  validasi_status: string;
};

type Tab = "pendampingan" | "pengukuran" | "grafik";

function InfoItem({
  icon: Icon,
  label,
  value,
  mono,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  mono?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-darkcard rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase text-slate-400 font-medium tracking-wide">{label}</div>
        <div className="flex items-center gap-1.5">
          <div className={`font-medium text-heading dark:text-slate-200 truncate ${mono ? "font-mono" : ""}`}>
            {value || "-"}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
      {children}
    </span>
  );
}

function ValidasiBadge({ status }: { status: string }) {
  return <Badge tone={status}>{LABEL_VALIDASI[status] || status}</Badge>;
}

export function BalitaDetail({ id }: { id: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pendampingan");
  const [revealNik, setRevealNik] = useState(false);
  const [revealHp, setRevealHp] = useState(false);

  useEffect(() => {
    apiFetch<Detail>(`/api/balita/${id}`).then((r) => {
      if (r.ok && r.data) setDetail(r.data);
      else setError(r.message || "Gagal memuat data");
      setLoading(false);
    });
  }, [id]);

  const { data: pendData, loading: pendLoading } = useList<{ data: Pendampingan[] }>(
    `/api/pendampingan?balita_id=${id}`
  );
  const { data: pengData, loading: pengLoading } = useList<{ data: Pengukuran[] }>(
    `/api/pengukuran?balita_id=${id}`
  );

  const pendList = pendData?.data || [];
  const pengList = pengData?.data || [];

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Memuat data balita...
      </div>
    );
  }
  if (error || !detail) {
    return <div className="py-16 text-center text-slate-400">{error || "Data tidak ditemukan"}</div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: "pendampingan", label: "Pendampingan", icon: ClipboardList, count: detail.ringkasan.jumlah_pendampingan },
    { key: "pengukuran", label: "Pengukuran", icon: Ruler, count: detail.ringkasan.jumlah_pengukuran },
    { key: "grafik", label: "Grafik Pertumbuhan", icon: LineChart },
  ];

  const maxTinggi = Math.max(1, ...pengList.map((p) => p.tinggi_badan || 0));

  return (
    <div className="space-y-5">
      {/* Judul + Kembali */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading dark:text-white">{detail.nama}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1.5">
            <span>
              NIK: <span className="font-mono">{revealNik ? detail.nik : maskNik(detail.nik)}</span>
            </span>
            <button
              type="button"
              onClick={() => setRevealNik((v) => !v)}
              className="text-slate-400 hover:text-primary p-0.5 rounded"
              title={revealNik ? "Sembunyikan NIK" : "Tampilkan NIK"}
            >
              {revealNik ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <span>· {detail.umur}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/balita?edit=${id}`)}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button variant="outline" onClick={() => router.push("/balita")}>
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
        </div>
      </div>

      {/* Header hijau */}
      <div className="bg-primary rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Baby className="w-9 h-9 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{detail.nama}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-primary">
                  {detail.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                </span>
                <StatusPill>{detail.status === "aktif" ? "Aktif" : "Nonaktif"}</StatusPill>
                <StatusPill>{LABEL_VALIDASI[detail.validasi_status] || detail.validasi_status}</StatusPill>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold leading-none">{detail.ringkasan.jumlah_pendampingan}</div>
              <div className="text-xs text-white/80 mt-1">Pendampingan</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold leading-none">{detail.ringkasan.persen_konsumsi}%</div>
              <div className="text-xs text-white/80 mt-1">Konsumsi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold leading-none">{detail.ringkasan.jumlah_pengukuran}</div>
              <div className="text-xs text-white/80 mt-1">Pengukuran</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoItem icon={Calendar} label="Tanggal Lahir" value={detail.tanggal_lahir ? formatTanggal(detail.tanggal_lahir) : "-"} />
        <InfoItem icon={MapPin} label="Tempat Lahir" value={detail.tempat_lahir} />
        <InfoItem icon={MapPin} label="Desa" value={detail.desa_nama} />
        <InfoItem icon={Heart} label="Posyandu" value={detail.posyandu_nama} />
        <InfoItem icon={User} label="Nama Ayah" value={detail.nama_ayah} />
        <InfoItem icon={User} label="Nama Ibu" value={detail.nama_ibu} />
        <InfoItem
          icon={Phone}
          label="No. HP"
          mono
          value={detail.no_hp ? (revealHp ? detail.no_hp : maskPhone(detail.no_hp)) : "-"}
          action={
            detail.no_hp ? (
              <button
                type="button"
                onClick={() => setRevealHp((v) => !v)}
                className="text-slate-400 hover:text-primary p-0.5 rounded shrink-0"
                title={revealHp ? "Sembunyikan No. HP" : "Tampilkan No. HP"}
              >
                {revealHp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            ) : undefined
          }
        />
        <InfoItem icon={UserCog} label="Kader Pendamping" value={detail.kader_nama} />
        <InfoItem icon={Home} label="Alamat" value={detail.alamat} />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {typeof t.count === "number" && <span className="text-xs">({t.count})</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "pendampingan" && (
        <div className="space-y-2">
          {pendLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat...
            </div>
          ) : pendList.length === 0 ? (
            <EmptyState text="Belum ada data pendampingan" />
          ) : (
            pendList.map((p, i) => (
              <Card key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                      p.makan_telur
                        ? "border-primary text-primary"
                        : "border-red-200 text-red-400"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-heading dark:text-slate-200">
                      {p.tanggal} {p.hari_ke ? `· Hari ${p.hari_ke}` : ""}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.makan_telur ? `${p.jumlah_butir ?? 0} butir` : "Tidak makan"}
                      {p.nama_pendamping ? ` · ${p.nama_pendamping}` : ""}
                      {p.nama_ota ? ` · OTA: ${p.nama_ota}` : ""}
                      {p.sasaran_genting ? ` · GENTING${p.bantuan_genting ? `: ${p.bantuan_genting}` : ""}` : ""}
                      {p.keterangan ? ` · ${p.keterangan}` : ""}
                    </div>
                  </div>
                </div>
                <ValidasiBadge status={p.validasi_status} />
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "pengukuran" && (
        <div className="space-y-2">
          {pengLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat...
            </div>
          ) : pengList.length === 0 ? (
            <EmptyState text="Belum ada data pengukuran" />
          ) : (
            pengList.map((p, i) => (
              <Card key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-heading dark:text-slate-200">{p.tanggal}</div>
                    <div className="text-xs text-slate-500 truncate">
                      BB {p.berat_badan} kg · TB {p.tinggi_badan} cm
                      {typeof p.z_score === "number" ? ` · Z ${p.z_score}` : ""}
                      {p.status_gizi ? ` · ${p.status_gizi}` : ""}
                    </div>
                  </div>
                </div>
                <ValidasiBadge status={p.validasi_status} />
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "grafik" && (
        <Card className="p-5">
          <h3 className="font-semibold text-heading dark:text-slate-200 mb-4">Grafik Pertumbuhan (Tinggi Badan)</h3>
          {pengLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat...
            </div>
          ) : pengList.length === 0 ? (
            <EmptyState text="Belum ada data pengukuran untuk grafik" />
          ) : (
            <div className="space-y-3">
              {pengList.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-500 shrink-0">{p.tanggal}</div>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(((p.tinggi_badan || 0) / maxTinggi) * 100)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-xs font-medium text-heading dark:text-slate-200 shrink-0">
                    {p.tinggi_badan} cm
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-slate-400 bg-white dark:bg-darkcard rounded-xl border border-slate-100 dark:border-slate-800">
      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
      {text}
    </div>
  );
}
