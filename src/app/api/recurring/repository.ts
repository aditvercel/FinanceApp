import { supabase } from "@/lib/supabase";
import type { CreateRecurring } from "./contract";

export type TemplateRow = {
  id: string;
  report_id: string;
  created_by: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string | null;
  interval: "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  day_of_week: number | null;
  month_of_year: number | null;
  start_date: string;
  next_run_date: string;
  is_active: boolean;
  created_at: string;
};

export async function getTemplates(reportId: string): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("report_id", reportId)
    .order("next_run_date");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function recalcNextRunDate(data: {
  startDate: string;
  interval: "weekly" | "monthly" | "yearly";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
}): string {
  const start = new Date(data.startDate + "T00:00:00");
  const now = new Date();
  let candidate = new Date(start);

  now.setHours(23, 59, 59, 999);

  if (candidate > now) {
    return formatDate(candidate);
  }

  while (candidate <= now) {
    switch (data.interval) {
      case "weekly": {
        const targetDay = data.dayOfWeek ?? start.getDay();
        const daysUntilTarget = (targetDay - candidate.getDay() + 7) % 7 || 7;
        candidate.setDate(candidate.getDate() + daysUntilTarget);
        break;
      }
      case "monthly": {
        const day = data.dayOfMonth ?? Math.min(start.getDate(), 28);
        candidate.setMonth(candidate.getMonth() + 1);
        candidate.setDate(day);
        break;
      }
      case "yearly": {
        const month = data.monthOfYear ?? start.getMonth() + 1;
        const day = data.dayOfMonth ?? Math.min(start.getDate(), 28);
        candidate.setFullYear(candidate.getFullYear() + 1);
        candidate.setMonth(month - 1);
        candidate.setDate(day);
        break;
      }
    }
  }

  return formatDate(candidate);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function createTemplate(
  data: CreateRecurring,
  userId: string
): Promise<TemplateRow> {
  const nextRunDate = recalcNextRunDate(data);

  const { data: row, error } = await supabase
    .from("recurring_templates")
    .insert({
      report_id: data.reportId,
      created_by: userId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      note: data.note ?? null,
      interval: data.interval,
      day_of_month: data.dayOfMonth ?? null,
      day_of_week: data.dayOfWeek ?? null,
      month_of_year: data.monthOfYear ?? null,
      start_date: data.startDate,
      next_run_date: nextRunDate,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row;
}

export async function getTemplateById(id: string): Promise<TemplateRow | null> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTemplate(
  id: string,
  data: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from("recurring_templates")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_templates")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function getDueTemplates(): Promise<TemplateRow[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_date", today);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function checkMemberRole(
  reportId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("report_members")
    .select("role")
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data?.role ?? null;
}

export async function isOwner(
  reportId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

export async function getTemplatesDueTomorrow(): Promise<TemplateRow[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("is_active", true)
    .eq("next_run_date", tomorrowStr);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertEntry(
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

export async function insertSnapshot(
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

export async function logRecurringRun(
  templateId: string,
  entryId: string | null,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase.from("recurring_runs").insert({
    template_id: templateId,
    entry_id: entryId,
    run_date: new Date().toISOString().split("T")[0],
    status,
    error: errorMessage ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function insertNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  actionUrl: string | null
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    action_url: actionUrl,
  });

  if (error) throw new Error(error.message);
}

export async function getReportOwnerAndEditors(
  reportId: string
): Promise<string[]> {
  const { data: members, error: memberError } = await supabase
    .from("report_members")
    .select("user_id")
    .eq("report_id", reportId)
    .in("role", ["owner", "editor"]);

  if (memberError) throw new Error(memberError.message);

  const { data: owner, error: ownerError } = await supabase
    .from("reports")
    .select("owner_id")
    .eq("id", reportId)
    .single();

  if (ownerError && ownerError.code !== "PGRST116") throw new Error(ownerError.message);

  const ids = members?.map((r) => r.user_id) ?? [];
  if (owner && !ids.includes(owner.owner_id)) {
    ids.push(owner.owner_id);
  }
  return ids;
}
