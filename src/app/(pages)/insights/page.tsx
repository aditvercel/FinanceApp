"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInsights, useRefreshInsights } from "@/features/insights/hooks";
import { useReports } from "@/features/finance/reports/hooks";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

const SEVERITY_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  info: {
    icon: <Lightbulb className="w-5 h-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  positive: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
};

const TYPE_ICONS: Record<string, string> = {
  trend: "📈",
  prediction: "🔮",
  anomaly: "⚠️",
  merchant: "🏪",
  budget: "💰",
};

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return "Ready to refresh";
  if (minutes < 60) return `Refreshes in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Refreshes in ${h}h ${m}m`;
}

export default function InsightsPage() {
  const router = useRouter();
  const [selectedReportId, setSelectedReportId] = useState("");
  const [showReports, setShowReports] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { data: reports } = useReports();

  useEffect(() => {
    if (reports && reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const reportName =
    reports?.find((r) => r.id === selectedReportId)?.name ?? "Report";

  const { data: insights, isLoading, dataUpdatedAt } = useInsights(
    selectedReportId
  ) as { data: unknown; isLoading: boolean; dataUpdatedAt: number };
  const refreshInsights = useRefreshInsights();

  const generatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  useEffect(() => {
    if (rateLimitedUntil > Date.now()) {
      const remaining = Math.ceil(
        (rateLimitedUntil - Date.now()) / 60000
      );
      setRefreshCountdown(remaining);
      countdownRef.current = setInterval(() => {
        const rem = Math.ceil(
          (rateLimitedUntil - Date.now()) / 60000
        );
        setRefreshCountdown(Math.max(0, rem));
        if (rem <= 0) {
          clearInterval(countdownRef.current);
          setRateLimitedUntil(0);
        }
      }, 10000);
      return () => clearInterval(countdownRef.current);
    }
  }, [rateLimitedUntil]);

  const handleRefresh = async () => {
    if (!selectedReportId) return;
    try {
      await refreshInsights.mutateAsync(selectedReportId);
      setRateLimitedUntil(Date.now() + 5 * 60 * 1000);
      setRefreshCountdown(5);
    } catch {
      // rate limited on backend
    }
  };

  const canRefresh =
    !refreshInsights.isPending && rateLimitedUntil <= Date.now();

  const allInsights = (insights ?? []) as Array<{
    type: string;
    title: string;
    body: string;
    basis?: string;
    severity: string;
  }>;

  const enoughData = allInsights.length > 0;

  return (
    <div className="p-4 pb-16">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 hover:bg-(--muted)rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-(--foreground)" />
          </button>
          <h1 className="text-2xl font-bold">AI Insights</h1>
        </div>

        <div className="relative mb-2">
          <button
            onClick={() => setShowReports(!showReports)}
            className="flex items-center gap-2 text-sm text-gray-700 px-3 py-1.5 bg-gray-50 border border-(--border) rounded-lg hover:bg-gray-100"
          >
            {reportName}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showReports && reports && (
            <div className="absolute top-full left-0 mt-1 bg-(--card) border border-(--border) rounded-lg shadow-lg z-10 w-56">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedReportId(r.id);
                    setShowReports(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    r.id === selectedReportId
                      ? "text-blue-600 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Based on {reportName} · Last 90 days
        </p>
        {generatedAt && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">
              Generated {generatedAt}
            </p>
            <div className="flex items-center gap-2">
              {!canRefresh && (
                <span className="text-xs text-gray-400">
                  {formatTimeRemaining(refreshCountdown)}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={!canRefresh}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  canRefresh
                    ? "text-blue-600 hover:bg-blue-50"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <RefreshCw
                  className={`w-3 h-3 ${
                    refreshInsights.isPending ? "animate-spin" : ""
                  }`}
                />
                Refresh now
              </button>
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : enoughData ? (
        <div className="space-y-3">
          {allInsights.map((insight, i) => {
            const severity = SEVERITY_CONFIG[insight.severity] ||
              SEVERITY_CONFIG.info;
            return (
              <div
                key={i}
                className={`${severity.bg} border border-gray-100 rounded-xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {TYPE_ICONS[insight.type] || "💡"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-(--foreground)">
                        {insight.title}
                      </h3>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          severity.color
                        } ${severity.bg}`}
                      >
                        {insight.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{insight.body}</p>
                    {insight.basis && (
                      <p className="text-xs text-gray-500 mt-2 border-t border-(--border) pt-2">
                        {insight.basis}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-(--foreground) font-medium">Not enough data yet.</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Add at least 2 weeks of expenses to get personalised insights.
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Based on {reportName} · Last 90 days (0 entries found)
          </p>
        </div>
      )}
    </div>
  );
}
