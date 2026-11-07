"use client";
import { cn } from "@/lib/utils";
import { Search, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* ---------- IconAction (tombol aksi baris berbentuk ikon) ---------- */
export function IconAction({
  icon: Icon,
  title,
  onClick,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  tone?: "default" | "primary" | "danger" | "warning" | "success";
}) {
  const c = {
    default: "text-slate-500 hover:bg-slate-100 dark:hover:bg-darkcard dark:text-slate-400",
    primary: "text-primary hover:bg-primary/10",
    danger: "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40",
    warning: "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40",
    success: "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40",
  }[tone];
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn("p-1.5 rounded-md transition", c)}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/* ---------- RowActions (wadah tombol aksi) ---------- */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

/* ---------- Button ---------- */
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "danger" | "ghost" | "success";
}) {
  const styles = {
    primary: "bg-primary hover:bg-primary-dark text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    outline:
      "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-darkcard",
    ghost: "text-slate-600 hover:bg-slate-100 dark:hover:bg-darkcard",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60",
        styles,
        className
      )}
      {...props}
    />
  );
}

/* ---------- Field / Input / Select / Textarea ---------- */
export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const inputBase =
  "w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-darkcard text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputBase, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "min-h-[80px]", props.className)} />;
}

/* ---------- SearchBar ---------- */
export function SearchBar({
  value,
  onChange,
  placeholder = "Cari...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, "pl-10")}
      />
    </div>
  );
}

/* ---------- Badge ---------- */
const badgeStyles: Record<string, string> = {
  aktif: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  disetujui: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  menunggu: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  nonaktif: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  ditolak: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  ppkbd: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  kpk: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  kader: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  genting: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const LABEL_VALIDASI: Record<string, string> = {
  menunggu: "Menunggu Validasi",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        badgeStyles[tone] || badgeStyles.default
      )}
    >
      {children}
    </span>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = "#2e7d32",
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-darkcard rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase text-slate-500 font-medium tracking-wide">
              {label}
            </div>
            <div className="text-3xl font-bold mt-1 text-heading dark:text-white">
              {value}
            </div>
          </div>
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Icon className="w-5 h-5 text-slate-400" />
            </div>
          )}
        </div>
      </div>
      <div className="h-1" style={{ background: color }} />
    </div>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-white">{title}</h1>
        {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Card wrapper ---------- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-white dark:bg-darkcard rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm", className)}>
      {children}
    </div>
  );
}
