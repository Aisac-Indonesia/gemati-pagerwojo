"use client";
import { useRef, useState } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  exportExcel,
  exportCSV,
  exportPDF,
  downloadTemplate,
  parseImportFile,
  type ExportCol,
  type ImportField,
} from "@/lib/exporter";
import { apiFetch } from "@/lib/useApi";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ImportConfig = {
  entity: string; // endpoint: /api/{entity}/import
  fields: ImportField[];
  onDone?: () => void;
};

function Menu({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: any;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-darkcard transition"
      >
        <Icon className="w-4 h-4" /> {label} <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-52 rounded-lg bg-white dark:bg-darkcard border border-slate-200 dark:border-slate-700 shadow-lg py-1 animate-fade">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Item({
  icon: Icon,
  onClick,
  children,
}: {
  icon: any;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
    >
      <Icon className="w-4 h-4 text-slate-400" /> {children}
    </button>
  );
}

export function DataToolbar({
  rows,
  columns,
  filename,
  title,
  importConfig,
}: {
  rows: any[];
  columns: ExportCol[];
  filename: string;
  title?: string;
  importConfig?: ImportConfig;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !importConfig) return;
    setImporting(true);
    try {
      const parsed = await parseImportFile(file, importConfig.fields);
      if (parsed.length === 0) {
        toast("File kosong / tidak ada baris data", "error");
        return;
      }
      const res = await apiFetch(`/api/${importConfig.entity}/import`, {
        method: "POST",
        body: JSON.stringify({ rows: parsed }),
      });
      if (!res.ok) {
        // Tanpa pesan JSON = biasanya server/proxy timeout atau halaman error HTML → tampilkan kode HTTP
        toast(res.message || `Import gagal (HTTP ${res.status || "tanpa respons"})`, "error");
        return;
      }
      const d: any = res.data || {};
      const inserted = d.inserted ?? 0;
      const failed = d.failed ?? 0;
      if (failed > 0) {
        const first = d.errors?.[0];
        toast(
          `${inserted} baris masuk, ${failed} gagal${first ? ` — baris ${first.row}: ${first.message}` : ""}`,
          failed && !inserted ? "error" : "info"
        );
      } else {
        toast(`${inserted} baris berhasil diimport`, "success");
      }
      importConfig.onDone?.();
    } catch (err: any) {
      toast(err?.message || "Gagal membaca file", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {importConfig && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-darkcard transition disabled:opacity-60"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import
          </button>
          <Menu label="Template" icon={FileDown}>
            {(close) => (
              <>
                <Item icon={FileSpreadsheet} onClick={() => { downloadTemplate(importConfig.fields, importConfig.entity, "xlsx"); close(); }}>
                  Template Excel (.xlsx)
                </Item>
                <Item icon={FileText} onClick={() => { downloadTemplate(importConfig.fields, importConfig.entity, "csv"); close(); }}>
                  Template CSV (.csv)
                </Item>
              </>
            )}
          </Menu>
        </>
      )}

      <Menu label="Export" icon={Download}>
        {(close) => (
          <>
            <Item icon={FileSpreadsheet} onClick={() => { exportExcel(rows, columns, filename); close(); }}>
              Export Excel (.xlsx)
            </Item>
            <Item icon={FileDown} onClick={() => { exportPDF(rows, columns, filename, title); close(); }}>
              Export PDF (.pdf)
            </Item>
            <Item icon={FileText} onClick={() => { exportCSV(rows, columns, filename); close(); }}>
              Export CSV (.csv)
            </Item>
          </>
        )}
      </Menu>
    </div>
  );
}
