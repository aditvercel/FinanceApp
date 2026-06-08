import { NextRequest, NextResponse } from "next/server";
import { ReportsService } from "../../service";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const service = new ReportsService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "write");
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;

    const success = await service.requestEditor(id, auth);

    if (!success) {
      return NextResponse.json(
        err(403, "Only viewers can request editor access", requestId),
        { status: 403 }
      );
    }

    return NextResponse.json(ok(null, "Request sent to owner", requestId));
  } catch (e: any) {
    console.error(`[${requestId}] Request editor error:`, e);
    return NextResponse.json(
      err(500, "Failed to request editor access", requestId),
      { status: 500 }
    );
  }
}
