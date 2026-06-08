export async function getBudgets(reportId: string) {
  const res = await fetch(`/api/budgets?reportId=${reportId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get budgets");
  return json.data;
}

export async function upsertBudget(data: {
  reportId: string;
  category: string;
  amount: number;
}) {
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to save budget");
  return json.data;
}
