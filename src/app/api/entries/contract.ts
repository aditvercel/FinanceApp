import { z } from "zod";

export const CreateEntrySchema = z.object({
  reportId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(999999999),
  currency: z.string().length(3).default("IDR"),
  category: z.string().min(1).max(50),
  note: z.string().max(500).optional(),
  entryDate: z.string().date(),
  recurringTemplateId: z.string().uuid().optional(),
  draftId: z.string().uuid().optional(),
});

export const EditEntrySchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(999999999),
  category: z.string().min(1).max(50),
  note: z.string().max(500).optional(),
  entryDate: z.string().date(),
});

export const RevertEntrySchema = z.object({
  targetVersion: z.number().int().positive(),
});

export const ScanResultSchema = z.object({
  merchant: z.string().max(200).optional(),
  date: z.string().date().optional(),
  currency: z.string().length(3).default("IDR"),
  currencyOriginal: z.string().length(3).optional(),
  exchangeRate: z.number().positive().optional(),
  exchangeRateSource: z.enum(["live", "manual", "fallback"]).optional(),
  subtotal: z.number().positive().optional(),
  tax: z.number().nonnegative().optional(),
  total: z.number().positive(),
  totalOriginal: z.number().positive().optional(),
  category: z.enum([
    "Food",
    "Transport",
    "Utilities",
    "Shopping",
    "Health",
    "Entertainment",
    "Other",
  ]),
  lineItems: z.array(
    z.object({
      name: z.string().max(200),
      price: z.number().nonnegative(),
      confidence: z.enum(["high", "medium", "low"]),
    })
  ).max(100),
  note: z.string().max(1000),
  confidence: z.enum(["high", "medium", "low"]),
  rawText: z.string().max(5000).optional(),
  categoryConfidence: z.enum(["high", "medium", "low"]).optional(),
  categoryOriginal: z.string().optional(),
});

export const ListEntriesQuerySchema = z.object({
  reportId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;
export type CreateEntry = z.infer<typeof CreateEntrySchema>;
export type EditEntry = z.infer<typeof EditEntrySchema>;
export type RevertEntry = z.infer<typeof RevertEntrySchema>;
export type ListEntriesQuery = z.infer<typeof ListEntriesQuerySchema>;
