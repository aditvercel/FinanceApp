import { NextRequest, NextResponse } from "next/server";
import { CreateReportSchema } from "./contract";
import { ReportsService } from "./service";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";
import { ok, created, err } from "@/lib/types";

const service = new ReportsService();

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "read");
  if (rateLimit) return rateLimit;

  const reports = await service.list(auth);
  return NextResponse.json(ok(reports, "Reports retrieved", requestId));
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "write");
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const validated = CreateReportSchema.parse(body);

    const report = await service.create(
      { name: validated.name, currency: validated.currency },
      auth
    );

    if (!report) {
      return NextResponse.json(
        err(500, "Failed to create report", requestId),
        { status: 500 }
      );
    }

    return NextResponse.json(created(report, "Report created", requestId), {
      status: 201,
    });
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
