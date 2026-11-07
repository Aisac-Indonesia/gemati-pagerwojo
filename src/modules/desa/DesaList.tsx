"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Baby,
  ClipboardList,
  UserCog,
  Users as UsersIcon,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  SearchBar,
  Card,
  Badge,
  Button,
  Field,
  Input,
  IconAction,
  RowActions,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useBulkActions } from "@/components/ui/BulkActions";
import { Drawer, TabsAktifSampah } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { IMPORT_FIELDS } from "@/lib/import-configs";

const EXPORT_COLUMNS = [
  { key: "nama", header: "Nama Desa" },
  { key: "kecamatan", header: "Kecamatan" },
  { key: "balita", header: "Balita" },
  { key: "pendampingan", header: "Pendampingan" },
  { key: "valid", header: "Valid" },
  { key: "persentase", header: "Persentase" },
  { key: "risiko_stunting", header: "Risiko Stunting" },
  { key: "rata_bb", header: "Rata-rata BB" },
  { key: "rata_tb", header: "Rata-rata TB" },
];

type DesaAgg = {
  id: number;
  nama: string;
  kecamatan: string;
  lat: number | null;
  lng: number | null;
  balita: number;
  kader: number;
  pendampingan: number;
  valid: number;
  belum_valid: number;
  persentase: number;
  risiko_stunting: number;
  rata_bb: number;
  rata_tb: number;
};

type DesaRow = {
  id: number;
  nama: string;
  kecamatan: string;
  kabupaten: string;
  lat: number | null;
  lng: number | null;
};

const emptyForm = {
  nama: "",
  kecamatan: "Pagerwojo",
  kabupaten: "Tulungagung",
  lat: "",
  lng: "",
};

export function DesaList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"aktif" | "sampah">("aktif");
  const [ppkbdCount, setPpkbdCount] = useState(0);

  const { data, loading, reload } = useList<DesaAgg[]>("/api/desa?agregat=1");
  const { data: trashData, loading: trashLoading, reload: reloadTrash } = useList<{ data: DesaRow[] }>(
    "/api/desa/trashed?pageSize=200"
  );

  useEffect(() => {
    apiFetch<{ data: { role: string }[] }>("/api/users?role=ppkbd&pageSize=200").then(
      (r) => setPpkbdCount(r.data?.data?.length ?? 0)
    );
  }, []);

  function reloadAll() {
    reload();
    reloadTrash();
  }

  const all = useMemo(() => data ?? [], [data]);

  const rows = all.filter((d) => {
    const q = search.toLowerCase().trim();
    return !q || `desa ${d.nama}`.toLowerCase().includes(q) || d.nama.toLowerCase().includes(q);
  });

  const trashRows = (trashData?.data || []).filter((d) => {
    const q = search.toLowerCase().trim();
    return !q || d.nama.toLowerCase().includes(q) || (d.kecamatan || "").toLowerCase().includes(q);
  });

  const bulk = useBulkActions({
    entity: "desa",
    tab,
    rows: tab === "aktif" ? rows : trashRows,
    enabled: true,
    canPurge: true,
    onDone: reloadAll,
    noun: "desa",
    purgeWarning: "Desa yang masih dipakai data balita, posyandu, atau pengguna akan dilewati.",
  });

  const totals = useMemo(() => {
    return {
      desa: all.length,
      balita: all.reduce((a, d) => a + d.balita, 0),
      pendampingan: all.reduce((a, d) => a + d.pendampingan, 0),
      kader: all.reduce((a, d) => a + d.kader, 0),
      risiko: all.reduce((a, d) => a + d.risiko_stunting, 0),
    };
  }, [all]);

  // drawer form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DesaAgg | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<DesaAgg | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDrawerOpen(true);
  }
  async function openEdit(d: DesaAgg) {
    setEditing(d);
    setForm({
      nama: d.nama,
      kecamatan: d.kecamatan || "Pagerwojo",
      kabupaten: "Tulungagung",
      lat: d.lat != null ? String(d.lat) : "",
      lng: d.lng != null ? String(d.lng) : "",
    });
    setDrawerOpen(true);
    // ambil data lengkap (kabupaten dsb) untuk prefill akurat
    const res = await apiFetch<DesaRow>(`/api/desa/${d.id}`);
    if (res.ok && res.data) {
      const r = res.data;
      setForm({
        nama: r.nama,
        kecamatan: r.kecamatan || "Pagerwojo",
        kabupaten: r.kabupaten || "Tulungagung",
        lat: r.lat != null ? String(r.lat) : "",
        lng: r.lng != null ? String(r.lng) : "",
      });
    }
  }

  async function save() {
    if (!form.nama.trim()) {
      toast("Nama desa wajib diisi", "error");
      return;
    }
    setSaving(true);
    const payload = {
      nama: form.nama.trim(),
      kecamatan: form.kecamatan.trim() || "Pagerwojo",
      kabupaten: form.kabupaten.trim() || "Tulungagung",
      lat: form.lat.trim() === "" ? null : Number(form.lat),
      lng: form.lng.trim() === "" ? null : Number(form.lng),
    };
    const res = editing
      ? await apiFetch(`/api/desa/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
      : await apiFetch(`/api/desa`, { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      toast(editing ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      setDrawerOpen(false);
      reloadAll();
    } else toast(res.message || "Gagal menyimpan", "error");
  }

  async function doDelete(id: number) {
    const res = await apiFetch(`/api/desa/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Data dipindahkan ke sampah");
      reloadAll();
    } else toast(res.message || "Gagal", "error");
    setConfirmDel(null);
  }
  async function doRestore(id: number) {
    const res = await apiFetch(`/api/desa/${id}/restore`, { method: "PATCH" });
    if (res.ok) {
      toast("Data berhasil dipulihkan");
      reloadAll();
    } else toast(res.message || "Gagal", "error");
  }

  const aktifColumns: Column<DesaAgg>[] = [
    {
      header: "Desa",
      sortValue: (d) => d.nama,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-heading dark:text-slate-200">Desa {d.nama}</div>
            <div className="text-xs text-slate-400">Kec. {d.kecamatan || "Pagerwojo"}</div>
          </div>
        </div>
      ),
    },
    { header: "Balita", sortValue: (d) => d.balita, cell: (d) => d.balita },
    { header: "Pendampingan", sortValue: (d) => d.pendampingan, cell: (d) => d.pendampingan },
    { header: "Valid", sortValue: (d) => d.valid, cell: (d) => d.valid },
    {
      header: "Persentase",
      sortValue: (d) => d.persentase,
      cell: (d) => <Badge tone="disetujui">{d.persentase}%</Badge>,
    },
    {
      header: "Risiko Stunting",
      sortValue: (d) => d.risiko_stunting,
      cell: (d) => (
        <span className="font-medium text-red-600 dark:text-red-400">{d.risiko_stunting}</span>
      ),
    },
    { header: "Rata-rata BB", sortValue: (d) => d.rata_bb, cell: (d) => `${d.rata_bb} kg` },
    { header: "Rata-rata TB", sortValue: (d) => d.rata_tb, cell: (d) => `${d.rata_tb} cm` },
    {
      header: "Aksi",
      cell: (d) => (
        <RowActions>
          <IconAction icon={Pencil} title="Edit" tone="primary" onClick={() => openEdit(d)} />
          <IconAction icon={Trash2} title="Hapus" tone="danger" onClick={() => setConfirmDel(d)} />
        </RowActions>
      ),
    },
  ];

  const sampahColumns: Column<DesaRow>[] = [
    {
      header: "Desa",
      sortValue: (d) => d.nama,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="font-medium text-heading dark:text-slate-200">Desa {d.nama}</div>
        </div>
      ),
    },
    { header: "Kecamatan", sortValue: (d) => d.kecamatan || "", cell: (d) => d.kecamatan || "-" },
    {
      header: "Aksi",
      cell: (d) => (
        <RowActions>
          <IconAction icon={RotateCcw} title="Pulihkan" tone="success" onClick={() => doRestore(d.id)} />
          {true && (
            <IconAction icon={Trash2} title="Hapus Permanen" tone="danger" onClick={() => bulk.purgeOne(d.id)} />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Desa"
        subtitle="Master data desa di Kecamatan Pagerwojo"
        actions={
          <>
            <DataToolbar
              rows={rows}
              columns={EXPORT_COLUMNS}
              filename="data-desa"
              title="Data Desa"
              importConfig={{ entity: "desa", fields: IMPORT_FIELDS["desa"], onDone: reloadAll }}
            />
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Tambah Desa
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Desa" value={totals.desa} icon={Building2} color="#2e7d32" />
        <StatCard label="Total Balita" value={totals.balita} icon={Baby} color="#2563eb" />
        <StatCard label="Total Pendampingan" value={totals.pendampingan} icon={ClipboardList} color="#0891b2" />
        <StatCard label="Total Kader" value={totals.kader} icon={UsersIcon} color="#d97706" />
        <StatCard label="Total PPKBD" value={ppkbdCount} icon={UserCog} color="#7c3aed" />
        <StatCard label="Risiko Stunting" value={totals.risiko} icon={AlertTriangle} color="#dc2626" />
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsAktifSampah value={tab} onChange={setTab} countSampah={trashData?.data?.length} />
          <SearchBar value={search} onChange={setSearch} placeholder="Cari desa..." />
        </div>
        {bulk.bar}
        {tab === "aktif" ? (
          <DataTable
            selection={bulk.selection}
            columns={aktifColumns}
            rows={rows}
            loading={loading}
            empty="Belum ada data desa"
          />
        ) : (
          <DataTable
            selection={bulk.selection}
            columns={sampahColumns}
            rows={trashRows}
            loading={trashLoading}
            empty="Sampah kosong"
          />
        )}
      </Card>

      {bulk.dialog}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Desa" : "Tambah Desa"}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Desa" required>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </Field>
          <Field label="Kecamatan">
            <Input value={form.kecamatan} onChange={(e) => setForm({ ...form, kecamatan: e.target.value })} />
          </Field>
          <Field label="Kabupaten">
            <Input value={form.kabupaten} onChange={(e) => setForm({ ...form, kabupaten: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <Input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && doDelete(confirmDel.id)}
        title="Hapus Desa"
        message={`Yakin memindahkan "Desa ${confirmDel?.nama}" ke sampah? Data dapat dipulihkan dari tab Sampah.`}
        danger
        confirmLabel="Hapus"
      />
    </div>
  );
}
