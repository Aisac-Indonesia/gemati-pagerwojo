import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handle } from "@/lib/api";
import { buildSheetsSnapshot } from "@/modules/sync/sheets";

export const dynamic = "force-dynamic";

/** Bandingkan token tanpa bocor lewat timing */
function tokenOk(given: string, expected: string) {
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * GET /api/sync/sheets — snapshot data untuk Google Spreadsheet (BACA SAJA, satu arah).
 * Auth: header "Authorization: Bearer <SHEETS_SYNC_TOKEN>". Endpoint mati bila env token kosong.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const expected = process.env.SHEETS_SYNC_TOKEN || "";
    if (expected.length < 24) {
      return NextResponse.json({ message: "Sync spreadsheet belum diaktifkan" }, { status: 404 });
    }
    const auth = req.headers.get("authorization") || "";
    const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!given || !tokenOk(given, expected)) {
      return NextResponse.json({ message: "Token tidak valid" }, { status: 401 });
    }
    const data = await buildSheetsSnapshot();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  });
}
