export type RecurrenceInterval = "weekly" | "monthly" | "yearly";

export interface RecurringTemplate {
  id: string;
  reportId: string;
  createdBy: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string | null;
  interval: RecurrenceInterval;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  monthOfYear: number | null;
  startDate: string;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
}
