import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getRequestId } from "@/lib/middleware";
import { supabase } from "@/lib/supabase";
import { ok, err } from "@/lib/types";
import { ReportRepository } from "../repository";

const DashboardQuerySchema = z.object({
  period: z.enum(["daily", "monthly", "yearly"]),
});

const reportRepo = new ReportRepository();

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
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

    const reports = await reportRepo.getReports(auth);
    if (!reports || reports.length === 0) {
      return NextResponse.json(
        ok(
          {
            period,
            totalIncome: 0,
            totalExpense: 0,
            netBalance: 0,
            totalEntries: 0,
          },
          "No reports found",
          requestId,
        ),
      );
    }

    const reportIds = reports.map((r) => r.id);

    const now = new Date();
    let startDate: string;
    switch (period) {
      case "daily":
        startDate = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        break;
    }

    const { data: snapshots, error } = await supabase
      .from("entry_snapshots")
      .select("type, amount")
      .eq("is_current", true)
      .in(
        "entry_id",
        (
          await supabase.from("entries").select("id").in("report_id", reportIds)
        ).data?.map((e: any) => e.id) ?? [],
      )
      .gte("entry_date", startDate);

    if (error) {
      return NextResponse.json(err(500, "Failed to fetch dashboard data", requestId), { status: 500 });
    }

    let totalIncome = 0;
    let totalExpense = 0;
    for (const s of snapshots ?? []) {
      if (s.type === "income") totalIncome += Number(s.amount);
      else totalExpense += Number(s.amount);
    }

    return NextResponse.json(
      ok(
        {
          period,
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense,
          totalEntries: snapshots?.length ?? 0,
        },
        "Dashboard data retrieved",
        requestId,
      ),
    );
  } catch (error) {
    console.error(`[${requestId}] Dashboard error:`, error);
    return NextResponse.json(err(500, "Failed to load dashboard", requestId), { status: 500 });
  }
}
