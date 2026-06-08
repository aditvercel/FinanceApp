import { supabase } from "@/lib/supabase";

export type BudgetRow = {
  id: string;
  report_id: string;
  category: string;
  amount: number;
  period: string;
  created_by: string;
  created_at: string;
};

export async function getBudgets(reportId: string): Promise<BudgetRow[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("report_id", reportId)
    .order("category");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertBudget(
  reportId: string,
  category: string,
  amount: number,
  userId: string
): Promise<BudgetRow> {
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        report_id: reportId,
        category,
        amount,
        created_by: userId,
      },
      { onConflict: "report_id, category" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCategorySpending(
  reportId: string,
  category: string
): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("entry_snapshots")
    .select("amount")
    .eq("is_current", true)
    .eq("type", "expense")
    .eq("category", category)
    .gte("entry_date", monthStart);

  if (error) throw new Error(error.message);

  const total = (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return total;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

export async function writeAlertState(
  reportId: string,
  category: string,
  threshold: string
): Promise<boolean> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("budget_alert_state")
    .select("id")
    .eq("report_id", reportId)
    .eq("category", category)
    .eq("threshold", threshold)
    .is("resolved_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) return false;

  const { error: insertError } = await supabase
    .from("budget_alert_state")
    .insert({
      report_id: reportId,
      category,
      threshold,
      alerted_at: now,
    });

  if (insertError) throw new Error(insertError.message);
  return true;
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
