"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReports } from "@/features/finance/reports/api";
import { useActivity } from "@/features/activity/hooks";
import { useAuth } from "@/lib/auth-provider";
import { useTheme } from "@/lib/theme-provider";
import {
  Plus,
  Bell,
  Settings,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getActivityIcon(eventType: string): string {
  if (eventType.startsWith("entry.")) return "🛒";
  if (eventType.startsWith("member.")) return "📢";
  if (eventType.startsWith("budget.")) return "⚠️";
  if (eventType.startsWith("recurring.")) return "🔄";
  if (eventType.startsWith("report.") && eventType.endsWith(".deleted"))
    return "🗑️";
  if (eventType.startsWith("report.") && eventType.endsWith(".updated"))
    return "✏️";
  if (eventType.startsWith("report.")) return "📄";
  return "📌";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomePage() {
  const { user } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<{
    action: "edit" | "delete";
    report: any;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  const editReport = useMutation({
    mutationFn: async ({
      reportId,
      name,
    }: {
      reportId: string;
      name: string;
    }) => {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  const {
    data: reports,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  const { data: activityPages } = useActivity({ limit: 3 });
  const activities = activityPages?.pages?.flat() ?? [];

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "home"],
    queryFn: async () => {
      const res = await fetch("/api/reports/dashboard?period=monthly");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json.data as {
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
      };
    },
  });

  const totalIncome = dashboardQuery.data?.totalIncome ?? 0;
  const totalExpense = dashboardQuery.data?.totalExpense ?? 0;
  const netBalance =
    dashboardQuery.data?.netBalance ?? totalIncome - totalExpense;

  if (isLoading) {
    return (
      <div className="p-4 pb-16">
        <header className="flex items-center justify-between mb-6">
          <div className="w-40 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </header>
        <div className="space-y-4">
          <div className="h-32 bg-(--muted)rounded-xl animate-pulse" />
          <div className="h-24 bg-(--muted)rounded-xl animate-pulse" />
          <div className="h-24 bg-(--muted)rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Finance Tracker</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-(--muted) rounded-lg"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon
                className="w-5 h-5"
                style={{ color: "var(--muted-foreground)" }}
              />
            ) : (
              <Sun
                className="w-5 h-5"
                style={{ color: "var(--muted-foreground)" }}
              />
            )}
          </button>
          <Link
            href="/notifications"
            className="p-2 hover:bg-(--muted) rounded-lg relative"
            aria-label="Notifications"
          >
            <Bell
              className="w-5 h-5"
              style={{ color: "var(--muted-foreground)" }}
            />
          </Link>
          <Link
            href="/settings"
            className="p-2 hover:bg-(--muted) rounded-lg"
            aria-label="Settings"
          >
            <Settings
              className="w-5 h-5"
              style={{ color: "var(--muted-foreground)" }}
            />
          </Link>
        </div>
      </header>

      <section className="mb-6">
        <div
          className="rounded-xl p-5 border"
          style={{
            background:
              "linear-gradient(135deg, rgba(13,115,119,0.08), rgba(201,123,58,0.06))",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm text-(--foreground) font-medium mb-1">
            This Month
          </p>
          <div className="text-3xl font-bold mb-3 currency">
            {formatCurrency(netBalance)}
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span>Income: {formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <TrendingDown className="w-4 h-4" />
              <span>Expenses: {formatCurrency(totalExpense)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Reports</h2>
          <div className="flex gap-2">
            <Link
              href="/reports/new"
              className="flex items-center gap-1 px-3 py-1.5 bg-(--primary) text-(--primary-foreground) text-sm rounded-lg hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create
            </Link>
            <Link
              href="/reports/join"
              className="flex items-center gap-1 px-3 py-1.5 bg-(--muted) text-(--muted-foreground) text-sm rounded-lg hover:opacity-80 transition-colors"
            >
              <Users className="w-4 h-4" />
              Join
            </Link>
          </div>
        </div>

        {reports && reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report) => {
              const isOwner = user?.id === (report as any).ownerId;
              return (
                <div
                  key={report.id}
                  className="relative group bg-(--card) border border-(--border) rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <Link href={`/reports/${report.id}`} className="block p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {(report as any).emoji || "🏠"}
                        </span>
                        <div>
                          <h3 className="font-semibold text-(--foreground)">
                            {report.name}
                          </h3>
                          <p className="text-sm text-(--muted-foreground)">
                            {report.memberCount && report.memberCount > 1
                              ? `${report.memberCount} members`
                              : "just you"}
                            {isOwner && " · owner"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-(--muted-foreground)" />
                    </div>
                    {(report as any).budgetWarnings &&
                      (report as any).budgetWarnings.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {(report as any).budgetWarnings.map(
                            (
                              w: { category: string; status: string },
                              i: number,
                            ) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                  w.status === "exceeded"
                                    ? "bg-(--destructive)/10 text-(--destructive)"
                                    : "bg-(--warning)/10 text-(--warning)"
                                }`}
                              >
                                {w.status === "exceeded" ? "🔴" : "⚠️"}{" "}
                                {w.category} over budget
                              </span>
                            ),
                          )}
                        </div>
                      )}
                  </Link>
                  <div className="absolute top-6 right-10 flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setRenameValue(report.name);
                        setConfirming({ action: "edit", report });
                      }}
                      className="p-1.5 bg-(--card) border border-(--border) rounded-lg hover:bg-gray-50 shadow-sm"
                      title="Edit report name"
                    >
                      <Pencil className="w-3.5 h-3.5 text-(--muted-foreground)" />
                    </button>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setConfirming({ action: "delete", report });
                        }}
                        className="p-1.5 bg-(--card) border border-(--destructive)/30 rounded-lg hover:bg-(--destructive)/10 shadow-sm"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-(--border)">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-700 font-medium mb-1">No reports yet</p>
            <p className="text-sm text-(--muted-foreground) mb-4">
              Create a report to start tracking your finances.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/reports/new"
                className="inline-flex items-center gap-1 px-4 py-2 bg-(--primary) text-(--primary-foreground) rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Report
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1 px-4 py-2 border border-(--border) rounded-lg text-sm text-gray-700"
              >
                Show onboarding
              </Link>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link
            href="/activity"
            className="text-sm"
            style={{ color: "var(--primary)" }}
          >
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.slice(0, 3).map((event: any) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-(--card) border border-(--border) rounded-lg"
              >
                <span className="text-lg mt-0.5">
                  {getActivityIcon(event.eventType)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {event.actorName}{" "}
                    {event.eventType === "entry.created"
                      ? "added"
                      : event.eventType === "entry.edited"
                        ? "edited"
                        : event.eventType === "entry.reverted"
                          ? "reverted"
                          : event.eventType.replace(/\./g, " ")}
                    {event.metadata?.category && ` ${event.metadata.category}`}
                  </p>
                  <p className="text-xs text-(--muted-foreground) mt-0.5">
                    {event.metadata?.amount &&
                      `${formatCurrency(event.metadata.amount)} · `}
                    {timeAgo(event.createdAt)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p
              className="text-sm text-center py-4"
              style={{ color: "var(--muted-foreground)" }}
            >
              No recent activity.
            </p>
          )}
        </div>
      </section>

      {confirming && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-(--card) rounded-xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            {confirming.action === "delete" ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Delete Report</h3>
                  <button
                    onClick={() => setConfirming(null)}
                    className="p-1 hover:bg-(--muted) rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {user?.id === confirming.report.ownerId ? (
                  <>
                    <p className="text-sm text-(--foreground)">
                      Are you sure you want to delete{" "}
                      <strong>{confirming.report.name}</strong>? This will hide
                      it from all members. It can be recovered within 30 days.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-4 py-2 border border-(--border) rounded-lg text-sm text-(--foreground)"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          deleteReport.mutate(confirming.report.id);
                          setConfirming(null);
                        }}
                        disabled={deleteReport.isPending}
                        className="px-4 py-2 bg-(--destructive) text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        {deleteReport.isPending ? "Deleting..." : "Yes, Delete"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-(--foreground)">
                      You need permission from the owner to delete{" "}
                      <strong>{confirming.report.name}</strong>. Contact the
                      report owner to request deletion.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-4 py-2 bg-(--primary) text-(--primary-foreground) rounded-lg text-sm"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-4 py-2 border border-(--border) rounded-lg text-sm text-(--foreground)"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Rename Report</h3>
                  <button
                    onClick={() => setConfirming(null)}
                    className="p-1 hover:bg-(--muted)rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {user?.id === confirming.report.ownerId ? (
                  <>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full py-2 px-3 border border-(--border) rounded-lg text-sm bg-(--background) text-(--foreground)"
                      placeholder="Report name"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-4 py-2 border border-(--border) rounded-lg text-sm text-(--foreground)"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (renameValue.trim()) {
                            editReport.mutate({
                              reportId: confirming.report.id,
                              name: renameValue.trim(),
                            });
                            setConfirming(null);
                          }
                        }}
                        disabled={editReport.isPending || !renameValue.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        {editReport.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-(--foreground)">
                      You need permission from the owner to rename{" "}
                      <strong>{confirming.report.name}</strong>. Contact the
                      report owner to request a name change.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-4 py-2 bg-(--primary) text-(--primary-foreground) rounded-lg text-sm"
                      >
                        OK
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
