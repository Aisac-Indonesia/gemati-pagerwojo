"use client";
import { Egg } from "lucide-react";
import { PageHeader, Card, Badge, LABEL_VALIDASI } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useList } from "@/lib/useApi";
import { formatTanggal } from "@/lib/utils";
import { DataToolbar } from "@/components/ui/DataToolbar";
import type { PendampinganRow } from "./PendampinganList";

const EXPORT_COLUMNS = [
  { key: "tanggal", header: "Tanggal" },
  { key: "balita_nama", header: "Balita" },
  { key: "hari_ke", header: "Hari" },
  { key: "makan_telur", header: "Makan Telur" },
  { key: "jam", header: "Jam" },
  { key: "nama_pendamping", header: "Pendamping" },
  { key: "nama_ota", header: "Nama OTA" },
  { key: "sasaran_genting", header: "Sasaran GENTING" },
  { key: "bantuan_genting", header: "Bantuan GENTING" },
  { key: "keterangan", header: "Keterangan" },
  { key: "validasi_status", header: "Validasi" },
];

export function PendampinganDataPPKBD() {
  const { data, loading } = useList<{ data: PendampinganRow[] }>(
    "/api/pendampingan?pageSize=200"
  );
  const rows = data?.data || [];

  const columns: Column<PendampinganRow>[] = [
    { header: "Tanggal", cell: (r) => <span className="whitespace-nowrap">{formatTanggal(r.tanggal)}</span> },
    {
      header: "Balita",
      cell: (r) => (
        <div>
          <div className="font-medium text-heading dark:text-slate-200">{r.balita_nama || "-"}</div>
          <div className="text-xs text-slate-400">
            {[r.balita_umur, r.balita_desa].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    { header: "Hari", cell: (r) => <span className="font-medium">Hari {r.hari_ke ?? "-"}</span> },
    {
      header: "Makan Telur",
      cell: (r) =>
        r.makan_telur ? (
          <span className="text-green-700 dark:text-green-400 font-medium">
            Ya ({r.jumlah_butir ?? "-"} butir)
          </span>
        ) : (
          <span className="text-slate-500">Tidak</span>
        ),
    },
    {
      header: "GENTING",
      cell: (r) =>
        r.sasaran_genting ? (
          <div>
            <Badge tone="genting">Sasaran GENTING</Badge>
            {r.bantuan_genting && (
              <div className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-[200px]">{r.bantuan_genting}</div>
            )}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    { header: "Jam", cell: (r) => r.jam || "-" },
    {
      header: "Pendamping",
      cell: (r) => (
        <div>
          <div>{r.nama_pendamping || "-"}</div>
          {r.nama_ota && <div className="text-xs text-slate-400">OTA: {r.nama_ota}</div>}
        </div>
      ),
    },
    {
      header: "Keterangan",
      cell: (r) => <span className="text-slate-500 line-clamp-2 max-w-[220px] inline-block">{r.keterangan || "-"}</span>,
    },
    {
      header: "Validasi",
      cell: (r) => <Badge tone={r.validasi_status}>{LABEL_VALIDASI[r.validasi_status]}</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Pendampingan"
        subtitle="Seluruh data pendampingan di desa Anda"
        actions={
          <DataToolbar
            rows={rows}
            columns={EXPORT_COLUMNS}
            filename="data-pendampingan"
            title="Data Pendampingan"
          />
        }
      />
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Egg className="w-5 h-5" />
          <span className="font-semibold text-sm uppercase">Data Pendampingan Desa</span>
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} empty="Belum ada data pendampingan" />
      </Card>
    </div>
  );
}
