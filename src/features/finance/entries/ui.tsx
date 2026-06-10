"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, Loader2, Lock, Check } from "lucide-react";
import { useCreateEntry } from "./hooks";
import { useCategories } from "@/features/finance/categories/hooks";
import type { ReportCategory } from "@/features/finance/categories/api";
import { ReceiptScanFlow } from "./scan/ui";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const FALLBACK_CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

const LAST_REPORT_KEY = "finance_last_report_id";
const LAST_CATEGORY_KEY = "finance_last_category";

interface AddExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedReportId?: string;
  lockedReportName?: string;
  onScanClick?: () => void;
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  lockedReportId,
  lockedReportName,
  onScanClick,
}: AddExpenseSheetProps) {
  const [showScan, setShowScan] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(
    () => safeGetItem(LAST_CATEGORY_KEY) || FALLBACK_CATEGORIES[0]
  );
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [manualReportId, setManualReportId] = useState(
    () => safeGetItem(LAST_REPORT_KEY) || ""
  );
  const [reports, setReports] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const reportId = lockedReportId || manualReportId;

  const createEntry = useCreateEntry();
  const { data: fetchedCategories, isLoading: categoriesLoading } = useCategories(
    lockedReportId || manualReportId
  );

  const categories =
    fetchedCategories && fetchedCategories.length > 0
      ? fetchedCategories.map((c: ReportCategory) => c.name)
      : FALLBACK_CATEGORIES;

  useEffect(() => {
    if (!open) return;
    setTimeout(() => amountRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setReportsLoading(true);
    fetch("/api/reports")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setReports(json.data);
      })
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, [open]);

  const handleSave = useCallback(async () => {
    if (!amount || !category || !reportId) return;

    const numAmount = Number.parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) return;

    safeSetItem(LAST_REPORT_KEY, reportId);
    safeSetItem(LAST_CATEGORY_KEY, category);

    try {
      await createEntry.mutateAsync({
        reportId,
        type,
        amount: numAmount,
        category,
        note: note || undefined,
        entryDate: date,
      });
      onOpenChange(false);
      setAmount("");
      setNote("");
      setType("expense");
      setCategory(categories[0] || FALLBACK_CATEGORIES[0]);
    } catch {
      /* error handled by react-query */
    }
  }, [amount, category, manualReportId, type, note, date, createEntry, onOpenChange, lockedReportId]);

  if (!open) return null;

  const isValid = Number.parseFloat(amount) > 0 && category && reportId;

  const displayAmount = amount
    ? Number.parseInt(amount, 10).toLocaleString("id-ID")
    : "";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-(--card) w-full h-[70vh] rounded-t-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-xl font-bold">
            {type === "expense" ? "Add Expense" : "Add Income"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-(--muted)rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="flex gap-2 bg-(--muted)rounded-lg p-1">
            <button
              onClick={() => setType("expense")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                type === "expense"
                  ? "bg-(--card) text-(--foreground) shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                type === "income"
                  ? "bg-(--card) text-(--foreground) shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                Rp
              </span>
              <input
                ref={amountRef}
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setAmount(raw);
                }}
                className="w-full pl-10 pr-3 py-3 text-2xl font-semibold border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            {categoriesLoading ? (
              <div className="flex flex-wrap gap-2 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-9 w-20 bg-gray-200 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                      category === cat
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-(--muted)text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Report
              </label>
              {lockedReportId && lockedReportName ? (
                <div className="flex items-center gap-2 py-2.5 px-3 border border-(--border) rounded-lg bg-gray-50 text-gray-700">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{lockedReportName}</span>
                  <span className="text-xs text-gray-400 ml-auto">locked</span>
                </div>
              ) : reportsLoading ? (
                <div className="h-11 w-full bg-gray-200 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={reportId}
                  onChange={(e) => setManualReportId(e.target.value)}
                  className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select report</option>
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a note..."
              maxLength={500}
            />
          </div>

          {showScan ? (
            <ReceiptScanFlow
              open={showScan}
              onOpenChange={(v) => {
                setShowScan(v);
                if (!v) onOpenChange(false);
              }}
              lockedReportId={lockedReportId || reportId}
              lockedReportName={lockedReportName}
            />
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowScan(true)}
                className="flex-1 py-3 px-4 border border-blue-200 text-blue-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Scan Receipt
              </button>
            <button
              onClick={handleSave}
              disabled={!isValid || createEntry.isPending}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {createEntry.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Save
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
