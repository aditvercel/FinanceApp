import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { Insight, InsightSchema } from "./contract";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_TOKENS = 800;
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    timeout: Number(process.env.GROQ_TIMEOUT_MS ?? 30000),
  });
}

interface AggregatedCategory {
  category: string;
  total: number;
  count: number;
}

interface AggregatedMonth {
  month: string;
  income: number;
  expense: number;
  categories: AggregatedCategory[];
}

interface InsightContext {
  reportId: string;
  reportName: string;
  totalEntries: number;
  dateRange: { start: string; end: string };
  monthly: AggregatedMonth[];
}

export class InsightsService {
  async generate(
    reportId: string,
    userId: string,
    requestId: string
  ): Promise<Insight[]> {
    if (!GROQ_API_KEY) {
      return [
        {
          type: "budget",
          title: "AI insights not configured",
          body: "Contact support to enable AI-powered insights.",
          basis: "GROQ_API_KEY is not set",
          severity: "info",
        },
      ];
    }

    const context = await this.getInsightContext(reportId, userId);
    if (!context) {
      return [
        {
          type: "budget",
          title: "Not enough data yet",
          body: "Add at least 2 weeks of expenses to get personalised insights.",
          basis: `Based on ${reportId} · No data found`,
          severity: "info",
        },
      ];
    }

    if (context.totalEntries < 10) {
      return [
        {
          type: "budget",
          title: "Not enough data yet",
          body: "Add at least 2 weeks of expenses to get personalised insights.",
          basis: `Based on ${context.reportName} · Last 90 days (${context.totalEntries} entries found)`,
          severity: "info",
        },
      ];
    }

    const insights = await this.callGroq(context, requestId);

    await this.logUsage(userId, requestId, context.totalEntries);

    return insights.slice(0, 5);
  }

  private async getInsightContext(
    reportId: string,
    userId: string
  ): Promise<InsightContext | null> {
    const { data: membership } = await supabase
      .from("report_members")
      .select("id")
      .eq("report_id", reportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return null;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("name")
      .eq("id", reportId)
      .single();

    if (reportError || !report) return null;

    const { data: snapshots, error: snapError } = await supabase
      .from("entry_snapshots")
      .select(`
        type,
        amount,
        category,
        entry_date,
        entry_id
      `)
      .eq("is_current", true)
      .in("entry_id", (
        await supabase
          .from("entries")
          .select("id")
          .eq("report_id", reportId)
      ).data?.map(e => e.id) ?? [])
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    if (snapError || !snapshots || snapshots.length === 0) return null;

    const monthlyMap = new Map<string, {
      income: number;
      expense: number;
      categories: Map<string, { total: number; count: number }>;
    }>();

    for (const snap of snapshots) {
      const month = snap.entry_date.slice(0, 7);
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          income: 0,
          expense: 0,
          categories: new Map(),
        });
      }
      const monthData = monthlyMap.get(month)!;
      if (snap.type === "income") {
        monthData.income += Number(snap.amount);
      } else {
        monthData.expense += Number(snap.amount);
      }
      if (!monthData.categories.has(snap.category)) {
        monthData.categories.set(snap.category, { total: 0, count: 0 });
      }
      const cat = monthData.categories.get(snap.category)!;
      cat.total += Number(snap.amount);
      cat.count++;
    }

    const monthly: AggregatedMonth[] = [];
    for (const [month, data] of monthlyMap) {
      const categories: AggregatedCategory[] = [];
      for (const [catName, catData] of data.categories) {
        categories.push({
          category: catName,
          total: catData.total,
          count: catData.count,
        });
      }
      categories.sort((a, b) => b.total - a.total);
      monthly.push({
        month,
        income: data.income,
        expense: data.expense,
        categories,
      });
    }
    monthly.sort((a, b) => a.month.localeCompare(b.month));

    return {
      reportId,
      reportName: report.name,
      totalEntries: snapshots.length,
      dateRange: { start: startDate, end: endDate },
      monthly,
    };
  }

  private async callGroq(
    context: InsightContext,
    requestId: string
  ): Promise<Insight[]> {
    const prompt = `You are a personal finance assistant. Given the spending data below, generate 3-5 concise, specific, actionable insights.

Data:
${JSON.stringify(context, null, 2)}

Return ONLY a valid JSON array of insight objects. No explanation, no markdown, no preamble:
[
  {
    "type": "trend" | "prediction" | "anomaly" | "merchant" | "budget",
    "title": "Short headline (max 10 words)",
    "body": "One or two sentences. Be specific with numbers.",
    "basis": "Optional: show how this was calculated. Required for prediction and anomaly types.",
    "severity": "info" | "warning" | "positive"
  }
]`;

    try {
      const groq = getGroqClient();
      const response = await groq.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.choices[0]?.message?.content ?? "";

      const parsed = JSON.parse(text);
      const insights = Array.isArray(parsed) ? parsed : [parsed];

      return insights
        .filter((i: unknown) => {
          try {
            return InsightSchema.parse(i);
          } catch {
            return false;
          }
        })
        .slice(0, 5);
    } catch (err) {
      console.error(`[${requestId}] Insights Groq call failed:`, err);
      return [
        {
          type: "budget",
          title: "Unable to generate insights",
          body: "We encountered an issue. Please try refreshing.",
          severity: "info",
        },
      ];
    }
  }

  private async logUsage(
    userId: string,
    requestId: string,
    entryCount: number
  ): Promise<void> {
    try {
      await supabase.from("ai_usage_logs").insert({
        request_id: requestId,
        user_id: userId,
        model: MODEL,
        route: "/api/insights",
        input_tokens: Math.ceil(entryCount * 0.5),
        output_tokens: MAX_TOKENS,
        latency_ms: 0,
      });
    } catch (err) {
      console.warn(`[${requestId}] Failed to log insights usage:`, err);
    }
  }
}
