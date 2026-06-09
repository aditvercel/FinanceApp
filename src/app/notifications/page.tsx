"use client";

import { useRouter } from "next/navigation";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/features/notifications/hooks";
import { ArrowLeft, Loader2, Bell, CheckCheck } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getNotificationIcon(type: string): { icon: string; bg: string } {
  switch (type) {
    case "budget.warning":
      return { icon: "⚠️", bg: "bg-amber-100" };
    case "budget.exceeded":
      return { icon: "🔴", bg: "bg-red-100" };
    case "member.joined":
      return { icon: "📢", bg: "bg-blue-100" };
    case "member.promoted":
      return { icon: "⬆️", bg: "bg-blue-100" };
    case "member.demoted":
      return { icon: "⬇️", bg: "bg-amber-100" };
    case "member.editor_requested":
      return { icon: "🙋", bg: "bg-amber-100" };
    case "recurring.generated":
      return { icon: "🔄", bg: "bg-purple-100" };
    case "recurring.reminder":
      return { icon: "⏰", bg: "bg-yellow-100" };
    case "export.ready":
      return { icon: "✅", bg: "bg-emerald-100" };
    case "report.shared":
      return { icon: "🔗", bg: "bg-indigo-100" };
    case "entry.created":
      return { icon: "🛒", bg: "bg-green-100" };
    case "entry.edited":
      return { icon: "✏️", bg: "bg-yellow-100" };
    case "entry.reverted":
      return { icon: "↩️", bg: "bg-orange-100" };
    case "entry.deleted":
      return { icon: "🗑️", bg: "bg-red-100" };
    case "report.updated":
      return { icon: "✏️", bg: "bg-blue-100" };
    case "report.deleted":
      return { icon: "🗑️", bg: "bg-red-100" };
    default:
      return { icon: "🔔", bg: "bg-gray-100" };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const all = (notifications ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    actionUrl?: string;
    isRead: boolean;
    createdAt: string;
  }>;

  const unread = all.filter((n) => !n.isRead);
  const read = all.filter((n) => n.isRead);

  const handleMarkRead = (n: any) => {
    markRead.mutate(n.id);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

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
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unread.length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : all.length > 0 ? (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Unread
              </h2>
              <div className="space-y-2">
                {unread.map((n) => {
                  const { icon, bg } = getNotificationIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleMarkRead(n)}
                      className="w-full flex items-start gap-3 p-4 bg-(--card) border border-blue-100 rounded-xl shadow-sm text-left hover:bg-blue-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-lg shrink-0`}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-(--foreground)">{n.title}</p>
                        <p className="text-xs text-(--foreground) mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Earlier
              </h2>
              <div className="space-y-2">
                {read.map((n) => {
                  const { icon, bg } = getNotificationIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead.mutate(n.id);
                        if (n.actionUrl) router.push(n.actionUrl);
                      }}
                      className="w-full flex items-start gap-3 p-4 bg-(--card) border border-gray-100 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-lg shrink-0`}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-(--foreground)">{n.title}</p>
                        <p className="text-xs text-(--foreground) mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-(--foreground) font-medium">No notifications</p>
          <p className="text-sm text-gray-500 mt-1">
            You are all caught up!
          </p>
        </div>
      )}
    </div>
  );
}
