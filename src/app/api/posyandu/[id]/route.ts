import { NextRequest } from "next/server";
import { requireAuth, ok, bad, notFound, handle } from "@/lib/api";
import { getPosyandu, updatePosyandu, softDeletePosyandu } from "@/modules/posyandu/service";
import { logAudit } from "@/modules/auth/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireAuth(["admin"]);
    const { id } = await params;
    const row = await getPosyandu(Number(id));
    if (!row) return notFound("Posyandu tidak ditemukan");
    return ok(row);
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth(["admin"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    try {
      const row = await updatePosyandu(Number(id), body);
      await logAudit({ user: session, aksi: "Edit", modul: "Posyandu", detail: `Mengubah posyandu #${id}` });
      return ok(row, "Data berhasil diperbarui");
    } catch (e) {
      return bad((e as Error).message);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth(["admin"]);
    const { id } = await params;
    await softDeletePosyandu(Number(id));
    await logAudit({ user: session, aksi: "Hapus", modul: "Posyandu", detail: `Menghapus posyandu #${id}` });
    return ok(null, "Data berhasil dihapus");
  });
}
