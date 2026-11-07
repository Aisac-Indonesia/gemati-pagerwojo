"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckSquare, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "./primitives";
import { ConfirmDialog } from "./ConfirmDialog";
import type { TableSelection } from "./DataTable";
import { useToast } from "./toast";
import { apiFetch } from "@/lib/useApi";

type BulkAction = "delete" | "restore" | "purge";

/**
 * Pilih banyak + aksi massal untuk tabel dengan tab Aktif/Sampah.
 *  - tab Aktif  : "Hapus ke Sampah"
 *  - tab Sampah : "Pulihkan" dan (bila canPurge) "Hapus Permanen"
 * Mengembalikan `selection` (untuk DataTable), `bar` (taruh di atas tabel),
 * `dialog` (taruh di mana saja), dan `purgeOne(id)` untuk tombol hapus permanen per baris.
 */
export function useBulkActions({
  entity,
  tab,
  rows,
  enabled,
  canPurge,
  onDone,
  noun = "data",
  purgeWarning,
}: {
  /** endpoint /api/bulk/{entity} */
  entity: "balita" | "pendampingan" | "pengukuran" | "desa" | "posyandu" | "users";
  tab: "aktif" | "sampah";
  /** baris yang sedang tampil (hasil filter) — aksi hanya untuk pilihan yang terlihat */
  rows: { id: number }[];
  enabled: boolean;
  canPurge: boolean;
  onDone: () => void;
  noun?: string;
  /** catatan tambahan di konfirmasi hapus permanen */
  purgeWarning?: string;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<{ action: BulkAction; ids: number[] } | null>(null);
  const [busy, setBusy] = useState(false);

  // pindah tab → kosongkan pilihan
  useEffect(() => {
    setSelected(new Set());
  }, [tab]);

  const visible = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const chosen = useMemo(() => Array.from(selected).filter((id) => visible.has(id)), [selected, visible]);

  async function run() {
    if (!pending) return;
    setBusy(true);
    const res = await apiFetch(`/api/bulk/${entity}`, {
      method: "POST",
      body: JSON.stringify(pending),
    });
    setBusy(false);
    setPending(null);
    if (res.ok) {
      toast(res.message || "Berhasil", "success");
      setSelected(new Set());
      onDone();
    } else {
      toast(res.message || `Gagal (HTTP ${res.status})`, "error");
    }
  }

  const n = pending?.ids.length ?? 0;
  const dialogText: Record<BulkAction, { title: string; message: string; label: string; danger: boolean }> = {
    delete: {
      title: "Pindahkan ke Sampah",
      message: `Pindahkan ${n} ${noun} ke Sampah? Data masih bisa dipulihkan dari tab Sampah.`,
      label: "Pindahkan ke Sampah",
      danger: true,
    },
    restore: {
      title: "Pulihkan Data",
      message: `Pulihkan ${n} ${noun} dari Sampah?`,
      label: "Pulihkan",
      danger: false,
    },
    purge: {
      title: "Hapus Permanen",
      message: `Hapus PERMANEN ${n} ${noun}? Data tidak bisa dikembalikan lagi.${purgeWarning ? ` ${purgeWarning}` : ""}`,
      label: "Hapus Permanen",
      danger: true,
    },
  };
  const d = pending ? dialogText[pending.action] : dialogText.delete;

  const selection: TableSelection | undefined = enabled
    ? { selected, onChange: setSelected }
    : undefined;

  const ask = (action: BulkAction) => setPending({ action, ids: chosen });

  const bar =
    enabled && chosen.length > 0 ? (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2 text-sm">
        <CheckSquare className="w-4 h-4 text-primary" />
        <span className="font-medium text-heading dark:text-slate-200">
          {chosen.length} {noun} dipilih
        </span>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <X className="w-3.5 h-3.5" /> Batal pilih
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          {tab === "aktif" ? (
            <Button variant="danger" className="py-1.5" onClick={() => ask("delete")}>
              <Trash2 className="w-4 h-4" /> Hapus ke Sampah
            </Button>
          ) : (
            <>
              <Button variant="success" className="py-1.5" onClick={() => ask("restore")}>
                <RotateCcw className="w-4 h-4" /> Pulihkan
              </Button>
              {canPurge && (
                <Button variant="danger" className="py-1.5" onClick={() => ask("purge")}>
                  <Trash2 className="w-4 h-4" /> Hapus Permanen
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    ) : null;

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onClose={() => !busy && setPending(null)}
      onConfirm={run}
      title={d.title}
      message={d.message}
      confirmLabel={d.label}
      danger={d.danger}
      loading={busy}
    />
  );

  return {
    selection,
    bar,
    dialog,
    /** hapus permanen satu baris (tombol per baris di tab Sampah) */
    purgeOne: (id: number) => setPending({ action: "purge", ids: [id] }),
  };
}
