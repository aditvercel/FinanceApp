import type { CreateReport, JoinReport } from "@/app/api/reports/contract";
import type { Report, ReportMember } from "./model";

export async function createReport(
  data: CreateReport
): Promise<{ id: string; reportId: string }> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Create report failed");
  return json.data;
}

export async function joinReport(
  reportId: string
): Promise<{ id: string; name: string }> {
  const res = await fetch("/api/reports/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId } as JoinReport),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Join report failed");
  return json.data;
}

export async function getReport(id: string): Promise<Report & { members: ReportMember[] }> {
  const res = await fetch(`/api/reports/${id}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Get report failed");
  return json.data;
}

export async function getReports(): Promise<
  Array<{
    id: string;
    reportId: string;
    name: string;
    currency: string;
    role: string;
    ownerId: string;
    memberCount: number;
  }>
> {
  const res = await fetch("/api/reports");
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Get reports failed");
  return json.data;
}

export async function requestEditorAccess(reportId: string): Promise<void> {
  const res = await fetch(`/api/reports/${reportId}/request-editor`, {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
}

export async function manageMember(
  reportId: string,
  userId: string,
  action: "promote" | "demote" | "remove"
): Promise<void> {
  const res = await fetch(`/api/reports/${reportId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, action }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to manage member");
}