import { NextRequest } from "next/server";
import { requireAuth, ok, bad, handle } from "@/lib/api";
import { importBalita } from "@/modules/balita/service";
import { logAudit } from "@/modules/auth/service";

// POST /api/balita/import — import massal dari Excel/CSV (body: { rows: [...] })
// admin: desa dari kolom "Desa"; ppkbd & kader: dikunci ke desa akunnya (lihat importBalita).
export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireAuth(["admin", "ppkbd", "kader"]);
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) return bad("Format tidak valid");
    const result = await importBalita(body.rows, session);
    await logAudit({
      user: session,
      aksi: "Import Data",
      modul: "Balita",
      detail: `Import ${result.inserted} balita (${result.failed} gagal)`,
    });
    return ok(result, `${result.inserted} baris diimport, ${result.failed} gagal`);
  });
}
