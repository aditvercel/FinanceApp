import { NextRequest, NextResponse } from "next/server";
import { CreateRecurringSchema } from "./contract";
import { getTemplates, createTemplate, checkMemberRole, isOwner } from "./repository";
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

    const memberRole = await checkMemberRole(reportId, auth);
    const owner = await isOwner(reportId, auth);
    if (!memberRole && !owner) {
      return NextResponse.json(err(403, "Access denied", requestId), { status: 403 });
    }

    const templates = await getTemplates(reportId);
    const data = templates.map((t) => ({
      id: t.id,
      reportId: t.report_id,
      createdBy: t.created_by,
      type: t.type,
      amount: t.amount,
      category: t.category,
      note: t.note,
      interval: t.interval,
      dayOfMonth: t.day_of_month,
      dayOfWeek: t.day_of_week,
      monthOfYear: t.month_of_year,
      startDate: t.start_date,
      nextRunDate: t.next_run_date,
      isActive: t.is_active,
      createdAt: t.created_at,
    }));

    return NextResponse.json(ok(data, "Recurring templates retrieved", requestId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
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
    const validated = CreateRecurringSchema.parse(body);

    if (validated.dayOfMonth && validated.dayOfMonth > 28) {
      return NextResponse.json(
        err(400, "dayOfMonth is capped at 28 to avoid February edge cases", requestId),
        { status: 400 }
      );
    }

    const memberRole = await checkMemberRole(validated.reportId, auth);
    const owner = await isOwner(validated.reportId, auth);
    const isEditor = memberRole === "editor";

    if (!owner && !isEditor) {
      return NextResponse.json(
        err(403, "Access denied. Only owner and editors can manage recurring templates.", requestId),
        { status: 403 }
      );
    }

    const template = await createTemplate(validated, auth);
    const data = {
      id: template.id,
      reportId: template.report_id,
      createdBy: template.created_by,
      type: template.type,
      amount: template.amount,
      category: template.category,
      note: template.note,
      interval: template.interval,
      dayOfMonth: template.day_of_month,
      dayOfWeek: template.day_of_week,
      monthOfYear: template.month_of_year,
      startDate: template.start_date,
      nextRunDate: template.next_run_date,
      isActive: template.is_active,
      createdAt: template.created_at,
    };

    return NextResponse.json(created(data, "Recurring template created", requestId));
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(err(400, "Validation error", requestId), { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}
