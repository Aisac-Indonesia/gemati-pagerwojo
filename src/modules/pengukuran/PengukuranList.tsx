"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ruler, Plus, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { PageHeader, Card, Badge, Button, SearchBar, Select, LABEL_VALIDASI, RowActions, IconAction } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useBulkActions } from "@/components/ui/BulkActions";
import { Drawer, TabsAktifSampah } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";
import { formatTanggal } from "@/lib/utils";
import { LABEL_GIZI } from "@/lib/gizi";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { IMPORT_FIELDS } from "@/lib/import-configs";
import { PengukuranForm } from "./PengukuranForm";

const EXPORT_COLUMNS = [
  { key: "tanggal", header: "Tanggal" },
  { key: "balita_nama", header: "Balita" },
  { key: "berat_badan", header: "BB (kg)" },
  { key: "tinggi_badan", header: "TB (cm)" },
  { key: "lingkar_kepala", header: "Lingkar Kepala" },
  { key: "lingkar_lengan_atas", header: "LILA" },
  { key: "z_score", header: "Z-Score" },
  { key: "status_gizi", header: "Status Gizi" },
  { key: "validasi_status", header: "Validasi" },
];

export type PengukuranRow = {
  id: number;
  balita_id: number;
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  lingkar_kepala: number | null;
  lingkar_lengan_atas: number | null;
  z_score: number | null;
  status_gizi: string | null;
  risiko_stunting: string | null;
  validasi_status: string;
  balita_nama: string | null;
  balita_umur: string | null;
  balita_desa: string | null;
};

const GIZI_TONE: Record<string, string> = {
  normal: "aktif",
  kurang: "menunggu",
  sangat_kurang: "ditolak",
};

export function PengukuranList({
  role = "kader",
}: {
  role?: "admin" | "ppkbd" | "kader";
}) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const canEdit = role === "kader" || role === "admin";

  const [tab, setTab] = useState<"aktif" | "sampah">("aktif");
  const [search, setSearch] = useState("");
  const [filterValidasi, setFilterValidasi] = useState<"all" | "menunggu" | "disetujui" | "ditolak">("all");
  const url =
    tab === "aktif" ? "/api/pengukuran?pageSize=200" : "/api/pengukuran/trashed?pageSize=200";
  const { data, loading, reload } = useList<{ data: PengukuranRow[] }>(url);
  const { data: trashData, reload: reloadTrash } = useList<{ data: PengukuranRow[] }>(
    "/api/pengukuran/trashed?pageSize=200"
  );

  function reloadAll() {
    reload();
    reloadTrash();
  }

  // drawer form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [confirmDel, setConfirmDel] = useState<PengukuranRow | null>(null);

  function openAdd() {
    setEditingId(undefined);
    setDrawerOpen(true);
  }
  function openEdit(r: PengukuranRow) {
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
    const res = await apiFetch(`/api/pengukuran/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Data dipindahkan ke sampah");
      reloadAll();
    } else toast(res.message || "Gagal", "error");
    setConfirmDel(null);
  }
  async function doRestore(id: number) {
    const res = await apiFetch(`/api/pengukuran/${id}/restore`, { method: "PATCH" });
    if (res.ok) {
      toast("Data berhasil dipulihkan");
      reloadAll();
    } else toast(res.message || "Gagal", "error");
  }

  const rows = (data?.data || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (r.balita_nama || "").toLowerCase().includes(q);
    const matchValidasi = tab === "sampah" || filterValidasi === "all" || r.validasi_status === filterValidasi;
    return matchSearch && matchValidasi;
  });

  const bulk = useBulkActions({
    entity: "pengukuran",
    tab,
    rows,
    enabled: canEdit,
    canPurge: role === "admin",
    onDone: reloadAll,
    noun: "data pengukuran",
  });

  const baseColumns: Column<PengukuranRow>[] = [
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
    { header: "BB (kg)", sortValue: (r) => r.berat_badan ?? 0, cell: (r) => r.berat_badan },
    { header: "TB (cm)", sortValue: (r) => r.tinggi_badan ?? 0, cell: (r) => r.tinggi_badan },
    { header: "Lingkar Kepala", cell: (r) => (r.lingkar_kepala != null ? `${r.lingkar_kepala} cm` : "-") },
    { header: "LILA", cell: (r) => (r.lingkar_lengan_atas != null ? `${r.lingkar_lengan_atas} cm` : "-") },
    { header: "Z-Score", sortValue: (r) => r.z_score ?? 0, cell: (r) => <span className="font-medium">{r.z_score != null ? r.z_score : "-"}</span> },
    {
      header: "Status Gizi",
      cell: (r) =>
        r.status_gizi ? (
          <Badge tone={GIZI_TONE[r.status_gizi] || "default"}>{LABEL_GIZI[r.status_gizi]}</Badge>
        ) : (
          "-"
        ),
    },
    {
      header: "Validasi",
      sortValue: (r) => r.validasi_status,
      cell: (r) => <Badge tone={r.validasi_status}>{LABEL_VALIDASI[r.validasi_status]}</Badge>,
    },
  ];

  const aktifColumns: Column<PengukuranRow>[] = [
    ...baseColumns,
    ...(canEdit
      ? [
          {
            header: "Aksi",
            cell: (r: PengukuranRow) => (
              <RowActions>
                <IconAction icon={Pencil} title="Edit" tone="primary" onClick={() => openEdit(r)} />
                <IconAction icon={Trash2} title="Hapus" tone="danger" onClick={() => setConfirmDel(r)} />
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  const sampahColumns: Column<PengukuranRow>[] = [
    baseColumns[0],
    baseColumns[1],
    baseColumns[2],
    baseColumns[3],
    baseColumns[7],
    {
      header: "Aksi",
      cell: (r) => (
        <RowActions>
          <IconAction icon={RotateCcw} title="Pulihkan" tone="success" onClick={() => doRestore(r.id)} />
          {true && (
            <IconAction icon={Trash2} title="Hapus Permanen" tone="danger" onClick={() => bulk.purgeOne(r.id)} />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengukuran Balita"
        subtitle="Antropometri & status gizi balita dampingan"
        actions={
          <>
            <DataToolbar
              rows={rows}
              columns={EXPORT_COLUMNS}
              filename="data-pengukuran"
              title="Data Pengukuran"
              importConfig={{ entity: "pengukuran", fields: IMPORT_FIELDS["pengukuran"], onDone: reloadAll }}
            />
            {canEdit && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Pengukuran Baru
              </Button>
            )}
          </>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Ruler className="w-5 h-5" />
              <span className="font-semibold text-sm uppercase">Data Pengukuran</span>
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
            <SearchBar value={search} onChange={setSearch} placeholder="Cari balita..." />
          </div>
        </div>
        {bulk.bar}
        <DataTable
          selection={bulk.selection}
          columns={tab === "aktif" ? aktifColumns : sampahColumns}
          rows={rows}
          loading={loading}
          empty={tab === "aktif" ? "Belum ada data pengukuran" : "Sampah kosong"}
        />
      </Card>

      {bulk.dialog}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Pengukuran" : "Pengukuran Baru"}
        subtitle="Catat antropometri & hitung status gizi balita"
      >
        {drawerOpen && (
          <PengukuranForm
            id={editingId}
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
        title="Hapus Pengukuran"
        message={`Yakin memindahkan data pengukuran "${confirmDel?.balita_nama ?? ""}" ke sampah? Data dapat dipulihkan dari tab Sampah.`}
        danger
        confirmLabel="Hapus"
      />
    </div>
  );
}
