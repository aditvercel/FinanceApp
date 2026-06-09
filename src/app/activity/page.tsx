"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActivity } from "@/features/activity/hooks";
import { ArrowLeft, Loader2, ChevronDown } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function getEventIcon(eventType: string): string {
  if (eventType.startsWith("entry.created")) return "🛒";
  if (eventType.startsWith("entry.edited")) return "✏️";
  if (eventType.startsWith("entry.reverted")) return "↩️";
  if (eventType.startsWith("entry.deleted")) return "🗑️";
  if (eventType.startsWith("member.joined")) return "📥";
  if (eventType.startsWith("member.promoted")) return "⭐";
  if (eventType.startsWith("member.removed")) return "🚫";
  if (eventType.startsWith("budget.set")) return "💰";
  if (eventType.startsWith("budget.exceeded")) return "⚠️";
  if (eventType.startsWith("recurring.generated")) return "🔄";
  if (eventType.startsWith("recurring.created")) return "🔄";
  if (eventType.startsWith("recurring.paused")) return "⏸️";
  if (eventType.startsWith("report.exported")) return "📄";
  if (eventType.startsWith("report.deleted")) return "🗑️";
  if (eventType.startsWith("report.restored")) return "♻️";
  return "📌";
}

function getEventDescription(event: any): string {
  const actor = event.actorName || "Someone";
  const meta = event.metadata || {};
  switch (event.eventType) {
    case "entry.created":
      return `${actor} added ${meta.category || "an entry"}`;
    case "entry.edited":
      return `${actor} edited ${meta.category || "an entry"}`;
    case "entry.reverted":
      return `${actor} reverted ${meta.category || "an entry"} to v${meta.version || "?"}`;
    case "member.joined":
      return `${meta.targetDisplayName || "Someone"} joined`;
    case "member.promoted":
      return `${meta.targetDisplayName || "Someone"} promoted to ${meta.role || "editor"}`;
    case "budget.exceeded":
      return `${meta.category} budget exceeded (${meta.percentage?.toFixed(0)}%)`;
    case "recurring.generated":
      return `Recurring: ${meta.category || "Entry"} generated`;
    default:
      return `${actor} ${event.eventType.replace(/\./g, " ")}`;
  }
}

const EVENT_TYPES = [
  "All",
  "entry.created",
  "entry.edited",
  "member.joined",
  "budget.exceeded",
  "recurring.generated",
] as const;

export default function ActivityPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState("All");
  const [showFilter, setShowFilter] = useState(false);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivity({ limit: 10 });

  const allEvents = data?.pages?.flat() ?? [];
  const filteredEvents =
    filterType === "All"
      ? allEvents
      : allEvents.filter((e: any) => e.eventType === filterType);

  const groupedByDay: Record<string, any[]> = {};
  for (const event of filteredEvents) {
    const day = new Date(event.createdAt).toDateString();
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(event);
  }

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 hover:bg-(--muted)rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-(--foreground)" />
          </button>
          <h1 className="text-2xl font-bold">Activity</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1 text-sm text-(--foreground) px-3 py-1.5 border border-(--border) rounded-lg hover:bg-gray-50"
          >
            {filterType === "All" ? "All Types" : filterType.split(".")[1] || filterType}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-1 bg-(--card) border border-(--border) rounded-lg shadow-lg z-10 w-48">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setShowFilter(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    filterType === type ? "text-blue-600 font-medium" : "text-gray-700"
                  }`}
                >
                  {type === "All" ? "All Types" : type.split(".").slice(1).join(" ")}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : Object.keys(groupedByDay).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByDay).map(([dayKey, events]) => (
            <div key={dayKey}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {getDayLabel(events[0].createdAt)}
              </h3>
              <div className="space-y-2">
                {events.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-(--card) border border-gray-100 rounded-lg"
                  >
                    <span className="text-lg mt-0.5">
                      {getEventIcon(event.eventType)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {getEventDescription(event)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {event.metadata?.amount &&
                          `${formatCurrency(event.metadata.amount)} · `}
                        {timeAgo(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Load more
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-(--foreground)">No activity yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Changes to your reports will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
