"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Select,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { apiFetch, useList } from "@/lib/useApi";
import { formatTanggal } from "@/lib/utils";

type DesaOpt = { id: number; nama: string };
type AnyRow = Record<string, any>;
type Tab = "balita" | "pendampingan" | "pengukuran";

function downloadCSV(rows: AnyRow[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object");
  const header = keys.join(",");
  const lines = rows.map((r) =>
    keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const content = "﻿" + [header, ...lines].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const validasiTone: Record<string, string> = {
  disetujui: "disetujui",
  menunggu: "menunggu",
  ditolak: "ditolak",
};

export function Laporan() {
  const [desaOpts, setDesaOpts] = useState<DesaOpt[]>([]);
  const [jenis, setJenis] = useState("per_desa");
  const [desaId, setDesaId] = useState("");
  const [tahun, setTahun] = useState("2026");
  const [tab, setTab] = useState<Tab>("balita");

  useEffect(() => {
    apiFetch<DesaOpt[]>("/api/desa").then((r) => r.data && setDesaOpts(r.data));
  }, []);

  const balita = useList<{ data: AnyRow[] }>("/api/balita?pageSize=200");
  const pendampingan = useList<{ data: AnyRow[] }>("/api/pendampingan?pageSize=200");
  const pengukuran = useList<{ data: AnyRow[] }>("/api/pengukuran?pageSize=200");

  const balitaRows = balita.data?.data ?? [];
  const pendampinganRows = pendampingan.data?.data ?? [];
  const pengukuranRows = pengukuran.data?.data ?? [];

  const balitaCols: Column<AnyRow>[] = [
    {
      header: "Nama Balita",
      sortValue: (r) => r.nama ?? "",
      cell: (r) => (
        <div>
          <div className="font-medium text-heading dark:text-slate-200">{r.nama}</div>
          <div className="text-xs text-slate-400">{r.nik}</div>
        </div>
      ),
    },
    { header: "JK", sortValue: (r) => r.jenis_kelamin ?? "", cell: (r) => <Badge tone="default">{r.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</Badge> },
    { header: "Umur", sortValue: (r) => r.umur ?? "", cell: (r) => r.umur ?? "-" },
    { header: "Desa", sortValue: (r) => r.desa_nama ?? "", cell: (r) => r.desa_nama ?? "-" },
    { header: "Nama Ibu", sortValue: (r) => r.nama_ibu ?? "", cell: (r) => r.nama_ibu ?? "-" },
    { header: "Validasi", sortValue: (r) => r.validasi_status ?? "", cell: (r) => <Badge tone={validasiTone[r.validasi_status] || "default"}>{r.validasi_status ?? "-"}</Badge> },
  ];

  const pendampinganCols: Column<AnyRow>[] = [
    { header: "Tanggal", sortValue: (r) => r.tanggal ?? "", cell: (r) => (r.tanggal ? formatTanggal(r.tanggal) : "-") },
    { header: "Balita", sortValue: (r) => r.balita_nama ?? r.nama ?? "", cell: (r) => r.balita_nama ?? r.nama ?? `#${r.balita_id}` },
    { header: "Hari", sortValue: (r) => r.hari_ke ?? 0, cell: (r) => r.hari_ke ?? "-" },
    { header: "Makan Telur", cell: (r) => (r.makan_telur ? `Ya${r.jumlah_butir ? ` (${r.jumlah_butir} butir)` : ""}` : "Tidak") },
    { header: "GENTING", sortValue: (r) => (r.sasaran_genting ? 1 : 0), cell: (r) => (r.sasaran_genting ? `Ya${r.bantuan_genting ? ` (${r.bantuan_genting})` : ""}` : "-") },
    { header: "OTA", sortValue: (r) => r.nama_ota ?? "", cell: (r) => r.nama_ota ?? "-" },
    { header: "Pendamping", sortValue: (r) => r.nama_pendamping ?? r.kader_nama ?? "", cell: (r) => r.nama_pendamping ?? r.kader_nama ?? "-" },
    { header: "Validasi", sortValue: (r) => r.validasi_status ?? "", cell: (r) => <Badge tone={validasiTone[r.validasi_status] || "default"}>{r.validasi_status ?? "-"}</Badge> },
  ];

  const pengukuranCols: Column<AnyRow>[] = [
    { header: "Tanggal", sortValue: (r) => r.tanggal ?? "", cell: (r) => (r.tanggal ? formatTanggal(r.tanggal) : "-") },
    { header: "Balita", sortValue: (r) => r.balita_nama ?? r.nama ?? "", cell: (r) => r.balita_nama ?? r.nama ?? `#${r.balita_id}` },
    { header: "BB", sortValue: (r) => r.berat_badan ?? 0, cell: (r) => (r.berat_badan != null ? `${r.berat_badan} kg` : "-") },
    { header: "TB", sortValue: (r) => r.tinggi_badan ?? 0, cell: (r) => (r.tinggi_badan != null ? `${r.tinggi_badan} cm` : "-") },
    { header: "Status Gizi", sortValue: (r) => r.status_gizi ?? "", cell: (r) => r.status_gizi ?? "-" },
    {
      header: "Risiko",
      cell: (r) =>
        r.risiko_stunting === "tinggi" ? (
          <span className="font-medium text-red-600 dark:text-red-400">Tinggi</span>
        ) : (
          <span className="text-slate-500">Normal</span>
        ),
    },
    { header: "Validasi", sortValue: (r) => r.validasi_status ?? "", cell: (r) => <Badge tone={validasiTone[r.validasi_status] || "default"}>{r.validasi_status ?? "-"}</Badge> },
  ];

  const active = useMemo(() => {
    if (tab === "balita") return { rows: balitaRows, cols: balitaCols, loading: balita.loading, file: "laporan-balita.csv" };
    if (tab === "pendampingan") return { rows: pendampinganRows, cols: pendampinganCols, loading: pendampingan.loading, file: "laporan-pendampingan.csv" };
    return { rows: pengukuranRows, cols: pengukuranCols, loading: pengukuran.loading, file: "laporan-pengukuran.csv" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, balitaRows, pendampinganRows, pengukuranRows, balita.loading, pendampingan.loading, pengukuran.loading]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "balita", label: "Data Balita", count: balitaRows.length },
    { key: "pendampingan", label: "Pendampingan", count: pendampinganRows.length },
    { key: "pengukuran", label: "Pengukuran", count: pengukuranRows.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan"
        subtitle="Cetak laporan kecamatan dalam berbagai format"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => downloadCSV(active.rows, active.file)}>
              <Download className="w-4 h-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => downloadCSV(active.rows, active.file)}>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Jenis Laporan</label>
            <Select value={jenis} onChange={(e) => setJenis(e.target.value)} className="mt-1">
              <option value="per_desa">Per Desa</option>
              <option value="per_kader">Per Kader</option>
              <option value="ringkasan">Ringkasan Kecamatan</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Desa</label>
            <Select value={desaId} onChange={(e) => setDesaId(e.target.value)} className="mt-1">
              <option value="">Semua Desa</option>
              {desaOpts.map((d) => (
                <option key={d.id} value={d.id}>Desa {d.nama}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Tahun</label>
            <Select value={tahun} onChange={(e) => setTahun(e.target.value)} className="mt-1">
              <option value="2026">2026</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        <DataTable columns={active.cols} rows={active.rows} loading={active.loading} empty="Belum ada data" />
      </Card>
    </div>
  );
}
