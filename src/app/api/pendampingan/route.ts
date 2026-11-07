import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, ok, created, bad, handle } from "@/lib/api";
import { parseListParams } from "@/lib/query";
import { listPendampingan, createPendampingan } from "@/modules/pendampingan/service";
import { logAudit } from "@/modules/auth/service";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireAuth();
    const url = new URL(req.url);
    const p = parseListParams(url);
    const balitaParam = url.searchParams.get("balita_id");
    const res = await listPendampingan({
      role: session.role,
      desa_id: session.desa_id,
      kader_id: session.id,
      balita_id: balitaParam ? Number(balitaParam) : undefined,
      search: p.search,
      trashed: p.trashed,
      page: p.page!,
      pageSize: p.pageSize!,
    });
    return ok(res);
  });
}

const schema = z.object({
  balita_id: z.number(),
  tanggal: z.string().min(1),
  jam: z.string().nullable().optional(),
  makan_telur: z.boolean(),
  jumlah_butir: z.number().nullable().optional(),
  sasaran_genting: z.boolean().optional(),
  bantuan_genting: z.string().nullable().optional(),
  nama_ota: z.string().nullable().optional(),
  nama_pendamping: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional(),
  foto_dokumentasi: z.string().nullable().optional(),
  lokasi_lat: z.number().nullable().optional(),
  lokasi_lng: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireAuth(["kader", "admin"]);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return bad("Data tidak valid");
    if (parsed.data.sasaran_genting && !parsed.data.bantuan_genting?.trim())
      return bad("Bantuan GENTING wajib diisi bila sasaran GENTING = Ya");
    try {
      const namaPendamping = parsed.data.nama_pendamping?.trim() || session.nama;
      const row = await createPendampingan(parsed.data, session.id, namaPendamping);
      await logAudit({
        user: session,
        aksi: "Tambah Data",
        modul: "Pendampingan",
        detail: `Menambah pendampingan balita #${parsed.data.balita_id}`,
      });
      return created(row);
    } catch (e) {
      return bad((e as Error).message);
    }
  });
}
