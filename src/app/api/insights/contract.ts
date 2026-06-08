import { z } from "zod";

export const InsightSchema = z.object({
  type: z.enum(["trend", "prediction", "anomaly", "merchant", "budget"]),
  title: z.string(),
  body: z.string(),
  basis: z.string().optional(),
  severity: z.enum(["info", "warning", "positive"]),
});

export type Insight = z.infer<typeof InsightSchema>;
