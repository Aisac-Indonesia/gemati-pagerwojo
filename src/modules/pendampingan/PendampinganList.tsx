"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Egg, Plus, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { PageHeader, Card, Badge, Button, SearchBar, Select, LABEL_VALIDASI, RowActions, IconAction } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer, TabsAktifSampah } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";
import { formatTanggal } from "@/lib/utils";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { IMPORT_FIELDS } from "@/lib/import-configs";
import { PendampinganForm } from "./PendampinganForm";

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

export type PendampinganRow = {
  id: number;
  balita_id: number;
  tanggal: string;
  hari_ke: number | null;
  jam: string | null;
  makan_telur: boolean;
  jumlah_butir: number | null;
  sasaran_genting: boolean | null;
  bantuan_genting: string | null;
  nama_ota: string | null;
  nama_pendamping: string | null;
  keterangan: string | null;
  validasi_status: string;
  balita_nama: string | null;
  balita_umur: string | null;
  balita_desa: string | null;
};

export function PendampinganList({
  role = "kader",
  namaPendamping = "",
}: {
  role?: "admin" | "ppkbd" | "kader";
  namaPendamping?: string;
}) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const canEdit = role === "kader" || role === "admin";

  const [tab, setTab] = useState<"aktif" | "sampah">("aktif");
  const [search, setSearch] = useState("");
  const [filterValidasi, setFilterValidasi] = useState<"all" | "menunggu" | "disetujui" | "ditolak">("all");
  const url =
    tab === "aktif"
      ? "/api/pendampingan?pageSize=200"
      : "/api/pendampingan/trashed?pageSize=200";
  const { data, loading, reload } = useList<{ data: PendampinganRow[] }>(url);
  const { data: trashData, reload: reloadTrash } = useList<{ data: PendampinganRow[] }>(
    "/api/pendampingan/trashed?pageSize=200"
  );

  function reloadAll() {
    reload();
    reloadTrash();
  }

  // drawer form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [confirmDel, setConfirmDel] = useState<PendampinganRow | null>(null);

  function openAdd() {
    setEditingId(undefined);
    setDrawerOpen(true);
  }
  function openEdit(r: PendampinganRow) {
    setEditingId(r.id);
    setDrawerOpen(true);
  }

  // deep-link ?add=1 → auto-buka drawer tambah
  useEffect(() => {
    if (canEdit && searchParams.get("add") === "1") {
      setEditingId(undefined);
      setDrawerOpen(true);
    }
  }, [searchParams, canEdit]);

  async function doDelete(id: number) {
    const res = await apiFetch(`/api/pendampingan/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Data dipindahkan ke sampah");
      reloadAll();
    } else toast(res.message || "Gagal", "error");
    setConfirmDel(null);
  }
  async function doRestore(id: number) {
    const res = await apiFetch(`/api/pendampingan/${id}/restore`, { method: "PATCH" });
    if (res.ok) {
      toast("Data berhasil dipulihkan");
      reloadAll();
    } else toast(res.message || "Gagal", "error");
  }

  const rows = (data?.data || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.balita_nama || "").toLowerCase().includes(q) ||
      (r.nama_pendamping || "").toLowerCase().includes(q) ||
      (r.nama_ota || "").toLowerCase().includes(q) ||
      (r.bantuan_genting || "").toLowerCase().includes(q) ||
      (r.keterangan || "").toLowerCase().includes(q);
    const matchValidasi = tab === "sampah" || filterValidasi === "all" || r.validasi_status === filterValidasi;
    return matchSearch && matchValidasi;
  });

  const baseColumns: Column<PendampinganRow>[] = [
    { header: "Tanggal", sortValue: (r) => r.tanggal, cell: (r) => <span className="whitespace-nowrap">{formatTanggal(r.tanggal)}</span> },
    {
      header: "Balita",
      sortValue: (r) => r.balita_nama || "",
      cell: (r) => (
        <div>
          <div className="font-medium text-heading dark:text-slate-200">{r.balita_nama || "-"}</div>
          <div className="text-xs text-slate-400">
            {[r.balita_umur, r.balita_desa].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    { header: "Hari", sortValue: (r) => r.hari_ke ?? 0, cell: (r) => <span className="font-medium">Hari {r.hari_ke ?? "-"}</span> },
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
      sortValue: (r) => (r.sasaran_genting ? 1 : 0),
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
      sortValue: (r) => r.nama_pendamping || "",
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
      sortValue: (r) => r.validasi_status,
      cell: (r) => <Badge tone={r.validasi_status}>{LABEL_VALIDASI[r.validasi_status]}</Badge>,
    },
  ];

  const aktifColumns: Column<PendampinganRow>[] = [
    ...baseColumns,
    ...(canEdit
      ? [
          {
            header: "Aksi",
            cell: (r: PendampinganRow) => (
              <RowActions>
                <IconAction icon={Pencil} title="Edit" tone="primary" onClick={() => openEdit(r)} />
                <IconAction icon={Trash2} title="Hapus" tone="danger" onClick={() => setConfirmDel(r)} />
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  const sampahColumns: Column<PendampinganRow>[] = [
    ...baseColumns.slice(0, 4),
    {
      header: "Aksi",
      cell: (r) => (
        <RowActions>
          <IconAction icon={RotateCcw} title="Pulihkan" tone="success" onClick={() => doRestore(r.id)} />
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pendampingan Makan Telur"
        subtitle="Catatan konsumsi telur harian balita dampingan"
        actions={
          <>
            <DataToolbar
              rows={rows}
              columns={EXPORT_COLUMNS}
              filename="data-pendampingan"
              title="Data Pendampingan"
              importConfig={{ entity: "pendampingan", fields: IMPORT_FIELDS["pendampingan"], onDone: reloadAll }}
            />
            {canEdit && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Pendampingan Baru
              </Button>
            )}
          </>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Egg className="w-5 h-5" />
              <span className="font-semibold text-sm uppercase">Data Pendampingan</span>
            </div>
            <TabsAktifSampah value={tab} onChange={setTab} countSampah={trashData?.data?.length} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === "aktif" && (
              <Select
                value={filterValidasi}
                onChange={(e) => setFilterValidasi(e.target.value as any)}
                className="w-auto py-2 text-sm"
              >
                <option value="all">Semua Validasi</option>
                <option value="menunggu">Menunggu</option>
                <option value="disetujui">Disetujui</option>
                <option value="ditolak">Ditolak</option>
              </Select>
            )}
            <SearchBar value={search} onChange={setSearch} placeholder="Cari balita, pendamping, OTA, keterangan..." />
          </div>
        </div>
        <DataTable
          columns={tab === "aktif" ? aktifColumns : sampahColumns}
          rows={rows}
          loading={loading}
          empty={tab === "aktif" ? "Belum ada data pendampingan" : "Sampah kosong"}
        />
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Pendampingan" : "Pendampingan Baru"}
        subtitle="Catat konsumsi telur harian balita dampingan"
      >
        {drawerOpen && (
          <PendampinganForm
            id={editingId}
            namaPendamping={namaPendamping}
            onSaved={() => {
              setDrawerOpen(false);
              reloadAll();
            }}
            onCancel={() => setDrawerOpen(false)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && doDelete(confirmDel.id)}
        title="Hapus Pendampingan"
        message={`Yakin memindahkan data pendampingan "${confirmDel?.balita_nama ?? ""}" ke sampah? Data dapat dipulihkan dari tab Sampah.`}
        danger
        confirmLabel="Hapus"
      />
    </div>
  );
}
