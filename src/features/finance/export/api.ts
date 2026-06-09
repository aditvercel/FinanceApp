export interface ExportParams {
  reportId: string;
  format: "csv" | "xlsx" | "pdf";
  period?: "daily" | "monthly" | "yearly" | "all";
  startDate?: string;
  endDate?: string;
}

export interface ExportSuggestion {
  label: string;
  startDate: string;
  endDate: string;
  estimatedCount: number;
}

export async function exportReport(params: ExportParams): Promise<void> {
  const searchParams = new URLSearchParams();
  searchParams.set("reportId", params.reportId);
  searchParams.set("format", params.format);
  if (params.period) searchParams.set("period", params.period);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const res = await fetch(`/api/export?${searchParams}`);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?(.+?)"?$/);
  const name = match?.[1] ?? `${params.reportId}.${params.format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportFullBackup(): Promise<{ url: string; expiresAt: string }> {
  const res = await fetch("/api/export/backup");
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Backup failed");
  return json.data;
}
