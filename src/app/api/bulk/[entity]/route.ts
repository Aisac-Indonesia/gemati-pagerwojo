import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, ok, bad, handle } from "@/lib/api";
import { logAudit } from "@/modules/auth/service";
import {
  bulkAction,
  bulkModul,
  BULK_ACTIONS,
  BULK_ENTITIES,
  type BulkEntity,
} from "@/modules/shared/bulk";

type Ctx = { params: Promise<{ entity: string }> };

const schema = z.object({
  action: z.enum(BULK_ACTIONS),
  ids: z.array(z.number().int().positive()).min(1).max(1000),
});

const LABEL = {
  delete: { aksi: "Hapus Massal", done: "dipindahkan ke sampah" },
  restore: { aksi: "Pulihkan Massal", done: "dipulihkan" },
  purge: { aksi: "Hapus Permanen", done: "dihapus permanen" },
} as const;

// POST /api/bulk/:entity — body { action: "delete" | "restore" | "purge", ids: number[] }
export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth();
    const { entity } = await params;
    if (!BULK_ENTITIES.includes(entity as BulkEntity)) return bad("Entitas tidak valid");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Data tidak valid");

    const { action, ids } = parsed.data;
    const res = await bulkAction(entity as BulkEntity, action, ids, session);

    if (res.affected > 0) {
      await logAudit({
        user: session,
        aksi: LABEL[action].aksi,
        modul: bulkModul(entity as BulkEntity),
        detail: `${LABEL[action].aksi} ${res.affected} data ${entity}`,
      });
    }

    let msg = `${res.affected} data ${LABEL[action].done}`;
    if (res.skipped > 0) {
      msg += ` · ${res.skipped} dilewati`;
      if (res.notes.length) msg += ` (${res.notes.join("; ")})`;
    }
    return ok(res, msg);
  });
}
