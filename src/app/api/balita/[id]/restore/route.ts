import { NextRequest } from "next/server";
import { requireAuth, ok, bad, handle } from "@/lib/api";
import { bulkAction } from "@/modules/shared/bulk";
import { logAudit } from "@/modules/auth/service";

type Ctx = { params: Promise<{ id: string }> };

// Pulihkan 1 balita — lewat logika yang sama dengan aksi massal (cakupan role + cek NIK bentrok)
export async function PATCH(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth(["admin", "ppkbd", "kader"]);
    const { id } = await params;
    const res = await bulkAction("balita", "restore", [Number(id)], session);
    if (res.affected === 0)
      return bad(res.notes.length ? `Tidak bisa dipulihkan: ${res.notes.join("; ")}` : "Data tidak ditemukan di Sampah");
    await logAudit({ user: session, aksi: "Edit", modul: "Balita", detail: `Memulihkan balita #${id}` });
    return ok(null, "Data berhasil dipulihkan");
  });
}
