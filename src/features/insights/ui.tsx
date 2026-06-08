"use client";

import {
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useInsights, useRefreshInsights } from "./hooks";

const INSIGHT_ICONS: Record<string, { icon: typeof Sparkles; color: string }> = {
  trend: { icon: TrendingUp, color: "text-blue-500" },
  prediction: { icon: Sparkles, color: "text-purple-500" },
  anomaly: { icon: AlertTriangle, color: "text-amber-500" },
  merchant: { icon: Store, color: "text-green-500" },
  budget: { icon: DollarSign, color: "text-cyan-500" },
};

const SEVERITY_COLORS: Record<string, { bg: string; border: string }> = {
  info: { bg: "bg-blue-50", border: "border-blue-200" },
  warning: { bg: "bg-amber-50", border: "border-amber-200" },
  positive: { bg: "bg-green-50", border: "border-green-200" },
};

interface InsightCardProps {
  insight: {
    type: string;
    title: string;
    body: string;
    basis?: string;
    severity: string;
  };
}

function InsightCard({ insight }: InsightCardProps) {
  const { icon: Icon, color } = INSIGHT_ICONS[insight.type] || {
    icon: Sparkles,
    color: "text-gray-500",
  };
  const colors = SEVERITY_COLORS[insight.severity] || SEVERITY_COLORS.info;

  return (
    <div className={`rounded-lg border ${colors.bg} ${colors.border} p-3`}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{insight.title}</p>
          <p className="text-sm text-gray-700 mt-0.5">{insight.body}</p>
          {insight.basis && (
            <p className="text-xs text-gray-500 mt-1.5 border-t border-gray-200 pt-1">
              {insight.basis}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface InsightsPanelProps {
  reportId: string;
  reportName?: string;
}

export function InsightsPanel({ reportId, reportName }: InsightsPanelProps) {
  const { data, isLoading, dataUpdatedAt } = useInsights(reportId);
  const refresh = useRefreshInsights();
  const [collapsed, setCollapsed] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const elapsed = Date.now() - dataUpdatedAt;
    const remaining = Math.max(0, 30 * 60 * 1000 - elapsed);
    setCountdown(Math.ceil(remaining / 1000));

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m} min${s > 0 ? ` ${s}s` : ""}`;
    return `${s}s`;
  };

  const handleRefresh = () => {
    const refreshLimit = 5;
    const perHour = 60 * 60 * 1000;
    const now = Date.now();

    if (now < rateLimitedUntil) {
      return;
    }

    refresh.mutate(reportId, {
      onSuccess: () => {
        const key = `insight_refresh_count_${reportId}`;
        const count = parseInt(localStorage.getItem(key) || "0", 10) + 1;
        localStorage.setItem(key, String(count));

        if (count >= refreshLimit) {
          setRateLimitedUntil(now + perHour);
          setTimeout(() => {
            localStorage.setItem(key, "0");
            setRateLimitedUntil(0);
          }, perHour);
        }
      },
    });
  };

  const isRateLimited = Date.now() < rateLimitedUntil;

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const insights = Array.isArray(data) ? data : data?.insights || [];

  if (!insights || insights.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">AI Insights</h3>
        </div>
        <p className="text-sm text-black">
          Not enough data yet. Add at least 2 weeks of expenses to get personalised insights.
        </p>
        {reportName && (
          <p className="text-xs text-gray-400 mt-2">
            Based on {reportName} · Last 90 days
            {dataUpdatedAt && (
              <> · Generated {new Date(dataUpdatedAt).toLocaleTimeString()}</>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">AI Insights</h3>
        </div>
        <span className="text-gray-400">{collapsed ? "Show" : "Hide"}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {reportName && (
            <p className="text-xs text-gray-400">
              Based on {reportName} · Last 90 days
              {dataUpdatedAt && (
                <> · Generated {new Date(dataUpdatedAt).toLocaleString()}</>
              )}
              {countdown > 0 && (
                <> · Refreshes in {formatCountdown(countdown)}</>
              )}
            </p>
          )}

          <div className="space-y-2">
            {insights.slice(0, 4).map((insight: any, idx: number) => (
              <InsightCard key={idx} insight={insight} />
            ))}
            {insights.length > 4 && (
              <button className="text-sm text-blue-600 font-medium hover:underline">
                Show more
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <button
              onClick={handleRefresh}
              disabled={isRateLimited || refresh.isPending}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isRateLimited || refresh.isPending
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refresh.isPending ? "animate-spin" : ""}`}
              />
              {refresh.isPending ? "Refreshing..." : "Refresh now"}
            </button>
            {isRateLimited && (
              <span className="text-xs text-gray-400">
                Rate limit reached. Try again later.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
