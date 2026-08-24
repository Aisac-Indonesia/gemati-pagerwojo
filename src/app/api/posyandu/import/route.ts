import { NextRequest } from "next/server";
import { requireAuth, ok, bad, handle } from "@/lib/api";
import { importPosyandu } from "@/modules/posyandu/service";
import { logAudit } from "@/modules/auth/service";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireAuth(["admin"]);
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) return bad("Format tidak valid");
    const result = await importPosyandu(body.rows);
    await logAudit({ user: session, aksi: "Import Data", modul: "Posyandu", detail: `Import ${result.inserted} posyandu (${result.failed} gagal)` });
    return ok(result, `${result.inserted} baris diimport, ${result.failed} gagal`);
  });
}
