"use client";
import { useEffect, useState } from "react";
import { Plus, HeartPulse, Pencil, Trash2, RotateCcw } from "lucide-react";
import {
  PageHeader, StatCard, SearchBar, Button, Field, Input, Select, Card,
  IconAction, RowActions,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useBulkActions } from "@/components/ui/BulkActions";
import { TabsAktifSampah } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { IMPORT_FIELDS } from "@/lib/import-configs";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";

type Row = { id: number; nama: string; desa_id: number; desa_nama?: string | null };
type DesaOpt = { id: number; nama: string };

export function PosyanduList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"aktif" | "sampah">("aktif");
  const { data, loading, reload: reloadAktif } = useList<{ data: Row[]; total: number }>("/api/posyandu?pageSize=500");
  const { data: trashData, loading: trashLoading, reload: reloadTrash } = useList<{ data: Row[] }>(
    "/api/posyandu/trashed?pageSize=200"
  );
  function reload() {
    reloadAktif();
    reloadTrash();
  }
  const [desaOpts, setDesaOpts] = useState<DesaOpt[]>([]);

  useEffect(() => {
    apiFetch<DesaOpt[]>("/api/desa").then((r) => r.data && setDesaOpts(r.data));
  }, []);

  const rows = ((tab === "aktif" ? data?.data : trashData?.data) || []).filter((r) => {
    const q = search.toLowerCase();
    return !q || r.nama.toLowerCase().includes(q) || (r.desa_nama || "").toLowerCase().includes(q);
  });

  const bulk = useBulkActions({
    entity: "posyandu",
    tab,
    rows,
    enabled: true,
    canPurge: true,
    onDone: reload,
    noun: "posyandu",
    purgeWarning: "Posyandu yang masih dipakai data balita akan dilewati.",
  });

  async function doRestore(id: number) {
    const res = await apiFetch(`/api/posyandu/${id}/restore`, { method: "PATCH" });
    if (res.ok) { toast("Data berhasil dipulihkan"); reload(); }
    else toast(res.message || "Gagal", "error");
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<{ nama: string; desa_id: string }>({ nama: "", desa_id: "" });
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ nama: "", desa_id: "" });
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({ nama: r.nama, desa_id: String(r.desa_id) });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nama.trim() || !form.desa_id) {
      toast("Nama & desa wajib diisi", "error");
      return;
    }
    setSaving(true);
    const payload = { nama: form.nama.trim(), desa_id: Number(form.desa_id) };
    const res = editing
      ? await apiFetch(`/api/posyandu/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
      : await apiFetch(`/api/posyandu`, { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      toast(editing ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      setModalOpen(false);
      reload();
    } else toast(res.message || "Gagal menyimpan", "error");
  }

  async function doDelete(id: number) {
    const res = await apiFetch(`/api/posyandu/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Data dipindahkan ke sampah"); reload(); }
    else toast(res.message || "Gagal", "error");
    setDelId(null);
  }

  const columns: Column<Row>[] = [
    {
      header: "Nama Posyandu",
      sortValue: (r) => r.nama,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <HeartPulse className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-heading dark:text-slate-200">{r.nama}</span>
        </div>
      ),
    },
    { header: "Desa", sortValue: (r) => r.desa_nama || "", cell: (r) => r.desa_nama || "-" },
    {
      header: "Aksi",
      cell: (r) =>
        tab === "aktif" ? (
          <RowActions>
            <IconAction icon={Pencil} title="Edit" tone="primary" onClick={() => openEdit(r)} />
            <IconAction icon={Trash2} title="Hapus" tone="danger" onClick={() => setDelId(r.id)} />
          </RowActions>
        ) : (
          <RowActions>
            <IconAction icon={RotateCcw} title="Pulihkan" tone="success" onClick={() => doRestore(r.id)} />
            <IconAction icon={Trash2} title="Hapus Permanen" tone="danger" onClick={() => bulk.purgeOne(r.id)} />
          </RowActions>
        ),
    },
  ];

  const all = data?.data || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Posyandu"
        subtitle="Master data posyandu per desa"
        actions={
          <>
            <DataToolbar
              rows={all}
              columns={[
                { key: "nama", header: "Nama Posyandu" },
                { key: "desa_nama", header: "Desa" },
              ]}
              filename="data-posyandu"
              title="Data Posyandu"
              importConfig={{ entity: "posyandu", fields: IMPORT_FIELDS.posyandu, onDone: reload }}
            />
            <Button onClick={openAdd}><Plus className="w-4 h-4" /> Tambah Posyandu</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Posyandu" value={all.length} icon={HeartPulse} color="#2e7d32" />
        <StatCard label="Desa Tercakup" value={new Set(all.map((p) => p.desa_id)).size} icon={HeartPulse} color="#2563eb" />
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsAktifSampah value={tab} onChange={setTab} countSampah={trashData?.data?.length} />
          <SearchBar value={search} onChange={setSearch} placeholder="Cari posyandu atau desa..." />
        </div>
        {bulk.bar}
        <DataTable
          selection={bulk.selection}
          columns={columns}
          rows={rows}
          loading={tab === "aktif" ? loading : trashLoading}
          empty={tab === "aktif" ? "Belum ada posyandu" : "Sampah kosong"}
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Posyandu" : "Tambah Posyandu"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          <Field label="Nama Posyandu" required>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="mis. Melati I" />
          </Field>
          <Field label="Desa" required>
            <Select value={form.desa_id} onChange={(e) => setForm({ ...form, desa_id: e.target.value })}>
              <option value="">Pilih desa</option>
              {desaOpts.map((d) => (
                <option key={d.id} value={d.id}>Desa {d.nama}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onClose={() => setDelId(null)}
        onConfirm={() => delId !== null && doDelete(delId)}
        title="Hapus Posyandu"
        message="Pindahkan posyandu ini ke Sampah? Data dapat dipulihkan dari tab Sampah."
        danger
        confirmLabel="Hapus"
      />
      {bulk.dialog}
    </div>
  );
}
