"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tab } from "@headlessui/react";
import { useAuth } from "@/lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useReport, useRequestEditorAccess, useManageMember } from "@/features/finance/reports/hooks";
import { useToast } from "@/lib/toat";

import { useActivity } from "@/features/activity/hooks";
import {
  NetBalanceChart,
  IncomeExpenseBar,
  ExpenseDoughnut,
} from "@/features/finance/dashboard/charts";
import { useInsights } from "@/features/insights/hooks";
import {
  ArrowLeft,
  Share2,
  Settings,
  Users,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  Check,
  Copy,
} from "lucide-react";
import Link from "next/link";

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

function getActivityIcon(eventType: string): string {
  if (eventType.startsWith("entry.")) return "🛒";
  if (eventType.startsWith("member.")) return "📢";
  if (eventType.startsWith("budget.")) return "⚠️";
  if (eventType.startsWith("recurring.")) return "🔄";
  if (eventType.startsWith("report.") && eventType.endsWith(".deleted")) return "🗑️";
  if (eventType.startsWith("report.") && eventType.endsWith(".updated")) return "✏️";
  if (eventType.startsWith("report.")) return "📄";
  return "📌";
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmingEntry, setConfirmingEntry] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<any>(null);
  const [requestSent, setRequestSent] = useState(false);
  const requestEditor = useRequestEditorAccess();
  const manageMember = useManageMember();
  const { toast } = useToast();

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", id] }),
  });

  const editEntry = useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: any }) => {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", id] }),
  });

  const { data: report, isLoading: reportLoading } = useReport(id.toString());

  const { data: activityPages } = useActivity({ reportId: id.toString(), limit: 20 });
  const activities = activityPages?.pages?.flat() ?? [];

  const { data: insights } = useInsights(id.toString());

  const dashboardQuery = useQuery({
    queryKey: ["report-dashboard", id],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${id}/dashboard?period=monthly`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json.data as {
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
        entries: Array<{ type: string; amount: number; category: string; entry_date: string }>;
      };
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["entries", id],
    queryFn: async () => {
      const res = await fetch(`/api/entries?reportId=${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json.data as Array<{
        id: string;
        type: string;
        amount: number;
        category: string;
        note?: string;
        entryDate: string;
        createdAt: string;
        createdBy: { displayName: string };
      }>;
    },
  });

  const tabs = ["Overview", "Entries", "Charts", "Activity"];

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalIncome = dashboardQuery.data?.totalIncome ?? 0;
  const totalExpense = dashboardQuery.data?.totalExpense ?? 0;
  const netBalance = dashboardQuery.data?.netBalance ?? (totalIncome - totalExpense);

  const allEntries = dashboardQuery.data?.entries ?? [];
  const dayMap = new Map<string, number>();
  const categoryMap = new Map<string, { total: number; count: number }>();
  let totalExpenseAmount = 0;
  for (const e of allEntries) {
    const amt = Number(e.amount);
    const day = e.entry_date?.slice(0, 10) ?? "unknown";
    const prev = dayMap.get(day) ?? 0;
    dayMap.set(day, prev + (e.type === "income" ? amt : -amt));
    if (e.type === "expense") {
      if (!categoryMap.has(e.category)) categoryMap.set(e.category, { total: 0, count: 0 });
      const c = categoryMap.get(e.category)!;
      c.total += amt;
      c.count++;
      totalExpenseAmount += amt;
    }
  }
  const sortedDays = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const chartLabels = sortedDays.map(([d]) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  let running = 0;
  const chartAmounts = sortedDays.map(([, v]) => {
    running += v;
    return running;
  });

  const weekMap = new Map<string, { income: number; expense: number }>();
  for (const e of allEntries) {
    const dt = new Date(e.entry_date + "T00:00:00");
    const weekStart = new Date(dt);
    weekStart.setDate(dt.getDate() - dt.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, { income: 0, expense: 0 });
    const w = weekMap.get(key)!;
    const amt = Number(e.amount);
    if (e.type === "income") w.income += amt;
    else w.expense += amt;
  }
  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const barLabels = sortedWeeks.map(([w]) => {
    const dt = new Date(w + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  const barIncome = sortedWeeks.map(([, w]) => w.income);
  const barExpense = sortedWeeks.map(([, w]) => w.expense);

  const topCategories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      amount: data.total,
      pct: totalExpenseAmount > 0 ? Math.round((data.total / totalExpenseAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const entriesByDate: Record<string, any[]> = {};
  if (entriesQuery.data) {
    for (const entry of entriesQuery.data) {
      const key = entry.entryDate;
      if (!entriesByDate[key]) entriesByDate[key] = [];
      entriesByDate[key].push(entry);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(true)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-4 h-4 text-black" />
            </button>
            <Link
              href={`/settings?reportId=${id}`}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {report?.name ?? "Report"}
        </h1>
        {report?.reportId && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(report.reportId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 text-xs text-(--muted-foreground) hover:text-black mt-0.5 group"
          >
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-gray-200">
              {report.reportId}
            </code>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            <span className="text-(--muted-foreground)">{copied ? "Copied!" : "Copy"}</span>
          </button>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Users className="w-4 h-4 text-(--muted-foreground)" />
          <span className="text-sm text-(--muted-foreground)">
            {report?.memberCount && report.memberCount > 1
              ? `${report.memberCount} members`
              : "just you"}
          </span>
          {report?.role && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              report.role === "owner" ? "bg-(--accent)/15 text-(--accent)" :
              report.role === "editor" ? "bg-(--primary)/15 text-(--primary)" :
              "bg-(--muted) text-(--muted-foreground)"
            }`}>
              {report.role}
            </span>
          )}
          {report?.role === "viewer" && (
            <button
              onClick={() => {
                if (requestSent) return;
                requestEditor.mutate(id, {
                  onSuccess: () => setRequestSent(true),
                  onError: () => setRequestSent(false),
                });
              }}
              disabled={requestEditor.isPending || requestSent}
              className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
                requestSent
                  ? "bg-(--success)/15 text-(--success) cursor-default"
                  : "bg-(--warning)/15 text-(--warning) hover:bg-(--warning)/25"
              } disabled:opacity-50`}
            >
              {requestSent ? (
                <Check className="w-3 h-3" />
              ) : (
                <UserPlus className="w-3 h-3" />
              )}
              {requestSent ? "Requested" : requestEditor.isPending ? "Requesting..." : "Request Edit"}
            </button>
          )}
          {report?.role === "owner" && (
            <button
              onClick={() => setShowMembers(true)}
              className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--primary)/15 text-(--primary) hover:bg-(--primary)/25 transition-colors"
            >
              <Users className="w-3 h-3" />
              Manage
            </button>
          )}
        </div>
      </header>

      <Tab.Group>
        <Tab.List className="flex border-b border-gray-200 bg-white px-2 sticky top-0 z-10">
          {tabs.map((tab) => (
            <Tab
              key={tab}
              className="flex-1 py-3 text-center text-sm font-medium focus:outline-none ui-selected:text-blue-600 ui-selected:border-b-2 ui-selected:border-blue-600 text-(--muted-foreground) hover:text-gray-700 transition-colors"
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="flex-1 overflow-y-auto">
          <Tab.Panel className="p-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-(--muted-foreground)">
                  Net Balance
                </h2>
                <span className="text-xs text-(--muted-foreground)">This month</span>
              </div>
              <div className="text-2xl font-bold mb-2 currency">
                {formatCurrency(netBalance)}
              </div>
              <div className="h-48"><NetBalanceChart
                labels={chartLabels.length > 0 ? chartLabels : ["This month"]}
                amounts={chartAmounts.length > 0 ? chartAmounts : [0]}
              /></div>
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-500">
                  <TrendingDown className="w-4 h-4" />
                  <span>{formatCurrency(totalExpense)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-(--muted-foreground) mb-3">
                Top Categories
              </h2>
              <div className="h-48"><ExpenseDoughnut
                labels={topCategories.map(c => c.name)}
                amounts={topCategories.map(c => c.amount)}
              /></div>
              <div className="space-y-2 mt-3">
                {topCategories.slice(0, 5).map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className="text-(--muted-foreground) w-8 text-right">
                        {cat.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    <span className="font-semibold text-sm">
                      AI Insights
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-(--muted-foreground) group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  {insights && insights.length > 0 ? (
                    insights.slice(0, 3).map((insight: any, i: number) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span>
                            {insight.severity === "warning"
                              ? "⚠️"
                              : insight.severity === "positive"
                              ? "✅"
                              : "💡"}
                          </span>
                          <div>
                            <p className="font-medium">{insight.title}</p>
                            <p className="text-black text-xs mt-0.5">
                              {insight.body}
                            </p>
                            {insight.basis && (
                              <p className="text-(--muted-foreground) text-xs mt-1">
                                {insight.basis}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-(--muted-foreground)">
                      Not enough data yet. Add expenses to get insights.
                    </p>
                  )}
                </div>
              </details>
            </div>
          </Tab.Panel>

          <Tab.Panel className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--muted-foreground)" />
              <input
                type="text"
                placeholder="Search entries..."
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {entriesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-(--muted-foreground)" />
              </div>
            ) : Object.keys(entriesByDate).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(entriesByDate).map(([date, entries]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-(--muted-foreground) mb-2">
                      {new Date(date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "long", month: "long", day: "numeric" }
                      )}
                    </h3>
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="relative group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                entry.type === "income"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {entry.type === "income" ? "↑" : "↓"}
                            </span>
                            <div>
                              <p className="font-medium text-sm">
                                {entry.category}
                              </p>
                              <p className="text-xs text-(--muted-foreground)">
                                {entry.note || ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium text-sm ${
                                entry.type === "income"
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {entry.type === "income" ? "+" : "-"}
                              {formatCurrency(entry.amount)}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Pencil className="w-3.5 h-3.5 text-(--muted-foreground)" />
                              </button>
                              <button
                                onClick={() => setConfirmingEntry(entry.id)}
                                className="p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-(--muted-foreground)">No entries yet.</p>
                <p className="text-sm text-(--muted-foreground) mt-1">
                  Tap + to add your first entry.
                </p>
              </div>
            )}
          </Tab.Panel>

          <Tab.Panel className="p-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-(--muted-foreground) mb-3">
                Income vs Expense
              </h2>
              <div className="h-48"><IncomeExpenseBar
                labels={barLabels.length > 0 ? barLabels : ["This month"]}
                income={barIncome.length > 0 ? barIncome : [0]}
                expense={barExpense.length > 0 ? barExpense : [0]}
              /></div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-(--muted-foreground) mb-3">
                By Category
              </h2>
              <div className="h-48"><ExpenseDoughnut
                labels={topCategories.map(c => c.name)}
                amounts={topCategories.map(c => c.amount)}
              /></div>
            </div>
          </Tab.Panel>



          <Tab.Panel className="p-4">
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg"
                  >
                    <span className="text-lg mt-0.5">
                      {getActivityIcon(event.eventType)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {event.actorName}{" "}
                        {event.eventType.replace(/\./g, " ")}
                      </p>
                      <p className="text-xs text-(--muted-foreground) mt-0.5">
                        {timeAgo(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-(--muted-foreground)">
                  No activity yet. Changes will appear here.
                </p>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {confirmingEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Delete Entry</h3>
            <p className="text-sm text-black">
              Are you sure you want to delete this entry? It will be hidden from the report.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmingEntry(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteEntry.mutate(confirmingEntry);
                  setConfirmingEntry(null);
                }}
                disabled={deleteEntry.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {deleteEntry.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={(data) => {
            editEntry.mutate({ entryId: editingEntry.id, data });
            setEditingEntry(null);
          }}
          isPending={editEntry.isPending}
        />
      )}

      {showMembers && report && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Members</h3>
              <button onClick={() => setShowMembers(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {(report as any).members?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      m.role === "owner" ? "bg-(--accent)/15 text-(--accent)" :
                      m.role === "editor" ? "bg-(--primary)/15 text-(--primary)" :
                      "bg-(--muted) text-(--muted-foreground)"
                    }`}>
                      {m.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.displayName ?? "User"}</p>
                      <p className="text-xs text-(--muted-foreground) capitalize">{m.role}</p>
                    </div>
                  </div>
                  {report.role === "owner" && m.role !== "owner" && (
                    <div className="flex items-center gap-1">
                      {m.role === "viewer" ? (
                        <button
                          onClick={() => {
                            const name = m.displayName ?? "User";
                            manageMember.mutate(
                              { reportId: id, userId: m.userId, action: "promote" },
                              {
                                onSuccess: () => toast(`${name} promoted to editor`, "success"),
                                onError: () => toast("Failed to promote member", "error"),
                              }
                            );
                          }}
                          disabled={manageMember.isPending}
                          className="p-2 hover:bg-(--primary)/10 rounded-lg text-(--primary) disabled:opacity-50"
                          title="Promote to editor"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const name = m.displayName ?? "User";
                            manageMember.mutate(
                              { reportId: id, userId: m.userId, action: "demote" },
                              {
                                onSuccess: () => toast(`${name} demoted to viewer`, "info"),
                                onError: () => toast("Failed to demote member", "error"),
                              }
                            );
                          }}
                          disabled={manageMember.isPending}
                          className="p-2 hover:bg-(--warning)/10 rounded-lg text-(--warning) disabled:opacity-50"
                          title="Demote to viewer"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmRemove(m)}
                        disabled={manageMember.isPending}
                        className="p-2 hover:bg-(--destructive)/10 rounded-lg text-(--destructive) disabled:opacity-50"
                        title="Remove from report"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showShare && report?.reportId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Share Report</h3>
              <button onClick={() => setShowShare(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-center space-y-2">
              <p className="text-xs text-(--muted-foreground)">Report Code</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{report.reportId}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report.reportId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-(--muted-foreground) font-medium">Share via</p>
              <button
                onClick={() => {
                  const text = encodeURIComponent(
                    `Join my report "${report.name}" on FinanceApp!\n\nReport code: ${report.reportId}\n\nOpen the app and go to Join Report to enter this code.`
                  );
                  window.open(`https://wa.me/?text=${text}`, "_blank");
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">💬</span>
                <div className="text-left">
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-(--muted-foreground)">Send invitation link</p>
                </div>
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/join/${report.reportId}`;
                  if (navigator.share) {
                    navigator.share({ title: report.name, text: `Join my report "${report.name}"`, url });
                  } else {
                    navigator.clipboard.writeText(url);
                    toast("Invitation link copied to clipboard", "success");
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">🔗</span>
                <div className="text-left">
                  <p className="text-sm font-medium">Copy invitation link</p>
                  <p className="text-xs text-(--muted-foreground)">Share with anyone</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-(--card) rounded-xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Remove Member</h3>
              <button onClick={() => setConfirmRemove(null)} className="p-1 hover:bg-(--muted) rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm" style={{color: "var(--muted-foreground)"}}>
              Remove <strong>{confirmRemove.displayName ?? "this user"}</strong> from the report?
              They will lose access to all entries and data.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 border border-(--border) rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = confirmRemove.displayName ?? "this user";
                  manageMember.mutate(
                    { reportId: id, userId: confirmRemove.userId, action: "remove" },
                    {
                      onSuccess: () => {
                        toast(`${name} removed from report`, "info");
                        setConfirmRemove(null);
                      },
                      onError: () => {
                        toast("Failed to remove member", "error");
                        setConfirmRemove(null);
                      },
                    }
                  );
                }}
                disabled={manageMember.isPending}
                className="px-4 py-2 bg-(--destructive) text-white rounded-lg text-sm disabled:opacity-50"
              >
                {manageMember.isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditEntryModal({
  entry,
  onClose,
  onSave,
  isPending,
}: {
  entry: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState(entry.type);
  const [amount, setAmount] = useState(String(entry.amount));
  const [category, setCategory] = useState(entry.category);
  const [note, setNote] = useState(entry.note || "");
  const [entryDate, setEntryDate] = useState(entry.entryDate);

  const displayAmount = amount ? parseInt(amount, 10).toLocaleString("id-ID") : "";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Entry</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setType("expense")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              type === "expense" ? "bg-white shadow-sm" : "text-(--muted-foreground)"
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setType("income")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              type === "income" ? "bg-white shadow-sm" : "text-(--muted-foreground)"
            }`}
          >
            Income
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rp)</label>
          <input
            type="text"
            inputMode="numeric"
            value={displayAmount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-xl font-semibold"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {["Food", "Transport", "Utilities", "Shopping", "Health", "Entertainment", "Other"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  category === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave({ type, amount: parseFloat(amount) || 0, category, note, entryDate })}
            disabled={isPending || !amount}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
