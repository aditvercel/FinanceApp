import { z } from "zod";

export const UpsertBudgetSchema = z.object({
  reportId: z.string().uuid(),
  category: z.string().min(1).max(50),
  amount: z.number().positive().max(999999999),
});

export type UpsertBudget = z.infer<typeof UpsertBudgetSchema>;

export type BudgetWithUsage = {
  id: string;
  reportId: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
};
