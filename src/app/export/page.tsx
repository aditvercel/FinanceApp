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
  ChevronRight,
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
  const { data: reports } = useReports();
  const exportMutation = useExport();

  const [selectedReportId, setSelectedReportId] = useState("");
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{
    label: string;
    startDate: string;
    endDate: string;
    estimatedCount: number;
  }> | null>(null);

  const handleExport = async () => {
    if (!selectedReportId) {
      setError("Select a report to export.");
      return;
    }
    setError("");
    setDownloadUrl(null);
    setSuggestions(null);

    try {
      const result = await exportMutation.mutateAsync({
        reportId: selectedReportId,
        format,
        period,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
        return;
      }

      if (result.url) {
        setDownloadUrl(result.url);
        window.open(result.url, "_blank");
      }
    } catch (e: any) {
      if (e.data?.suggestions) {
        setSuggestions(e.data.suggestions);
      } else {
        setError(e.message || "Export failed. Try again.");
      }
    }
  };

  const applySuggestion = (suggestion: { label: string; startDate: string; endDate: string; estimatedCount: number }) => {
    setStartDate(suggestion.startDate);
    setEndDate(suggestion.endDate);
    setSuggestions(null);
  };

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-2xl font-bold">Export Report</h1>
      </header>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Report
          </label>
          <select
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a report...</option>
            {reports?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
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
                      : "border-gray-200 hover:border-gray-300"
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
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {suggestions && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">
              This report has many entries. PDF export is limited to 10,000 entries.
            </p>
            <p className="text-xs text-amber-700 mb-3">
              Choose a date range below or switch to CSV.
            </p>
            <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applySuggestion(s)}
                    className="w-full flex items-center justify-between p-2.5 bg-white border border-amber-200 rounded-lg text-sm hover:bg-amber-50"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-gray-500">
                      ~{s.estimatedCount} entries
                    </span>
                  </button>
                ))}
            </div>
            <button
              onClick={() => { setFormat("csv"); setSuggestions(null); }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Or export as CSV (no entry limit) →
            </button>
          </div>
        )}

        {downloadUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <p className="font-medium text-emerald-800">
                Export ready!
              </p>
            </div>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 text-sm hover:underline break-all"
            >
              {downloadUrl}
            </a>
            <p className="text-xs text-emerald-600 mt-1">
              Link expires in 1 hour.
            </p>
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
