"use client";
import { useMemo, useState } from "react";
import { Loader2, Inbox, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Beri fungsi ini agar kolom bisa di-sort (klik header) */
  sortValue?: (row: T) => string | number | null | undefined;
};

/** Pilihan baris (checkbox). Baris diidentifikasi lewat properti `id`. */
export type TableSelection = {
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
};

const rowId = (row: unknown) => Number((row as { id: number }).id);

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
  title,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  title: string;
}) {
  return (
    <input
      type="checkbox"
      title={title}
      aria-label={title}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      className="w-4 h-4 accent-primary cursor-pointer align-middle"
    />
  );
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  empty = "Belum ada data",
  onRowClick,
  pageSize = 10,
  paginate = true,
  selection,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  paginate?: boolean;
  /** Aktifkan kolom checkbox untuk aksi massal */
  selection?: TableSelection;
}) {
  const [sortIdx, setSortIdx] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  function toggleSort(i: number) {
    if (!columns[i].sortValue) return;
    if (sortIdx === i) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortIdx(i);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    if (sortIdx == null || !columns[sortIdx]?.sortValue) return rows;
    const fn = columns[sortIdx].sortValue!;
    const arr = [...rows].sort((a, b) => {
      const va = fn(a) ?? "";
      const vb = fn(b) ?? "";
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb), "id", { numeric: true });
    });
    return sortDir === "asc" ? arr : arr.reverse();
  }, [rows, sortIdx, sortDir, columns]);

  const total = sorted.length;
  const totalPages = paginate ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const curPage = Math.min(page, totalPages);
  const pageRows = paginate ? sorted.slice((curPage - 1) * pageSize, curPage * pageSize) : sorted;
  const from = total === 0 ? 0 : (curPage - 1) * pageSize + 1;
  const to = Math.min(curPage * pageSize, total);

  // Checkbox header = pilih/lepas SEMUA baris hasil filter (lintas halaman)
  const allIds = selection ? sorted.map(rowId) : [];
  const nSel = selection ? allIds.filter((id) => selection.selected.has(id)).length : 0;
  const allChecked = allIds.length > 0 && nSel === allIds.length;
  function toggleAll() {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (allChecked) allIds.forEach((id) => next.delete(id));
    else allIds.forEach((id) => next.add(id));
    selection.onChange(next);
  }
  function toggleOne(id: number) {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  }
  const colCount = columns.length + (selection ? 1 : 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {selection && (
                <th className="w-10 pl-4 pr-1 py-3">
                  <HeaderCheckbox
                    checked={allChecked}
                    indeterminate={nSel > 0 && !allChecked}
                    onChange={toggleAll}
                    title={allChecked ? "Batalkan semua pilihan" : `Pilih semua (${allIds.length})`}
                  />
                </th>
              )}
              {columns.map((c, i) => (
                <th
                  key={i}
                  onClick={() => toggleSort(i)}
                  className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                    c.sortValue ? "cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" : ""
                  } ${c.className || ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortValue &&
                      (sortIdx === i ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="text-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Memuat data...
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="text-center py-12 text-slate-400">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {empty}
                </td>
              </tr>
            ) : (
              pageRows.map((row, ri) => {
                const id = selection ? rowId(row) : 0;
                const isSel = !!selection && selection.selected.has(id);
                return (
                <tr
                  key={ri}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-darkcard/60 ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${isSel ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                >
                  {selection && (
                    <td className="w-10 pl-4 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Pilih baris"
                        checked={isSel}
                        onChange={() => toggleOne(id)}
                        className="w-4 h-4 accent-primary cursor-pointer align-middle"
                      />
                    </td>
                  )}
                  {columns.map((c, ci) => (
                    <td key={ci} className={`px-4 py-3 dark:text-slate-200 ${c.className || ""}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paginate && !loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
          <span>
            Menampilkan {from}–{to} dari {total}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={curPage === 1}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-darkcard disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - curPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] h-8 px-2 rounded-md text-sm ${
                        p === curPage
                          ? "bg-primary text-white"
                          : "hover:bg-slate-100 dark:hover:bg-darkcard"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={curPage === totalPages}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-darkcard disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
