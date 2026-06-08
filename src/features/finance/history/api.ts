export async function getEntryHistory(entryId: string) {
  const res = await fetch(`/api/entries/${entryId}/history`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to get history");
  return json.data as Array<{
    id: string;
    version: number;
    changedBy: { id: string; displayName: string };
    action: "create" | "edit" | "revert";
    revertedFrom?: number;
    type: "income" | "expense";
    amount: number;
    category: string;
    note?: string;
    entryDate: string;
    lineItems: Array<{ name: string; price: number; confidence: string }>;
    changedAt: string;
    isCurrent: boolean;
  }>;
}

export async function revertEntry(entryId: string, targetVersion: number) {
  const res = await fetch(`/api/entries/${entryId}/revert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetVersion }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Revert failed");
  return json.data;
}
