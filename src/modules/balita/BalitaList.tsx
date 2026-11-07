"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Baby, Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader, SearchBar, Select, Button, Badge, Card, LABEL_VALIDASI, IconAction, RowActions } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useBulkActions } from "@/components/ui/BulkActions";
import { Drawer, TabsAktifSampah } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";
import { maskNik, maskPhone } from "@/lib/mask";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { IMPORT_FIELDS } from "@/lib/import-configs";
import { BalitaForm } from "./BalitaForm";

const EXPORT_COLUMNS = [
  { key: "nama", header: "Nama" },
  { key: "nik", header: "NIK" },
  { key: "jenis_kelamin", header: "JK" },
  { key: "umur", header: "Umur" },
  { key: "desa_nama", header: "Desa" },
  { key: "posyandu_nama", header: "Posyandu" },
  { key: "nama_ibu", header: "Nama Ibu" },
  { key: "status", header: "Status" },
  { key: "validasi_status", header: "Validasi" },
];

type Row = {
  id: number;
  nama: string;
  nik: string;
  jenis_kelamin: "L" | "P";
  nama_ibu: string;
  status: string;
  validasi_status: string;
  umur: string;
  tanggal_lahir?: string | null;
  no_hp?: string | null;
  desa_nama?: string | null;
  posyandu_nama?: string | null;
};

function JkBadge({ jk }: { jk: "L" | "P" }) {
  const isL = jk === "L";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isL
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
      }`}
    >
      {isL ? "Laki-laki" : "Perempuan"}
    </span>
  );
}

export function BalitaList({
  canAdd,
  role,
  title = "Data Balita",
  subtitle = "Data seluruh balita di Kecamatan Pagerwojo",
}: {
  canAdd: boolean;
  role: "admin" | "ppkbd" | "kader";
  title?: string;
  subtitle?: string;
}) {
  const canEdit = role === "admin" || role === "ppkbd" || role === "kader";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"aktif" | "sampah">("aktif");

  const url =
    tab === "aktif" ? "/api/balita?pageSize=200" : "/api/balita/trashed?pageSize=200";
  const { data, loading, reload } = useList<{ data: Row[] }>(url);
  const { data: trashData, reload: reloadTrash } = useList<{ data: Row[] }>(
    "/api/balita/trashed?pageSize=200"
  );

  function reloadAll() {
    reload();
    reloadTrash();
  }

  // drawer form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  function openAdd() {
    setEditingId(undefined);
    setDrawerOpen(true);
  }
  function openEdit(id: number) {
    setEditingId(id);
    setDrawerOpen(true);
  }

  // deep-link: ?add=1 buka drawer tambah, ?edit=<id> buka drawer edit
  useEffect(() => {
    if (canAdd && searchParams.get("add") === "1") {
      openAdd();
      router.replace("/balita");
    } else if (canEdit) {
      const edit = searchParams.get("edit");
      if (edit && !Number.isNaN(Number(edit))) {
        openEdit(Number(edit));
        router.replace("/balita");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canAdd, canEdit]);

  // filter toolbar (tab aktif)
  const [filterDesa, setFilterDesa] = useState("all");
  const [filterValidasi, setFilterValidasi] = useState<"all" | "menunggu" | "disetujui" | "ditolak">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "nonaktif">("all");
  const [filterJk, setFilterJk] = useState<"all" | "L" | "P">("all");

  // daftar desa unik dari data (untuk filter admin/ppkbd)
  const desaOpts = useMemo(() => {
    const set = new Set<string>();
    (data?.data || []).forEach((r) => r.desa_nama && set.add(r.desa_nama));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [data]);

  const rows = (data?.data || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.nama.toLowerCase().includes(q) ||
      r.nik.toLowerCase().includes(q) ||
      (r.nama_ibu || "").toLowerCase().includes(q);
    const matchDesa = filterDesa === "all" || (r.desa_nama || "") === filterDesa;
    const matchValidasi = filterValidasi === "all" || r.validasi_status === filterValidasi;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchJk = filterJk === "all" || r.jenis_kelamin === filterJk;
    return matchSearch && matchDesa && matchValidasi && matchStatus && matchJk;
  });

  const bulk = useBulkActions({
    entity: "balita",
    tab,
    rows,
    enabled: canEdit,
    canPurge: role === "admin",
    onDone: reloadAll,
    noun: "balita",
    purgeWarning: "Semua data pendampingan dan pengukuran balita tersebut ikut terhapus permanen.",
  });

  async function doDelete(id: number) {
    const res = await apiFetch(`/api/balita/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Data dipindahkan ke sampah");
      reloadAll();
    } else toast(res.message || "Gagal menghapus", "error");
    setConfirmDel(null);
  }
  async function doRestore(id: number) {
    const res = await apiFetch(`/api/balita/${id}/restore`, { method: "PATCH" });
    if (res.ok) {
      toast("Data berhasil dipulihkan");
      reloadAll();
    } else toast(res.message || "Gagal memulihkan", "error");
  }

  const namaCol: Column<Row> = {
    header: "Nama Balita",
    sortValue: (r) => r.nama,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Baby className="w-5 h-5" />
        </div>
        <div>
          <div className="font-medium text-heading dark:text-slate-200">{r.nama}</div>
          <div className="text-xs text-slate-400 font-mono">NIK: {maskNik(r.nik)}</div>
        </div>
      </div>
    ),
  };

  const aktifColumns: Column<Row>[] = [
    namaCol,
    { header: "JK", sortValue: (r) => r.jenis_kelamin, cell: (r) => <JkBadge jk={r.jenis_kelamin} /> },
    { header: "Umur", sortValue: (r) => r.tanggal_lahir || "", cell: (r) => r.umur },
    { header: "Desa", sortValue: (r) => r.desa_nama || "", cell: (r) => r.desa_nama || "-" },
    { header: "Posyandu", sortValue: (r) => r.posyandu_nama || "", cell: (r) => r.posyandu_nama || "-" },
    { header: "Nama Ibu", sortValue: (r) => r.nama_ibu || "", cell: (r) => r.nama_ibu || "-" },
    { header: "No. HP", cell: (r) => <span className="font-mono text-xs">{maskPhone(r.no_hp)}</span> },
    {
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge tone={r.status === "aktif" ? "aktif" : "nonaktif"}>
          {r.status === "aktif" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      header: "Validasi",
      sortValue: (r) => r.validasi_status,
      cell: (r) => <Badge tone={r.validasi_status}>{LABEL_VALIDASI[r.validasi_status] || r.validasi_status}</Badge>,
    },
    {
      header: "Aksi",
      cell: (r) => (
        <RowActions>
          <IconAction icon={Eye} title="Lihat" onClick={() => router.push(`/balita/${r.id}`)} />
          {canEdit && (
            <>
              <IconAction icon={Pencil} title="Edit" tone="primary" onClick={() => openEdit(r.id)} />
              <IconAction icon={Trash2} title="Hapus" tone="danger" onClick={() => setConfirmDel(r)} />
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const sampahColumns: Column<Row>[] = [
    namaCol,
    { header: "JK", sortValue: (r) => r.jenis_kelamin, cell: (r) => <JkBadge jk={r.jenis_kelamin} /> },
    { header: "Umur", sortValue: (r) => r.tanggal_lahir || "", cell: (r) => r.umur },
    { header: "Desa", sortValue: (r) => r.desa_nama || "", cell: (r) => r.desa_nama || "-" },
    { header: "Nama Ibu", sortValue: (r) => r.nama_ibu || "", cell: (r) => r.nama_ibu || "-" },
    {
      header: "Aksi",
      cell: (r) => (
        <RowActions>
          <IconAction icon={RotateCcw} title="Pulihkan" tone="success" onClick={() => doRestore(r.id)} />
          {role === "admin" && (
            <IconAction icon={Trash2} title="Hapus Permanen" tone="danger" onClick={() => bulk.purgeOne(r.id)} />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <DataToolbar
              rows={rows}
              columns={EXPORT_COLUMNS}
              filename="data-balita"
              title="Data Balita"
              importConfig={{ entity: "balita", fields: IMPORT_FIELDS["balita"], onDone: reloadAll }}
            />
            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Tambah Balita
              </Button>
            )}
          </>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsAktifSampah value={tab} onChange={setTab} countSampah={trashData?.data?.length} />
          <div className="flex flex-wrap items-center gap-2">
            {tab === "aktif" && (
              <>
                {role !== "kader" && (
                  <Select
                    value={filterDesa}
                    onChange={(e) => setFilterDesa(e.target.value)}
                    className="w-auto py-2 text-sm"
                  >
                    <option value="all">Semua Desa</option>
                    {desaOpts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                )}
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
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-auto py-2 text-sm"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </Select>
                <Select
                  value={filterJk}
                  onChange={(e) => setFilterJk(e.target.value as any)}
                  className="w-auto py-2 text-sm"
                >
                  <option value="all">Semua JK</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </Select>
              </>
            )}
            <SearchBar value={search} onChange={setSearch} placeholder="Cari nama, NIK, atau nama ibu..." />
          </div>
        </div>
        {bulk.bar}
        <DataTable
          selection={bulk.selection}
          columns={tab === "aktif" ? aktifColumns : sampahColumns}
          rows={rows}
          loading={loading}
          empty={tab === "aktif" ? "Belum ada data balita" : "Sampah kosong"}
        />
      </Card>

      {bulk.dialog}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Edit Data Balita" : "Tambah Data Balita"}
        subtitle="Lengkapi data balita dampingan dengan benar"
      >
        {drawerOpen && (
          <BalitaForm
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
        title="Hapus Data Balita"
        message={`Yakin memindahkan "${confirmDel?.nama}" ke sampah? Data dapat dipulihkan dari tab Sampah.`}
        danger
        confirmLabel="Hapus"
      />
    </div>
  );
}
