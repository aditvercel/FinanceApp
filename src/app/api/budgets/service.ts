import { supabase } from "@/lib/supabase";
import {
  getBudgets,
  upsertBudget,
  getCategorySpending,
  checkMemberRole,
  isOwner,
  writeAlertState,
  insertNotification,
  getReportOwnerAndEditors,
  BudgetRow,
} from "./repository";
import type { UpsertBudget, BudgetWithUsage } from "./contract";

function computeStatus(percentage: number): "ok" | "warning" | "exceeded" {
  if (percentage >= 100) return "exceeded";
  if (percentage >= 80) return "warning";
  return "ok";
}

export async function listBudgets(
  reportId: string,
  userId: string
): Promise<BudgetWithUsage[]> {
  const memberRole = await checkMemberRole(reportId, userId);
  const owner = await isOwner(reportId, userId);

  if (!memberRole && !owner) {
    throw new Error("Access denied");
  }

  const budgets = await getBudgets(reportId);

  const results: BudgetWithUsage[] = [];

  for (const b of budgets) {
    const spentAmount = await getCategorySpending(reportId, b.category);
    const percentage = b.amount > 0 ? Math.round((spentAmount / b.amount) * 10000) / 100 : 0;

    results.push({
      id: b.id,
      reportId: b.report_id,
      category: b.category,
      budgetAmount: b.amount,
      spentAmount,
      percentage,
      status: computeStatus(percentage),
    });
  }

  return results;
}

export async function upsertBudgetEntry(
  data: UpsertBudget,
  userId: string,
  requestId: string
): Promise<BudgetWithUsage> {
  const memberRole = await checkMemberRole(data.reportId, userId);
  const owner = await isOwner(data.reportId, userId);
  const isEditor = memberRole === "editor";

  if (!owner && !isEditor) {
    throw new Error("Access denied. Only owner and editors can manage budgets.");
  }

  const row = await upsertBudget(data.reportId, data.category, data.amount, userId);

  const spentAmount = await getCategorySpending(data.reportId, data.category);
  const percentage = data.amount > 0 ? Math.round((spentAmount / data.amount) * 10000) / 100 : 0;
  const status = computeStatus(percentage);

  if (percentage >= 100) {
    const isNew = await writeAlertState(data.reportId, data.category, "exceeded");
    if (isNew) {
      const recipients = await getReportOwnerAndEditors(data.reportId);
      for (const uid of recipients) {
        await insertNotification(
          uid,
          "budget.exceeded",
          `${data.category} budget exceeded (${percentage}%)`,
          `${data.category} spending has reached ${spentAmount.toLocaleString()} IDR (${percentage}%) of the ${data.amount.toLocaleString()} IDR budget.`,
          `/reports/${data.reportId}/budgets`
        );
      }
    }
  } else if (percentage >= 80) {
    const isNew = await writeAlertState(data.reportId, data.category, "warning");
    if (isNew) {
      const recipients = await getReportOwnerAndEditors(data.reportId);
      for (const uid of recipients) {
        await insertNotification(
          uid,
          "budget.warning",
          `${data.category} budget at ${percentage}%`,
          `${data.category} spending is at ${percentage}% of the ${data.amount.toLocaleString()} IDR budget.`,
          `/reports/${data.reportId}/budgets`
        );
      }
    }
  }

  return {
    id: row.id,
    reportId: row.report_id,
    category: row.category,
    budgetAmount: row.amount,
    spentAmount,
    percentage,
    status,
  };
}
