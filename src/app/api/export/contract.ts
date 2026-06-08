import { z } from "zod";

export const ExportQuerySchema = z.object({
  reportId: z.string().uuid(),
  format: z.enum(["csv", "xlsx", "pdf"]),
  period: z.enum(["daily", "monthly", "yearly", "all"]).default("all"),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type ExportQuery = z.infer<typeof ExportQuerySchema>;

export interface ExportRow {
  date: string;
  type: string;
  category: string;
  amount: number;
  merchant: string | null;
  note: string | null;
  version: number;
  changed_by: string;
  changed_at: string;
}

export interface BudgetRow {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
}

export interface ExportSuggestion {
  label: string;
  startDate: string;
  endDate: string;
  estimatedCount: number;
}
