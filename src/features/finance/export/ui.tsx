"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import type { ExportParams } from "./api";
import { useExport } from "./hooks";

interface ExportFormProps {
  reportId: string;
}

export function ExportForm({ reportId }: ExportFormProps) {
  const [format, setFormat] = useState<ExportParams["format"]>("csv");
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<{
    url: string;
    expiresAt: string;
    format: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ label: string; startDate: string; endDate: string; estimatedCount: number }>
  >([]);

  const exportMutation = useExport();

  const handleExport = async (customDateRange?: { startDate?: string; endDate?: string }) => {
    setError(null);
    setSuggestions([]);

    const params: ExportParams = {
      reportId,
      format,
      period: customDateRange ? undefined : period,
      startDate: customDateRange?.startDate || startDate || undefined,
      endDate: customDateRange?.endDate || endDate || undefined,
    };

    try {
      const res = await exportMutation.mutateAsync(params);
      setResult({ url: res.url, expiresAt: res.expiresAt, format: res.format });

      if (res.suggestions) {
        setSuggestions(res.suggestions);
      }
    } catch (err: any) {
      if (err.data?.suggestions) {
        setSuggestions(err.data.suggestions);
        setError(err.message);
      } else {
        setError(err.message || "Export failed. Please try again.");
      }
    }
  };

  const FORMATS: Array<{ value: ExportParams["format"]; label: string; icon: typeof Download }> = [
    { value: "csv", label: "CSV", icon: FileText },
    { value: "xlsx", label: "XLSX (Excel)", icon: FileSpreadsheet },
    { value: "pdf", label: "PDF", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-4">Export Report</h2>

        {!result ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.value}
                        onClick={() => setFormat(f.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          format === f.value
                            ? "border-blue-600 bg-blue-50"
                            : "border-(--border) hover:border-(--border)"
                        }`}
                      >
                        <Icon className="w-6 h-6 text-gray-500" />
                        <span className="text-sm font-medium">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-(--border) rounded-lg text-sm"
                >
                  <option value="all">All time</option>
                  <option value="daily">Daily (last 30 days)</option>
                  <option value="monthly">Monthly (last 12 months)</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-(--border) rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-(--border) rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {error}
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  Try a smaller date range:
                </p>
                <div className="space-y-1">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() =>
                        handleExport({
                          startDate: s.startDate,
                          endDate: s.endDate,
                        })
                      }
                      className="flex items-center justify-between w-full px-3 py-2 bg-(--card) rounded-lg text-sm hover:bg-amber-50 transition-colors"
                    >
                      <span className="font-medium">{s.label}</span>
                      <span className="text-gray-500">~{s.estimatedCount} entries</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setFormat("csv");
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 bg-(--card) rounded-lg text-sm hover:bg-amber-50 transition-colors"
                  >
                    <span className="font-medium">Or export as CSV (no limit)</span>
                  </button>
                </div>
              </div>
            )}

            {error && suggestions.length === 0 && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={() => handleExport()}
              disabled={exportMutation.isPending}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {exportMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export
                </>
              )}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Export ready!</h3>
            <p className="text-sm text-(--foreground) mb-1">
              Your {result.format.toUpperCase()} export is ready for download.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Link expires at{" "}
              {new Date(result.expiresAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                  setSuggestions([]);
                }}
                className="px-6 py-2.5 border border-(--border) rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Export again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
