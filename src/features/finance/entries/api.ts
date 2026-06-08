export async function getEntries(reportId: string) {
  const res = await fetch(`/api/entries?reportId=${reportId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get entries");
  return json.data;
}

export async function createEntry(data: any) {
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create entry");
  return json.data;
}

export async function editEntry(id: string, data: any) {
  const res = await fetch(`/api/entries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to edit entry");
  return json.data;
}

export async function revertEntry(id: string, targetVersion: number) {
  const res = await fetch(`/api/entries/${id}/revert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetVersion }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to revert entry");
  return json.data;
}

export async function getEntryHistory(id: string) {
  const res = await fetch(`/api/entries/${id}/history`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get history");
  return json.data;
}
