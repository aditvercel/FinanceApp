import { NextRequest, NextResponse } from "next/server";
import { InsightsService } from "./service";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const insightsService = new InsightsService();

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimitResponse = requireRateLimit(request, userId, "insights");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json(
      err(400, "reportId is required", requestId),
      { status: 400 }
    );
  }

  try {
    const insights = await insightsService.generate(reportId, userId, requestId);

    return NextResponse.json(
      ok(insights, "Insights retrieved", requestId)
    );
  } catch (error) {
    console.error(`[${requestId}] Insights error:`, error);
    return NextResponse.json(
      err(500, "Failed to generate insights", requestId),
      { status: 500 }
    );
  }
}
