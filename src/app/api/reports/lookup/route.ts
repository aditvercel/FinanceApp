import { NextRequest, NextResponse } from "next/server";
import { LookupQuerySchema } from "../contract";
import { ReportsService } from "../service";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const service = new ReportsService();

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "join");
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const validated = LookupQuerySchema.parse(raw);

    const preview = await service.lookup(validated.reportId);

    if (!preview) {
      return NextResponse.json(
        err(404, "No report found with that code. Check with the person who shared it.", requestId),
        { status: 404 }
      );
    }

    return NextResponse.json(ok(preview, "Report found", requestId));
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json(
        err(400, "Invalid report code", requestId),
        { status: 400 }
      );
    }
    console.error(`[${requestId}] Lookup error:`, e);
    return NextResponse.json(
      err(500, "Failed to look up report", requestId),
      { status: 500 }
    );
  }
}
