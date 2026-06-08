import { NextRequest, NextResponse } from "next/server";
import { UpsertBudgetSchema } from "./contract";
import { listBudgets, upsertBudgetEntry } from "./service";
import { ok, created, err } from "@/lib/types";
import { getRequestId, requireAuth, requireRateLimit } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "read");
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json(err(400, "reportId query parameter is required", requestId), { status: 400 });
    }

    const budgets = await listBudgets(reportId, auth);
    return NextResponse.json(ok(budgets, "Budgets retrieved", requestId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Access denied" ? 403 : 500;
    return NextResponse.json(err(status, message, requestId), { status });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "write");
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const validated = UpsertBudgetSchema.parse(body);
    const result = await upsertBudgetEntry(validated, auth, requestId);
    return NextResponse.json(created(result, "Budget saved", requestId));
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(err(400, "Validation error", requestId), { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Access denied") ? 403 : 500;
    return NextResponse.json(err(status, message, requestId), { status });
  }
}
