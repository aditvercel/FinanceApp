export interface ExportParams {
  reportId: string;
  format: "csv" | "xlsx" | "pdf";
  period?: "daily" | "monthly" | "yearly" | "all";
  startDate?: string;
  endDate?: string;
}

export interface ExportResult {
  url: string;
  expiresAt: string;
  format: string;
  entryCount?: number;
  suggestions?: Array<{
    label: string;
    startDate: string;
    endDate: string;
    estimatedCount: number;
  }>;
}

export async function exportReport(params: ExportParams): Promise<ExportResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("reportId", params.reportId);
  searchParams.set("format", params.format);
  if (params.period) searchParams.set("period", params.period);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const res = await fetch(`/api/export?${searchParams}`);
  const json = await res.json();
  if (!res.ok) {
    const err: any = new Error(json.message || "Export failed");
    if (json.data) err.data = json.data;
    throw err;
  }
  return json.data;
}

export async function exportFullBackup(): Promise<{ url: string; expiresAt: string }> {
  const res = await fetch("/api/export/backup");
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Backup failed");
  return json.data;
}
