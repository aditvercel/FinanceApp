import { z } from "zod";

export const CreateRecurringSchema = z.object({
  reportId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(999999999),
  category: z.string().min(1).max(50),
  note: z.string().max(500).optional(),
  interval: z.enum(["weekly", "monthly", "yearly"]),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  startDate: z.string().date(),
});

export type CreateRecurring = z.infer<typeof CreateRecurringSchema>;

export type RecurringTemplate = {
  id: string;
  reportId: string;
  createdBy: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string | null;
  interval: "weekly" | "monthly" | "yearly";
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  monthOfYear: number | null;
  startDate: string;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
};
