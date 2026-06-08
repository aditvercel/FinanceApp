import { z } from "zod";

export const ActivityQuerySchema = z.object({
  reportId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
});

export const ActivityEventSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  eventType: z.string(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.string(),
});

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;

export const EVENT_TYPES = [
  'entry.created', 'entry.edited', 'entry.reverted', 'entry.deleted',
  'member.joined', 'member.promoted', 'member.demoted', 'member.removed', 'member.editor_requested',
  'budget.set', 'budget.exceeded',
  'recurring.generated', 'recurring.created', 'recurring.paused',
  'report.exported', 'report.deleted', 'report.restored',
] as const;
