export async function getMerchants(reportId: string, period: "monthly" | "yearly" | "all" = "monthly") {
  const res = await fetch(`/api/reports/${reportId}/merchants?period=${period}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get merchants");
  return json.data as Array<{
    name: string;
    totalSpent: number;
    visitCount: number;
    lastVisit: string;
    topCategory: string;
    percentOfTotal: number;
  }>;
}
