import { NextRequest } from "next/server";
import { requireAuth, ok, bad, notFound, handle } from "@/lib/api";
import {
  getPendampingan,
  updatePendampingan,
  softDeletePendampingan,
} from "@/modules/pendampingan/service";
import { logAudit } from "@/modules/auth/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await requireAuth();
    const { id } = await params;
    const row = await getPendampingan(Number(id));
    if (!row) return notFound("Pendampingan tidak ditemukan");
    return ok(row);
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth(["kader", "admin"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (body?.sasaran_genting === true && !String(body.bantuan_genting ?? "").trim())
      return bad("Bantuan GENTING wajib diisi bila sasaran GENTING = Ya");
    try {
      const row = await updatePendampingan(Number(id), body);
      await logAudit({
        user: session,
        aksi: "Edit",
        modul: "Pendampingan",
        detail: `Mengubah pendampingan #${id}`,
      });
      return ok(row, "Data berhasil diperbarui");
    } catch (e) {
      return bad((e as Error).message);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth(["kader", "admin"]);
    const { id } = await params;
    await softDeletePendampingan(Number(id));
    await logAudit({
      user: session,
      aksi: "Hapus",
      modul: "Pendampingan",
      detail: `Menghapus pendampingan #${id}`,
    });
    return ok(null, "Data berhasil dihapus");
  });
}
