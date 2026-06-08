import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getRequestId } from "@/lib/middleware";
import { supabase } from "@/lib/supabase";
import { ok, err } from "@/lib/types";
import { ReportRepository } from "../../repository";

const DashboardQuerySchema = z.object({
  period: z.enum(["daily", "monthly", "yearly"]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: reportId } = await params;

    const repo = new ReportRepository();
    const isAllowed = await repo.isMember(reportId, auth);
    if (!isAllowed) {
      return NextResponse.json(
        err(403, "You do not have access to this report", requestId),
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = DashboardQuerySchema.safeParse({
      period: searchParams.get("period") ?? "monthly",
    });
    if (!parsed.success) {
      return NextResponse.json(
        err(400, "Invalid period. Use: daily, monthly, yearly", requestId),
        { status: 400 },
      );
    }

    const { period } = parsed.data;

    const now = new Date();
    let startDate: string;
    let dateTrunc: string;
    switch (period) {
      case "daily":
        startDate = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
        dateTrunc = "day";
        break;
      case "monthly":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split("T")[0];
        dateTrunc = "month";
        break;
      case "yearly":
        startDate = "1970-01-01";
        dateTrunc = "year";
        break;
    }

    const { data: snapshots, error } = await supabase
      .rpc("get_dashboard_data", {
        p_report_id: reportId,
        p_start_date: startDate,
        p_date_trunc: dateTrunc,
      });

    if (error) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("entry_snapshots")
        .select("type, amount, category, entry_date, entry_id")
        .eq("is_current", true)
        .in(
          "entry_id",
          (
            await supabase.from("entries").select("id").eq("report_id", reportId)
          ).data?.map((e: any) => e.id) ?? [],
        )
        .gte("entry_date", startDate)
        .order("entry_date", { ascending: true });

      if (fallbackError) {
        return NextResponse.json(
          err(500, "Failed to fetch dashboard data", requestId),
          { status: 500 },
        );
      }

      const summary = computeSummary(fallback ?? []);
      return NextResponse.json(
        ok(
          {
            period,
            entries: fallback ?? [],
            summary,
            totalIncome: summary.income,
            totalExpense: summary.expense,
            netBalance: summary.netBalance,
          },
          "Dashboard data retrieved",
          requestId,
        ),
      );
    }

    const summary = computeSummary((snapshots ?? []) as any[]);
    return NextResponse.json(
      ok(
        {
          period,
          entries: snapshots ?? [],
          summary,
          totalIncome: summary.income,
          totalExpense: summary.expense,
          netBalance: summary.netBalance,
        },
        "Dashboard data retrieved",
        requestId,
      ),
    );
  } catch (error) {
    console.error(`[${requestId}] Dashboard error:`, error);
    return NextResponse.json(err(500, "Failed to load dashboard", requestId), {
      status: 500,
    });
  }
}

function computeSummary(entries: { type: string; amount: number }[]) {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += Number(e.amount);
    else expense += Number(e.amount);
  }
  return {
    income,
    expense,
    netBalance: income - expense,
    totalEntries: entries.length,
  };
}
