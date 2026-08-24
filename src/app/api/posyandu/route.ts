import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, ok, created, bad, handle } from "@/lib/api";
import { parseListParams } from "@/lib/query";
import { listPosyandu, createPosyandu } from "@/modules/posyandu/service";
import { logAudit } from "@/modules/auth/service";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAuth();
    const p = parseListParams(new URL(req.url));
    return ok(await listPosyandu({ ...p, page: p.page!, pageSize: p.pageSize! }));
  });
}

const schema = z.object({ nama: z.string().min(1), desa_id: z.coerce.number() });

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireAuth(["admin"]);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Nama & desa wajib diisi");
    try {
      const row = await createPosyandu(parsed.data);
      await logAudit({ user: session, aksi: "Tambah Data", modul: "Posyandu", detail: `Menambah posyandu ${parsed.data.nama}` });
      return created(row);
    } catch (e) {
      return bad((e as Error).message);
    }
  });
}
