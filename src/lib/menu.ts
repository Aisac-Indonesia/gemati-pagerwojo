import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Baby,
  Users,
  ShieldCheck,
  User,
  ScrollText,
  FileText,
  Settings,
  CircleCheck,
  Egg,
  Ruler,
  BarChart3,
  History,
  Server,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = { label: string; href: string; icon: LucideIcon };
export type Role = "admin" | "ppkbd" | "kader";

export const MENU: Record<Role, MenuItem[]> = {
  admin: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Rekapitulasi", href: "/rekapitulasi", icon: ClipboardList },
    { label: "Data Desa", href: "/desa", icon: Building2 },
    { label: "Data Posyandu", href: "/posyandu", icon: HeartPulse },
    { label: "Data Balita", href: "/balita", icon: Baby },
    { label: "Data Kader", href: "/kader", icon: Users },
    { label: "Data PPKBD", href: "/ppkbd", icon: ShieldCheck },
    { label: "Manajemen Pengguna", href: "/users", icon: User },
    { label: "Audit Log", href: "/audit", icon: ScrollText },
    { label: "Laporan", href: "/laporan", icon: FileText },
    { label: "Pengaturan", href: "/pengaturan", icon: Settings },
    { label: "Deployment & DB", href: "/deployment", icon: Server },
  ],
  ppkbd: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Validasi", href: "/validasi", icon: CircleCheck },
    { label: "Data Balita", href: "/balita", icon: Baby },
    { label: "Data Pendampingan", href: "/pendampingan-data", icon: Egg },
    { label: "Statistik Desa", href: "/statistik", icon: BarChart3 },
    { label: "Laporan", href: "/laporan", icon: FileText },
    { label: "Profil", href: "/profil", icon: User },
  ],
  kader: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Data Balita", href: "/balita", icon: Baby },
    { label: "Pendampingan", href: "/pendampingan", icon: Egg },
    { label: "Pengukuran", href: "/pengukuran", icon: Ruler },
    { label: "Riwayat", href: "/riwayat", icon: History },
    { label: "Profil", href: "/profil", icon: User },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin Kecamatan",
  ppkbd: "Petugas KB Desa",
  kader: "Kader Pendamping Keluarga",
};

export const ROLE_BADGE: Record<Role, string> = {
  admin: "Admin",
  ppkbd: "PPKBD",
  kader: "KPK",
};

/** Route yang diizinkan per role (untuk guard) */
export function isRouteAllowed(role: Role, path: string): boolean {
  const allowed = MENU[role].map((m) => m.href);
  // izinkan sub-route (mis. /balita/123, /pendampingan/baru)
  return allowed.some((h) => path === h || path.startsWith(h + "/"));
}
