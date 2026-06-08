export async function getDashboardData(
  reportId: string,
  period: "daily" | "monthly" | "yearly" = "monthly"
) {
  const res = await fetch(
    `/api/reports/${reportId}/dashboard?period=${period}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get dashboard data");
  return json.data;
}
