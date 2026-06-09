import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTemplateById, updateTemplate, deleteTemplate, recalcNextRunDate } from "../repository";
import { getRequestId, requireAuth } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const UpdateRecurringSchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  amount: z.number().positive().max(999999999).optional(),
  category: z.string().min(1).max(50).optional(),
  note: z.string().max(500).optional(),
  interval: z.enum(["weekly", "monthly", "yearly"]).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  startDate: z.string().date().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateRecurringSchema.parse(body);

    const dbData: Record<string, any> = {};
    if (validated.type !== undefined) dbData.type = validated.type;
    if (validated.amount !== undefined) dbData.amount = validated.amount;
    if (validated.category !== undefined) dbData.category = validated.category;
    if (validated.note !== undefined) dbData.note = validated.note;
    if (validated.interval !== undefined) dbData.interval = validated.interval;
    if (validated.dayOfMonth !== undefined) dbData.day_of_month = validated.dayOfMonth;
    if (validated.dayOfWeek !== undefined) dbData.day_of_week = validated.dayOfWeek;
    if (validated.monthOfYear !== undefined) dbData.month_of_year = validated.monthOfYear;
    if (validated.startDate !== undefined) dbData.start_date = validated.startDate;
    if (validated.isActive !== undefined) dbData.is_active = validated.isActive;

    const schedulingChanged =
      validated.startDate !== undefined ||
      validated.interval !== undefined ||
      validated.dayOfWeek !== undefined ||
      validated.dayOfMonth !== undefined ||
      validated.monthOfYear !== undefined;

    if (schedulingChanged) {
      const existing = await getTemplateById(id);
      if (!existing) {
        return NextResponse.json(err(404, "Template not found", requestId), { status: 404 });
      }

      const merged = {
        startDate: validated.startDate ?? existing.start_date,
        interval: validated.interval ?? existing.interval,
        dayOfWeek: validated.dayOfWeek ?? existing.day_of_week,
        dayOfMonth: validated.dayOfMonth ?? existing.day_of_month,
        monthOfYear: validated.monthOfYear ?? existing.month_of_year,
      };

      dbData.next_run_date = recalcNextRunDate(merged);
    }

    await updateTemplate(id, dbData);

    const result: Record<string, any> = { id, ...dbData };
    if (result.start_date) { result.startDate = result.start_date; delete result.start_date; }
    if (result.next_run_date) { result.nextRunDate = result.next_run_date; delete result.next_run_date; }
    if (result.day_of_month) { result.dayOfMonth = result.day_of_month; delete result.day_of_month; }
    if (result.day_of_week) { result.dayOfWeek = result.day_of_week; delete result.day_of_week; }
    if (result.month_of_year) { result.monthOfYear = result.month_of_year; delete result.month_of_year; }
    if (result.is_active !== undefined) { result.isActive = result.is_active; delete result.is_active; }

    return NextResponse.json(ok(result, "Recurring template updated", requestId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(err(400, "Validation error", requestId), { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await deleteTemplate(id);
    return NextResponse.json(ok(null, "Recurring template deleted", requestId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}
