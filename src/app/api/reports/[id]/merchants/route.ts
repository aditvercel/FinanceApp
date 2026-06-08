import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getRequestId } from "@/lib/middleware";
import { supabase } from "@/lib/supabase";
import { ok, err } from "@/lib/types";

const MerchantQuerySchema = z.object({
  period: z.enum(["monthly", "yearly", "all"]),
  limit: z.coerce.number().int().min(1).max(20).default(10),
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

    const { searchParams } = new URL(request.url);
    const parsed = MerchantQuerySchema.safeParse({
      period: searchParams.get("period") ?? "monthly",
      limit: searchParams.get("limit") ?? 10,
    });
    if (!parsed.success) {
      return NextResponse.json(err(400, "Invalid query parameters", requestId), {
        status: 400,
      });
    }

    const { period, limit } = parsed.data;

    const now = new Date();
    let startDate: string;
    switch (period) {
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        break;
      case "all":
        startDate = "1970-01-01";
        break;
    }

    const { data: entries, error } = await supabase
      .from("entry_snapshots")
      .select("amount, category, merchant, entry_date, entry_id")
      .eq("is_current", true)
      .in(
        "entry_id",
        (
          await supabase.from("entries").select("id").eq("report_id", reportId)
        ).data?.map((e: any) => e.id) ?? [],
      )
      .gte("entry_date", startDate)
      .not("merchant", "is", null);

    if (error) {
      return NextResponse.json(err(500, "Failed to fetch merchants", requestId), {
        status: 500,
      });
    }

    const merchantMap = new Map<
      string,
      { totalSpent: number; visitCount: number; lastVisit: string; topCategory: string; categories: Map<string, number> }
    >();

    let grandTotal = 0;
    for (const e of entries ?? []) {
      const name = (e.merchant ?? "Unknown").trim();
      if (!name) continue;
      if (!merchantMap.has(name)) {
        merchantMap.set(name, {
          totalSpent: 0,
          visitCount: 0,
          lastVisit: "",
          topCategory: "",
          categories: new Map(),
        });
      }
      const m = merchantMap.get(name)!;
      const amount = Number(e.amount);
      m.totalSpent += amount;
      m.visitCount++;
      grandTotal += amount;
      if (e.entry_date > m.lastVisit) m.lastVisit = e.entry_date;
      m.categories.set(e.category, (m.categories.get(e.category) ?? 0) + amount);
    }

    const merchants = Array.from(merchantMap.entries())
      .map(([name, data]) => {
        const sortedCats = Array.from(data.categories.entries()).sort((a, b) => b[1] - a[1]);
        return {
          name,
          totalSpent: data.totalSpent,
          visitCount: data.visitCount,
          lastVisit: data.lastVisit,
          topCategory: sortedCats[0]?.[0] ?? "Other",
          percentOfTotal: grandTotal > 0 ? Math.round((data.totalSpent / grandTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return NextResponse.json(
      ok({ merchants, totalSpent: grandTotal, period }, "Merchants retrieved", requestId),
    );
  } catch (error) {
    console.error(`[${requestId}] Merchants error:`, error);
    return NextResponse.json(err(500, "Failed to load merchants", requestId), {
      status: 500,
    });
  }
}
