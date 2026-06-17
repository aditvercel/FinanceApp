"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReports } from "@/features/finance/reports/hooks";
import { useExport } from "@/features/finance/export/hooks";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
  File,
  AlertCircle,
} from "lucide-react";

const FORMATS = [
  { value: "csv" as const, label: "CSV", icon: FileText, desc: "Comma-separated values" },
  { value: "xlsx" as const, label: "Excel", icon: FileSpreadsheet, desc: "Excel workbook with summary" },
  { value: "pdf" as const, label: "PDF", icon: File, desc: "Report with charts" },
];

const PERIODS = [
  { value: "all" as const, label: "All time" },
  { value: "daily" as const, label: "Daily" },
  { value: "monthly" as const, label: "Monthly" },
  { value: "yearly" as const, label: "Yearly" },
];

export default function ExportPage() {
  const router = useRouter();
  const { data: reports, isLoading: reportsLoading } = useReports();
  const exportMutation = useExport();

  const [selectedReportId, setSelectedReportId] = useState("");
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (!selectedReportId) {
      setError("Select a report to export.");
      return;
    }
    setError("");

    const p = new URLSearchParams({ reportId: selectedReportId, format, period });
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    const res = await fetch(`/api/export?${p}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Financial Report(${startDate} to ${endDate}).${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-(--muted)rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-(--foreground)" />
        </button>
        <h1 className="text-2xl font-bold">Export Report</h1>
      </header>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Report
          </label>
          {reportsLoading ? (
            <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
          ) : (
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full px-3 py-2.5 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a report...</option>
              {reports?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    format === f.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-(--border) hover:border-(--border)"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      format === f.value ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      format === f.value ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {f.label}
                  </span>
                  <span className="text-xs text-gray-400 text-center leading-tight">
                    {f.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="w-full px-3 py-2.5 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}



        <button
          onClick={handleExport}
          disabled={exportMutation.isPending || !selectedReportId}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exportMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </button>
      </div>
    </div>
  );
}
