export interface ReportCategory {
  id: string;
  name: string;
  emoji: string;
  isDefault: boolean;
}

export async function getCategories(reportId: string): Promise<ReportCategory[]> {
  const res = await fetch(`/api/reports/${reportId}/categories`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get categories");
  return json.data;
}

export async function createCategory(reportId: string, name: string, emoji: string): Promise<ReportCategory> {
  const res = await fetch(`/api/reports/${reportId}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, emoji }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create category");
  return json.data;
}

export async function updateCategory(
  reportId: string,
  categoryId: string,
  data: { name?: string; emoji?: string },
): Promise<ReportCategory> {
  const res = await fetch(`/api/reports/${reportId}/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to update category");
  return json.data;
}

export async function deleteCategory(reportId: string, categoryId: string): Promise<void> {
  const res = await fetch(`/api/reports/${reportId}/categories/${categoryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete category");
}
