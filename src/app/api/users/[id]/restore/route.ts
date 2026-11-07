import { NextRequest } from "next/server";
import { requireAuth, ok, bad, handle } from "@/lib/api";
import { bulkAction } from "@/modules/shared/bulk";
import { logAudit } from "@/modules/auth/service";

// Pulihkan 1 pengguna — cek username bentrok dengan akun aktif (logika sama dengan aksi massal)
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireAuth(["admin"]);
    const { id } = await params;
    const res = await bulkAction("users", "restore", [Number(id)], session);
    if (res.affected === 0)
      return bad(res.notes.length ? `Tidak bisa dipulihkan: ${res.notes.join("; ")}` : "Data tidak ditemukan di Sampah");
    await logAudit({ user: session, aksi: "Restore", modul: "Pengguna", detail: `Memulihkan pengguna #${id}` });
    return ok(null, "Data berhasil dipulihkan");
  });
}
