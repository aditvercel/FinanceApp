export async function getActivity(params?: { reportId?: string; limit?: number; before?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.reportId) searchParams.set("reportId", params.reportId);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.before) searchParams.set("before", params.before);
  const res = await fetch(`/api/activity?${searchParams}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get activity");
  return json.data;
}
