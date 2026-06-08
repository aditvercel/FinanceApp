import { NextRequest, NextResponse } from "next/server";
import { JoinReportSchema } from "../contract";
import { ReportsService } from "../service";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const service = new ReportsService();

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "join");
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const validated = JoinReportSchema.parse(body);

    const report = await service.join(validated.reportId, auth);

    if (!report) {
      return NextResponse.json(
        err(404, "No report found with that code. Check with the person who shared it.", requestId),
        { status: 404 }
      );
    }

    return NextResponse.json(ok(report, "Report joined", requestId));
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json(
        err(400, "Validation error", requestId),
        { status: 400 }
      );
    }
    return NextResponse.json(
      err(400, "Invalid request", requestId),
      { status: 400 }
    );
  }
}
