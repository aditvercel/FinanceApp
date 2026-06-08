export async function getInsights(reportId: string) {
  const res = await fetch(`/api/insights?reportId=${reportId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed");
  return json.data;
}

export async function refreshInsights(reportId: string) {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed");
  return json.data;
}
