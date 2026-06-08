"use client";

import { Store } from "lucide-react";
import { useState } from "react";
import { useMerchants } from "./hooks";

const MERCHANT_EMOJIS: Record<string, string> = {
  Indomaret: "🏪",
  Grab: "🚗",
  Tokopedia: "🛍️",
  PLN: "⚡",
  "Warung Bu Tini": "🍜",
};

function getEmoji(name: string) {
  return MERCHANT_EMOJIS[name] || "🏪";
}

interface MerchantListProps {
  reportId: string;
}

export function MerchantList({ reportId }: MerchantListProps) {
  const [period, setPeriod] = useState<"monthly" | "yearly" | "all">("monthly");
  const [sortBy, setSortBy] = useState<"spent" | "visits">("spent");
  const { data: merchants, isLoading } = useMerchants(reportId, period);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!merchants || merchants.length === 0) {
    return (
      <div className="text-center py-12">
        <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="font-medium text-gray-700">No merchant data yet</h3>
        <p className="text-sm text-gray-500 mt-1">
          Scan receipts to track spending by merchant.
        </p>
      </div>
    );
  }

  const sorted = [...merchants].sort((a, b) =>
    sortBy === "spent"
      ? b.totalSpent - a.totalSpent
      : b.visitCount - a.visitCount
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="all">All time</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="spent">Most spent</option>
          <option value="visits">Most visits</option>
        </select>
      </div>

      <div className="space-y-1">
        {sorted.map((merchant) => (
          <div
            key={merchant.name}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">{getEmoji(merchant.name)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{merchant.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{merchant.visitCount} visit{merchant.visitCount !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{merchant.topCategory}</span>
                {merchant.lastVisit && (
                  <>
                    <span>·</span>
                    <span>
                      Last{" "}
                      {new Date(merchant.lastVisit).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold">
                Rp {merchant.totalSpent.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                {merchant.percentOfTotal.toFixed(1)}% of total
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
