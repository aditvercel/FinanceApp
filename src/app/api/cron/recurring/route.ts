import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getDueTemplates,
  getTemplatesDueTomorrow,
  updateTemplate,
  logRecurringRun,
  insertNotification,
  getReportOwnerAndEditors,
} from "../../recurring/repository";
import type { TemplateRow } from "../../recurring/repository";

function computeNextDate(template: TemplateRow): string {
  const date = new Date(template.next_run_date);

  switch (template.interval) {
    case "weekly": {
      date.setDate(date.getDate() + 7);
      if (template.day_of_week !== null && template.day_of_week !== undefined) {
        date.setDate(date.getDate() - date.getDay() + template.day_of_week);
      }
      break;
    }
    case "monthly": {
      date.setMonth(date.getMonth() + 1);
      const day = template.day_of_month ?? Math.min(date.getDate(), 28);
      date.setDate(day);
      break;
    }
    case "yearly": {
      date.setFullYear(date.getFullYear() + 1);
      if (template.month_of_year !== null && template.month_of_year !== undefined) {
        date.setMonth(template.month_of_year - 1);
      }
      const day = template.day_of_month ?? Math.min(date.getDate(), 28);
      date.setDate(day);
      break;
    }
  }

  return date.toISOString().split("T")[0];
}

async function insertEntry(
  entryId: string,
  reportId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from("entries").insert({
    id: entryId,
    report_id: reportId,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}

async function insertSnapshot(
  entryId: string,
  userId: string,
  type: "income" | "expense",
  amount: number,
  category: string,
  note: string | null,
  entryDate: string
): Promise<void> {
  const { error } = await supabase.from("entry_snapshots").insert({
    entry_id: entryId,
    version: 1,
    changed_by: userId,
    action: "recurring",
    type,
    amount,
    category,
    note,
    entry_date: entryDate,
    is_current: true,
  });
  if (error) throw new Error(error.message);
}

async function processDueTemplates(): Promise<{ processed: number; errors: string[] }> {
  const templates = await getDueTemplates();
  const errors: string[] = [];
  let processed = 0;

  for (const template of templates) {
    try {
      const entryId = crypto.randomUUID();
      const today = new Date().toISOString().split("T")[0];

      await insertEntry(entryId, template.report_id, template.created_by);
      await insertSnapshot(
        entryId,
        template.created_by,
        template.type,
        template.amount,
        template.category,
        template.note,
        today
      );
      await logRecurringRun(template.id, entryId, "success");

      const nextDate = computeNextDate(template);
      await updateTemplate(template.id, { next_run_date: nextDate });

      const recipients = await getReportOwnerAndEditors(template.report_id);
      for (const uid of recipients) {
        await insertNotification(
          uid,
          "recurring.generated",
          `${template.category} entry generated`,
          `A recurring ${template.type} of ${template.amount.toLocaleString()} IDR for ${template.category} was auto-created.`,
          `/reports/${template.report_id}`
        );
      }

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Template ${template.id}: ${message}`);
      await logRecurringRun(template.id, null, "error", message).catch(() => {});
    }
  }

  return { processed, errors };
}

async function sendTomorrowReminders(): Promise<number> {
  const templates = await getTemplatesDueTomorrow();
  let sent = 0;

  for (const template of templates) {
    try {
      const recipients = await getReportOwnerAndEditors(template.report_id);
      for (const uid of recipients) {
        await insertNotification(
          uid,
          "recurring.reminder",
          "Bill due tomorrow",
          `${template.category} · ${template.note ?? "No description"} · Rp ${template.amount.toLocaleString()} — scheduled for ${template.next_run_date}.`,
          `/reports/${template.report_id}/recurring/${template.id}`
        );
      }
      sent++;
    } catch {
      // Skip failing reminders
    }
  }

  return sent;
}

async function resetAlertStates(): Promise<void> {
  const now = new Date();
  const isFirstWeek = now.getDate() <= 7;

  if (isFirstWeek) {
    const { error } = await supabase
      .from("budget_alert_state")
      .update({ resolved_at: now.toISOString() })
      .is("resolved_at", null);

    if (error) throw new Error(error.message);
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("x-vercel-cron") ?? request.headers.get("CRON_SECRET");

  if (!cronSecret) {
    return NextResponse.json(
      { status: 401, message: "Unauthorized — CRON_SECRET required", refId: crypto.randomUUID(), data: null },
      { status: 401 }
    );
  }

  try {
    const { processed, errors } = await processDueTemplates();
    const reminderCount = await sendTomorrowReminders();

    try {
      await resetAlertStates();
    } catch {
      // Alert state reset is best-effort
    }

    const data: Record<string, unknown> = {
      processed,
      remindersSent: reminderCount,
    };

    if (errors.length > 0) {
      data.errors = errors;
    }

    return NextResponse.json({
      status: 200,
      message: `Cron completed: ${processed} entries generated, ${reminderCount} reminders sent`,
      refId: crypto.randomUUID(),
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json(
      { status: 500, message, refId: crypto.randomUUID(), data: null },
      { status: 500 }
    );
  }
}
