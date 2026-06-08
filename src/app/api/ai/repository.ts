import { supabase } from "@/lib/supabase";
import type { UsageLogEntry, RateLimitResult } from "./types";

const MAX_REQUESTS_PER_MINUTE = 10;

export class ClaudeRepository {
  async logUsage(entry: UsageLogEntry): Promise<void> {
    try {
      if (!supabase) {
        console.warn("[GroqRepository] Supabase not configured — skipping usage log");
        return;
      }
      const { error } = await supabase.from("ai_usage_logs").insert({
        request_id: entry.requestId,
        user_id: entry.userId,
        model: entry.model,
        input_tokens: entry.inputTokens,
        output_tokens: entry.outputTokens,
        latency_ms: entry.latencyMs,
        error: entry.error ?? null,
      });
      if (error) {
        console.warn("[GroqRepository] Failed to log usage:", error.message);
      }
    } catch (err) {
      console.warn("[GroqRepository] logUsage error:", err instanceof Error ? err.message : String(err));
    }
  }

  async checkRateLimit(userId: string): Promise<RateLimitResult> {
    try {
      if (!supabase) {
        return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - 60_000).toISOString();

      const { data, error } = await supabase
        .from("ai_rate_counters")
        .select("count, window_start")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.warn("[GroqRepository] checkRateLimit error:", error.message);
        return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
      }

      if (!data) {
        return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
      }

      const windowStartDb = new Date(data.window_start).getTime();
      if (now.getTime() - windowStartDb > 60_000) {
        return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
      }

      const remaining = Math.max(0, MAX_REQUESTS_PER_MINUTE - data.count);
      return { allowed: data.count < MAX_REQUESTS_PER_MINUTE, remaining };
    } catch (err) {
      console.warn("[GroqRepository] checkRateLimit error:", err instanceof Error ? err.message : String(err));
      return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
    }
  }

  async incrementRateCounter(userId: string): Promise<void> {
    try {
      if (!supabase) {
        return;
      }

      const { data: existing } = await supabase
        .from("ai_rate_counters")
        .select("count, window_start")
        .eq("user_id", userId)
        .single();

      const now = new Date();

      if (!existing) {
        await supabase.from("ai_rate_counters").insert({
          user_id: userId,
          count: 1,
          window_start: now.toISOString(),
        });
        return;
      }

      const windowStart = new Date(existing.window_start).getTime();
      if (now.getTime() - windowStart > 60_000) {
        await supabase
          .from("ai_rate_counters")
          .update({ count: 1, window_start: now.toISOString() })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("ai_rate_counters")
          .update({ count: existing.count + 1 })
          .eq("user_id", userId);
      }
    } catch (err) {
      console.warn("[GroqRepository] incrementRateCounter error:", err instanceof Error ? err.message : String(err));
    }
  }
}
