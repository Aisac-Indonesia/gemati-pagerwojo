"use client";
import { useState } from "react";
import { Egg, Ruler, History } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";
import { useList } from "@/lib/useApi";
import { LABEL_VALIDASI } from "@/components/ui/primitives";

type Pend = {
  id: number; balita_nama?: string; tanggal: string; hari_ke?: number;
  jumlah_butir?: number | null; makan_telur?: boolean; validasi_status: string;
  sasaran_genting?: boolean | null; nama_ota?: string | null;
};
type Peng = {
  id: number; balita_nama?: string; tanggal: string; berat_badan: number;
  tinggi_badan: number; z_score?: number; status_gizi?: string; validasi_status: string;
};

const validasiTone = (s: string) =>
  s === "disetujui" ? "disetujui" : s === "ditolak" ? "ditolak" : "menunggu";

export function RiwayatList() {
  const { data: pendData, loading: l1 } = useList<{ data: Pend[] }>("/api/pendampingan?pageSize=200");
  const { data: pengData, loading: l2 } = useList<{ data: Peng[] }>("/api/pengukuran?pageSize=200");

  const pend = pendData?.data || [];
  const peng = pengData?.data || [];
  const validasi = [
    ...pend.map((p) => ({ ...p, _tipe: "Pendampingan" as const })),
    ...peng.map((p) => ({ ...p, _tipe: "Pengukuran" as const })),
  ].filter((x) => x.validasi_status === "menunggu");

  const [tab, setTab] = useState<"pend" | "peng" | "val">("pend");

  const tabs = [
    { key: "pend" as const, label: `Pendampingan (${pend.length})`, icon: Egg },
    { key: "peng" as const, label: `Pengukuran (${peng.length})`, icon: Ruler },
    { key: "val" as const, label: `Validasi (${validasi.length})`, icon: History },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Riwayat Pendampingan"
        subtitle="Histori lengkap pendampingan, pengukuran, dan status validasi"
      />

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-darkcard border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {tab === "pend" &&
          (l1 ? (
            <Card className="p-8 text-center text-slate-400">Memuat...</Card>
          ) : pend.length === 0 ? (
            <Card className="p-8 text-center text-slate-400">Belum ada data</Card>
          ) : (
            pend.map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                    <Egg className="w-4 h-4 text-egg" />
                  </div>
                  <div>
                    <div className="font-medium text-heading dark:text-slate-200">
                      {p.balita_nama || "-"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.tanggal} · Hari {p.hari_ke ?? "-"} ·{" "}
                      {p.makan_telur ? `${p.jumlah_butir ?? 0} butir` : "Tidak makan"}
                      {p.sasaran_genting ? " · Sasaran GENTING" : ""}
                      {p.nama_ota ? ` · OTA: ${p.nama_ota}` : ""}
                    </div>
                  </div>
                </div>
                <Badge tone={validasiTone(p.validasi_status)}>
                  {LABEL_VALIDASI[p.validasi_status] || p.validasi_status}
                </Badge>
              </Card>
            ))
          ))}

        {tab === "peng" &&
          (l2 ? (
            <Card className="p-8 text-center text-slate-400">Memuat...</Card>
          ) : peng.length === 0 ? (
            <Card className="p-8 text-center text-slate-400">Belum ada data</Card>
          ) : (
            peng.map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                    <Ruler className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium text-heading dark:text-slate-200">
                      {p.balita_nama || "-"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.tanggal} · BB {p.berat_badan}kg · TB {p.tinggi_badan}cm
                      {p.z_score != null ? ` · Z ${p.z_score}` : ""}
                    </div>
                  </div>
                </div>
                <Badge tone={validasiTone(p.validasi_status)}>
                  {LABEL_VALIDASI[p.validasi_status] || p.validasi_status}
                </Badge>
              </Card>
            ))
          ))}

        {tab === "val" &&
          (validasi.length === 0 ? (
            <Card className="p-8 text-center text-slate-400">
              Tidak ada data menunggu validasi
            </Card>
          ) : (
            validasi.map((v: any) => (
              <Card key={v._tipe + v.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-heading dark:text-slate-200">
                    {v.balita_nama || "-"}{" "}
                    <Badge tone="default">{v._tipe}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{v.tanggal}</div>
                </div>
                <Badge tone="menunggu">Menunggu Validasi</Badge>
              </Card>
            ))
          ))}
      </div>
    </div>
  );
}
