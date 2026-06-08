export async function getRecurringTemplates(reportId: string) {
  const res = await fetch(`/api/recurring?reportId=${reportId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get templates");
  return json.data;
}

export async function createRecurringTemplate(data: {
  reportId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note?: string;
  interval: "weekly" | "monthly" | "yearly";
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  startDate: string;
}) {
  const res = await fetch("/api/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create template");
  return json.data;
}

export async function updateRecurringTemplate(
  id: string,
  data: Partial<{
    type: "income" | "expense";
    amount: number;
    category: string;
    note: string;
    interval: "weekly" | "monthly" | "yearly";
    dayOfMonth: number;
    dayOfWeek: number;
    monthOfYear: number;
    isActive: boolean;
  }>
) {
  const res = await fetch(`/api/recurring/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to update template");
  return json.data;
}

export async function deleteRecurringTemplate(id: string) {
  const res = await fetch(`/api/recurring/${id}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to delete template");
  return json.data;
}
