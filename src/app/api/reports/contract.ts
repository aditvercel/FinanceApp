import { z } from "zod";

export const CreateReportSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3).default("IDR"),
});

export const JoinReportSchema = z.object({
  reportId: z.string().min(1).max(20),
});

export const LookupQuerySchema = z.object({
  reportId: z.string().min(1).max(20),
});

export const ManageMemberSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["promote", "demote", "remove"]),
});

export type CreateReport = z.infer<typeof CreateReportSchema>;
export type JoinReport = z.infer<typeof JoinReportSchema>;
export type LookupQuery = z.infer<typeof LookupQuerySchema>;
export type ManageMemberInput = z.infer<typeof ManageMemberSchema>;