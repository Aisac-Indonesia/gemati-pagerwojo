"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Users as UsersIcon, CheckCircle, XCircle, Building2, RotateCcw, Trash2, Pencil, Power, PowerOff, KeyRound } from "lucide-react";
import { PageHeader, StatCard, SearchBar, Button, Field, Input, Select, Badge, Card, IconAction, RowActions } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useBulkActions } from "@/components/ui/BulkActions";
import { Drawer, TabsAktifSampah } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch, useList } from "@/lib/useApi";
import { inisial } from "@/lib/utils";
import { maskPhone, maskEmail } from "@/lib/mask";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { IMPORT_FIELDS } from "@/lib/import-configs";

type Row = {
  id: number; nama: string; username: string; role: string;
  desa_id: number | null; desa_nama?: string | null; phone?: string;
  email?: string; active: boolean; balita_count?: number; pendampingan_count?: number;
};
type DesaOpt = { id: number; nama: string };

const ROLE_LABEL: Record<string, string> = { admin: "Admin", ppkbd: "PPKBD", kader: "KPK" };
const ROLE_TONE: Record<string, string> = { admin: "admin", ppkbd: "ppkbd", kader: "kpk" };

export function UserManager({
  role,
  title,
  subtitle,
  addLabel,
  countLabel = "Balita Dampingan",
  showRole = false,
}: {
  role?: "kader" | "ppkbd";
  title: string;
  subtitle: string;
  addLabel: string;
  countLabel?: string;
  showRole?: boolean;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"aktif" | "sampah">("aktif");
  const roleQ = role ? `&role=${role}` : "";
  const url =
    tab === "aktif"
      ? `/api/users?pageSize=200${roleQ}`
      : `/api/users/trashed?pageSize=200${roleQ}`;
  const { data, loading, reload } = useList<{ data: Row[] }>(url);
  // hitung sampah count untuk badge tab
  const { data: trashData, reload: reloadTrash } = useList<{ data: Row[] }>(
    `/api/users/trashed?pageSize=200${roleQ}`
  );
  const [desaOpts, setDesaOpts] = useState<DesaOpt[]>([]);

  useEffect(() => {
    apiFetch<DesaOpt[]>("/api/desa").then((r) => r.data && setDesaOpts(r.data));
  }, []);

  function reloadAll() {
    reload();
    reloadTrash();
  }

  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "nonaktif">("all");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "ppkbd" | "kader">("all");

  const rows = (data?.data || []).filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || r.nama.toLowerCase().includes(q) || r.username.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
    const matchStatus =
      filterStatus === "all" || (filterStatus === "aktif" ? r.active : !r.active);
    const matchRole = filterRole === "all" || r.role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  const bulk = useBulkActions({
    entity: "users",
    tab,
    rows,
    enabled: true,
    canPurge: true,
    onDone: reloadAll,
    noun: role === "kader" ? "kader" : role === "ppkbd" ? "PPKBD" : "pengguna",
    purgeWarning: "Akun yang masih tercatat sebagai kader di data balita/pendampingan/pengukuran akan dilewati.",
  });

  const entity = role ?? "users";
  const exportRows = rows.map((r) => ({
    ...r,
    role_label: ROLE_LABEL[r.role] ?? r.role,
    status_label: r.active ? "Aktif" : "Nonaktif",
  }));
  const exportColumns = [
    { key: "nama", header: "Nama" },
    { key: "username", header: "Username" },
    ...(showRole ? [{ key: "role_label", header: "Role" }] : []),
    { key: "desa_nama", header: "Desa" },
    { key: "phone", header: "No. HP" },
    { key: "email", header: "Email" },
    { key: "status_label", header: "Status" },
  ];

  const stats = useMemo(() => {
    const all = data?.data || [];
    return {
      total: all.length,
      aktif: all.filter((r) => r.active).length,
      nonaktif: all.filter((r) => !r.active).length,
      desa: new Set(all.map((r) => r.desa_id).filter(Boolean)).size,
    };
  }, [data]);

  // drawer form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ nama: "", username: "", role: role || "kader", desa_id: "", phone: "", email: "", password: "kader123" });
    setDrawerOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({ nama: r.nama, username: r.username, role: r.role, desa_id: r.desa_id ?? "", phone: r.phone || "", email: r.email || "" });
    setDrawerOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      role: form.role,
      desa_id: form.role === "admin" ? null : form.desa_id ? Number(form.desa_id) : null,
    };
    const res = editing
      ? await apiFetch(`/api/users/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
      : await apiFetch(`/api/users`, { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      toast(editing ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      setDrawerOpen(false);
      reloadAll();
    } else toast(res.message || "Gagal menyimpan", "error");
  }

  async function doToggle(id: number) {
    const res = await apiFetch(`/api/users/${id}/toggle-active`, { method: "PATCH" });
    if (res.ok) { toast(res.message || "Status diubah"); reload(); }
    else toast(res.message || "Gagal", "error");
  }
  async function doReset(id: number) {
    const res = await apiFetch(`/api/users/${id}/reset-password`, { method: "PATCH" });
    if (res.ok) toast(res.message || "Password direset");
    else toast(res.message || "Gagal", "error");
  }
  async function doDelete(id: number) {
    const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Data dipindahkan ke sampah"); reloadAll(); }
    else toast(res.message || "Gagal", "error");
    setConfirmDel(null);
  }
  async function doRestore(id: number) {
    const res = await apiFetch(`/api/users/${id}/restore`, { method: "PATCH" });
    if (res.ok) { toast("Data berhasil dipulihkan"); reloadAll(); }
    else toast(res.message || "Gagal", "error");
  }

  const aktifColumns: Column<Row>[] = [
    {
      header: "Nama",
      sortValue: (r) => r.nama,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {inisial(r.nama)}
          </div>
          <div>
            <div className="font-medium text-heading dark:text-slate-200">{r.nama}</div>
            <div className="text-xs text-slate-400">@{r.username}</div>
          </div>
        </div>
      ),
    },
    ...(showRole ? [{ header: "Role", sortValue: (r: Row) => r.role, cell: (r: Row) => <Badge tone={ROLE_TONE[r.role]}>{ROLE_LABEL[r.role]}</Badge> }] : []),
    { header: "Desa", sortValue: (r) => r.desa_nama || "", cell: (r) => r.desa_nama || (r.role === "admin" ? "Kecamatan" : "-") },
    { header: "No. HP", cell: (r) => <span className="font-mono text-xs">{maskPhone(r.phone)}</span> },
    { header: "Email", cell: (r) => <span className="text-slate-500">{maskEmail(r.email)}</span> },
    ...(!showRole
      ? [{ header: countLabel, sortValue: (r: Row) => r.balita_count ?? 0, cell: (r: Row) => <Badge tone="default">{r.balita_count ?? 0} {role === "ppkbd" ? "kader" : "balita"}</Badge> }]
      : []),
    { header: "Status", sortValue: (r) => (r.active ? 1 : 0), cell: (r) => <Badge tone={r.active ? "aktif" : "nonaktif"}>{r.active ? "Aktif" : "Nonaktif"}</Badge> },
    {
      header: "Aksi",
      cell: (r) => (
        <RowActions>
          <IconAction icon={Pencil} title="Edit" tone="primary" onClick={() => openEdit(r)} />
          <IconAction
            icon={r.active ? PowerOff : Power}
            title={r.active ? "Nonaktifkan" : "Aktifkan"}
            tone={r.active ? "warning" : "success"}
            onClick={() => doToggle(r.id)}
          />
          <IconAction icon={KeyRound} title="Reset Password" onClick={() => doReset(r.id)} />
          <IconAction icon={Trash2} title="Hapus" tone="danger" onClick={() => setConfirmDel(r)} />
        </RowActions>
      ),
    },
  ];

  const sampahColumns: Column<Row>[] = [
    aktifColumns[0],
    ...(showRole ? [{ header: "Role", cell: (r: Row) => <Badge tone={ROLE_TONE[r.role]}>{ROLE_LABEL[r.role]}</Badge> }] : []),
    { header: "Desa", cell: (r) => r.desa_nama || (r.role === "admin" ? "Kecamatan" : "-") },
    { header: "Email", cell: (r) => <span className="text-slate-500">{r.email || "-"}</span> },
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
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <DataToolbar
              rows={exportRows}
              columns={exportColumns}
              filename={`data-${entity}`}
              title={title}
              importConfig={{ entity, fields: IMPORT_FIELDS[entity], onDone: reloadAll }}
            />
            <Button onClick={openAdd}><Plus className="w-4 h-4" /> {addLabel}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={showRole ? "Total Pengguna" : "Total"} value={stats.total} icon={UsersIcon} color="#2e7d32" />
        <StatCard label="Aktif" value={stats.aktif} icon={CheckCircle} color="#16a34a" />
        <StatCard label="Nonaktif" value={stats.nonaktif} icon={XCircle} color="#dc2626" />
        <StatCard label={role === "ppkbd" ? "Desa Tercover" : "Desa Terlayani"} value={stats.desa} icon={Building2} color="#2563eb" />
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsAktifSampah
            value={tab}
            onChange={setTab}
            countSampah={trashData?.data?.length}
          />
          <div className="flex flex-wrap items-center gap-2">
            {tab === "aktif" && (
              <>
                {showRole && (
                  <Select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    className="w-auto py-2 text-sm"
                  >
                    <option value="all">Semua Role</option>
                    <option value="admin">Admin</option>
                    <option value="ppkbd">PPKBD</option>
                    <option value="kader">Kader (KPK)</option>
                  </Select>
                )}
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-auto py-2 text-sm"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </Select>
              </>
            )}
            <SearchBar value={search} onChange={setSearch} placeholder="Cari nama atau username..." />
          </div>
        </div>
        {bulk.bar}
        <DataTable
          selection={bulk.selection}
          columns={tab === "aktif" ? aktifColumns : sampahColumns}
          rows={rows}
          loading={loading}
          empty={tab === "aktif" ? "Belum ada pengguna" : "Sampah kosong"}
        />
      </Card>

      {bulk.dialog}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${addLabel.replace("Tambah ", "")}` : addLabel}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Lengkap" required>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </Field>
          <Field label="Username" required>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          {showRole && (
            <Field label="Role / Hak Akses" required>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="ppkbd">PPKBD</option>
                <option value="kader">Kader (KPK)</option>
              </Select>
            </Field>
          )}
          {form.role !== "admin" && (
            <Field label="Desa" required>
              <Select value={form.desa_id} onChange={(e) => setForm({ ...form, desa_id: e.target.value })}>
                <option value="">Pilih desa</option>
                {desaOpts.map((d) => (
                  <option key={d.id} value={d.id}>Desa {d.nama}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="No. HP">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {!editing && (
            <Field label="Password Awal">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && doDelete(confirmDel.id)}
        title="Hapus Pengguna"
        message={`Yakin memindahkan "${confirmDel?.nama}" ke sampah? Data dapat dipulihkan dari tab Sampah.`}
        danger
        confirmLabel="Hapus"
      />
    </div>
  );
}
