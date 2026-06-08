import { z } from "zod";

export const MarkReadSchema = z.object({
  action: z.enum(["markRead", "markAllRead"]),
  id: z.string().uuid().optional(),
});

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
};

export type MarkReadInput = z.infer<typeof MarkReadSchema>;
