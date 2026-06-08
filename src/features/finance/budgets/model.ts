export interface BudgetWithUsage {
  id: string;
  reportId: string;
  category: string;
  amount: number;
  spentAmount: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
}
