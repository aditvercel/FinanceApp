import { z } from "zod";

export const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
  systemPrompt: z.string().max(2000).optional(),
});

export const ChatResponseSchema = z.object({
  content: z.string(),
  model: z.string(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
  }),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;