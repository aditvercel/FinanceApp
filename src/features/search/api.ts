export async function searchEntries(params: Record<string, any>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") searchParams.set(k, String(v));
  });
  const res = await fetch(`/api/search?${searchParams}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Search failed");
  return json.data;
}
