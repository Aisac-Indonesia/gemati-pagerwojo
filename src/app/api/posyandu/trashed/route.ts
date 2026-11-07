import { NextRequest } from "next/server";
import { requireAuth, ok, handle } from "@/lib/api";
import { parseListParams } from "@/lib/query";
import { listPosyandu } from "@/modules/posyandu/service";

// GET /api/posyandu/trashed — daftar posyandu terhapus (soft delete)
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAuth(["admin"]);
    const p = parseListParams(new URL(req.url));
    return ok(await listPosyandu({ ...p, trashed: true, page: p.page!, pageSize: p.pageSize! }));
  });
}
