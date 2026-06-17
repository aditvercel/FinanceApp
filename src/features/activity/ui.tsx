"use client";

import {
  AlertTriangle,
  ArrowUpCircle,
  Calendar,
  DollarSign,
  Download,
  PauseCircle,
  Pencil,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Share2,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActivity } from "./hooks";
import { AvatarCircle, AvatarStack } from "@/components/avatar";
const EVENT_ICONS: Record<string, { icon: typeof PlusCircle; color: string }> = {
  "entry.created": { icon: PlusCircle, color: "text-green-600" },
  "entry.edited": { icon: Pencil, color: "text-blue-600" },
  "entry.reverted": { icon: RotateCcw, color: "text-amber-600" },
  "entry.deleted": { icon: Trash2, color: "text-red-600" },
  "member.joined": { icon: UserPlus, color: "text-green-600" },
  "member.promoted": { icon: ArrowUpCircle, color: "text-blue-600" },
  "member.demoted": { icon: ArrowUpCircle, color: "text-amber-600" },
  "member.removed": { icon: UserMinus, color: "text-red-600" },
  "member.editor_requested": { icon: UserPlus, color: "text-amber-600" },
  "budget.set": { icon: DollarSign, color: "text-purple-600" },
  "budget.exceeded": { icon: AlertTriangle, color: "text-red-600" },
  "recurring.generated": { icon: RefreshCw, color: "text-cyan-600" },
  "recurring.created": { icon: Calendar, color: "text-indigo-600" },
  "recurring.paused": { icon: PauseCircle, color: "text-amber-600" },
  "report.exported": { icon: Download, color: "text-green-600" },
  "report.deleted": { icon: Trash2, color: "text-red-600" },
  "report.restored": { icon: RotateCcw, color: "text-blue-600" },
  "report.shared": { icon: Share2, color: "text-purple-600" },
};

function getDefaultIcon() {
  return { icon: PlusCircle, color: "text-gray-500" };
}

interface ActivityEvent {
  id: string;
  reportId?: string;
  eventType: string;
  actor?: { displayName: string };
  actorName?: string;
  actorAvatarUrl?: string | null;
  metadata?: {
    category?: string;
    amount?: number;
    previousAmount?: number;
    version?: number;
    targetDisplayName?: string;
    role?: string;
    percentage?: number;
    budgetAmount?: number;
    reportName?: string;
    entryId?: string;
  };
  createdAt: string;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(events: ActivityEvent[]) {
  const groups: Record<string, ActivityEvent[]> = {};
  for (const ev of events) {
    const day = new Date(ev.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(ev);
  }
  return groups;
}

function getEventDescription(event: ActivityEvent) {
  const meta = event.metadata || {};
  switch (event.eventType) {
    case "entry.created":
      return `added ${meta.category || "an entry"} · Rp ${(meta.amount || 0).toLocaleString()}`;
    case "entry.edited":
      return `edited ${meta.category || "an entry"} · Rp ${(meta.previousAmount || 0).toLocaleString()} → Rp ${(meta.amount || 0).toLocaleString()}`;
    case "entry.reverted":
      return `reverted entry to v${meta.version || "?"}`;
    case "entry.deleted":
      return `deleted ${meta.category || "an entry"}`;
    case "member.joined":
      return `${meta.targetDisplayName || "Someone"} joined as ${meta.role || "viewer"}`;
    case "member.promoted":
      return `${meta.targetDisplayName || "Someone"} promoted to ${meta.role || "editor"}`;
    case "member.demoted":
      return `${meta.targetDisplayName || "Someone"} demoted to ${meta.role || "viewer"}`;
    case "member.removed":
      return `${meta.targetDisplayName || "Someone"} was removed`;
    case "member.editor_requested":
      return `${meta.targetDisplayName || "Someone"} requested editor access`;
    case "budget.exceeded":
      return `${meta.category} budget exceeded (${Math.round(meta.percentage || 0)}%)`;
    case "budget.set":
      return `set ${meta.category} budget to Rp ${(meta.budgetAmount || 0).toLocaleString()}`;
    case "recurring.generated":
      return `Recurring: ${meta.category} generated · Rp ${(meta.amount || 0).toLocaleString()}`;
    case "recurring.created":
      return `created recurring template for ${meta.category}`;
    case "recurring.paused":
      return `paused recurring template`;
    case "report.exported":
      return "exported report";
    case "report.shared":
      return `shared report with ${meta.targetDisplayName || "someone"}`;
    default:
      return event.eventType?.replace(/\./g, " ") || "Unknown event";
  }
}

interface ActivityFeedProps {
  reportId?: string;
}

export function ActivityFeed({ reportId }: ActivityFeedProps) {
  const router = useRouter();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useActivity({ reportId });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const allEvents = data?.pages.flat() || [];

  const lastEventRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((day) => (
          <div key={day} className="space-y-3">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="space-y-1">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-start gap-3 p-2">
                  <div className="w-4 h-4 bg-gray-200 rounded mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-12 bg-gray-200 rounded" />
                    </div>
                    <div className="h-3 w-48 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No activity yet</p>
        <p className="text-sm mt-1">Events will appear here as you use the app.</p>
      </div>
    );
  }

  const grouped = groupByDay(allEvents);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, events]) => (
        <div key={day}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {day}
          </h3>
          <div className="space-y-1">
            {(() => {
              const rows: React.ReactNode[] = [];
              for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const entryId = event.metadata?.entryId;
                const next = events[i + 1];
                const isLast = i === events.length - 1;
                if (
                  entryId &&
                  next?.metadata?.entryId === entryId
                ) {
                  const actors = [event, next].map((ev) => {
                    const name = ev.actor?.displayName || ev.actorName || "You";
                    return { name, avatarUrl: ev.actorAvatarUrl };
                  });
                  const latest = next;
                  rows.push(
                    <div
                      key={`group-${entryId}-${i}`}
                      ref={isLast ? lastEventRef : undefined}
                      onClick={() => {
                        if (event.reportId && entryId) {
                          router.push(`/reports/${event.reportId}?entryId=${entryId}`);
                        } else if (event.reportId) {
                          router.push(`/reports/${event.reportId}`);
                        }
                      }}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                        event.reportId ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <AvatarStack users={actors} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {actors.map(a => a.name).join(", ")}
                          </span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {formatTimeAgo(latest.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-(--foreground) truncate">
                          {getEventDescription(latest)}
                        </p>
                        {latest.metadata?.reportName && (
                          <p className="text-xs text-gray-400 truncate">
                            {latest.metadata.reportName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                  i++;
                } else {
                  const name = event.actor?.displayName || event.actorName || "You";
                  rows.push(
                    <div
                      key={event.id}
                      ref={isLast ? lastEventRef : undefined}
                      onClick={() => {
                        const eId = event.metadata?.entryId;
                        if (event.reportId && eId) {
                          router.push(`/reports/${event.reportId}?entryId=${eId}`);
                        } else if (event.reportId) {
                          router.push(`/reports/${event.reportId}`);
                        }
                      }}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                        event.reportId ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <AvatarCircle name={name} avatarUrl={event.actorAvatarUrl} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {name}
                          </span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {formatTimeAgo(event.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-(--foreground) truncate">
                          {getEventDescription(event)}
                        </p>
                        {event.metadata?.reportName && (
                          <p className="text-xs text-gray-400 truncate">
                            {event.metadata.reportName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              }
              return rows;
            })()}
          </div>
        </div>
      ))}
      {isFetchingNextPage && (
        <div className="text-center py-4 text-sm text-gray-500">Loading more...</div>
      )}
    </div>
  );
}
