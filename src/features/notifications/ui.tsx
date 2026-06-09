"use client";

import {
  AlertTriangle,
  Bell,
  Download,
  RefreshCw,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useMarkAllRead, useMarkRead, useNotifications } from "./hooks";

const TYPE_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  "budget.warning": { icon: AlertTriangle, color: "text-amber-500" },
  "budget.exceeded": { icon: AlertTriangle, color: "text-red-500" },
  "member.joined": { icon: UserPlus, color: "text-green-500" },
  "member.promoted": { icon: UserPlus, color: "text-blue-500" },
  "member.demoted": { icon: UserPlus, color: "text-amber-500" },
  "member.editor_requested": { icon: UserPlus, color: "text-amber-500" },
  "recurring.generated": { icon: RefreshCw, color: "text-cyan-500" },
  "recurring.reminder": { icon: Bell, color: "text-blue-500" },
  "export.ready": { icon: Download, color: "text-purple-500" },
  "report.shared": { icon: Share2, color: "text-indigo-500" },
  "report.deleted": { icon: Trash2, color: "text-red-500" },
  "entry.created": { icon: Bell, color: "text-green-500" },
  "entry.edited": { icon: Bell, color: "text-yellow-500" },
  "entry.reverted": { icon: Bell, color: "text-orange-500" },
  "entry.deleted": { icon: Trash2, color: "text-red-500" },
};

function getIcon(type: string) {
  return TYPE_ICONS[type] || { icon: Bell, color: "text-gray-500" };
}

function formatTime(dateStr: string) {
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

export function NotificationList() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-16">
        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="font-medium text-gray-700">No notifications</h3>
        <p className="text-sm text-gray-500 mt-1">
          You are all caught up!
        </p>
      </div>
    );
  }

  const unread = notifications.filter((n: any) => !n.isRead);
  const read = notifications.filter((n: any) => n.isRead);

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-(--card) z-10">
        <h2 className="text-lg font-bold">Notifications</h2>
        {unread.length > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {unread.length > 0 && (
        <div>
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Unread
            </span>
          </div>
          {unread.map((n: any) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={() => markRead.mutate(n.id)} />
          ))}
        </div>
      )}

      <div className="px-4 pt-4 pb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Earlier
        </span>
      </div>
      {read.length === 0 && unread.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No notifications yet.</div>
      ) : (
        read.map((n: any) => (
          <NotificationCard key={n.id} notification={n} />
        ))
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: any;
  onMarkRead?: () => void;
}) {
  const { icon: Icon, color } = getIcon(notification.type);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 transition-colors hover:bg-gray-50 ${
        !notification.isRead ? "bg-blue-50/50" : ""
      }`}
      onClick={() => {
        if (!notification.isRead && onMarkRead) onMarkRead();
        if (notification.actionUrl) globalThis.window.location.href = notification.actionUrl;
      }}
      role="button"
      tabIndex={0}
    >
      <div className={`mt-0.5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"}`}>
            {notification.title}
          </p>
          {!notification.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />}
        </div>
        <p className="text-sm text-(--foreground) mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>
      </div>
    </div>
  );
}
