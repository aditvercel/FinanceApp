import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  reportId: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  dateStart: z.string().date().optional(),
  dateEnd: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export type SearchResult = {
  entryId: string;
  reportId: string;
  reportName: string;
  type: string;
  amount: number;
  category: string;
  note: string;
  entryDate: string;
  matchedField: string;
  lineItems: Array<{ name: string; price: number }>;
};

export type ParsedQuery = {
  textTerms: string[];
  amountMin: number | undefined;
  amountMax: number | undefined;
};
