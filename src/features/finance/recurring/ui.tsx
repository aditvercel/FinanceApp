"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  X,
  Loader2,
  Repeat,
  Pause,
  Play,
  Trash2,
  Pencil,
} from "lucide-react";
import type { RecurringTemplate, RecurrenceInterval } from "./model";
import {
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
} from "./hooks";
import { useCategories } from "@/features/finance/categories/hooks";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const FALLBACK_CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

interface TemplateListProps {
  templates: RecurringTemplate[];
  onAdd: () => void;
  onEdit: (template: RecurringTemplate) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export function TemplateList({
  templates,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: TemplateListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-(--foreground)">Recurring</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          No recurring entries yet. Add a template for bills or regular income.
        </p>
      )}

      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`bg-(--card) border rounded-lg p-3 ${
              template.isActive ? "border-(--border)" : "border-gray-100 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-(--foreground)">
                    {template.category}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      template.type === "income"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {template.type}
                  </span>
                </div>
                {template.note && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {template.note}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {formatCurrency(template.amount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {INTERVAL_LABELS[template.interval]}
                  </span>
                  <span>
                    Next:{" "}
                    {new Date(template.nextRunDate).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => onEdit(template)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggle(template.id, !template.isActive)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    template.isActive
                      ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                      : "text-green-500 hover:bg-green-50"
                  }`}
                >
                  {template.isActive ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(template.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  editingTemplate?: RecurringTemplate | null;
}

export function TemplateForm({ open, onOpenChange, reportId, editingTemplate }: TemplateFormProps) {
  const [type, setType] = useState<"income" | "expense">(
    () => editingTemplate?.type ?? "expense"
  );
  const [amount, setAmount] = useState(
    () => (editingTemplate ? String(editingTemplate.amount) : "")
  );
  const [category, setCategory] = useState(
    () => editingTemplate?.category ?? FALLBACK_CATEGORIES[0]
  );
  const [note, setNote] = useState(
    () => editingTemplate?.note ?? ""
  );
  const [interval, setInterval] = useState<RecurrenceInterval>(
    () => editingTemplate?.interval ?? "monthly"
  );
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    () => editingTemplate?.dayOfMonth ?? 1
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    () => editingTemplate?.dayOfWeek ?? 1
  );
  const [monthOfYear, setMonthOfYear] = useState<number>(
    () => editingTemplate?.monthOfYear ?? 1
  );
  const [startDate, setStartDate] = useState(
    () => editingTemplate?.nextRunDate ?? new Date().toISOString().split("T")[0]
  );

  const createMutation = useCreateRecurringTemplate();
  const updateMutation = useUpdateRecurringTemplate();

  const { data: fetchedCategories } = useCategories(reportId);
  const categories =
    fetchedCategories && fetchedCategories.length > 0
      ? fetchedCategories.map((c: { name: string }) => c.name)
      : FALLBACK_CATEGORIES;



  const resetForm = useCallback(() => {
    setType("expense");
    setAmount("");
    setCategory(FALLBACK_CATEGORIES[0]);
    setNote("");
    setInterval("monthly");
    setDayOfMonth(1);
    setDayOfWeek(1);
    setMonthOfYear(1);
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);

  if (!open) return null;

  const displayAmount = amount
    ? Number.parseInt(amount, 10).toLocaleString("id-ID")
    : "";

  const handleSubmit = async () => {
    const numAmount = Number.parseInt(amount, 10);
    if (!category || Number.isNaN(numAmount) || numAmount <= 0) return;

    const payload: {
      reportId: string;
      type: "income" | "expense";
      amount: number;
      category: string;
      note?: string;
      interval: "weekly" | "monthly" | "yearly";
      startDate: string;
      dayOfMonth?: number;
      dayOfWeek?: number;
      monthOfYear?: number;
    } = {
      reportId,
      type,
      amount: numAmount,
      category,
      note: note || undefined,
      interval,
      startDate,
    };

    if (interval === "monthly") payload.dayOfMonth = dayOfMonth;
    if (interval === "weekly") payload.dayOfWeek = dayOfWeek;
    if (interval === "yearly") {
      payload.dayOfMonth = dayOfMonth;
      payload.monthOfYear = monthOfYear;
    }

    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({ id: editingTemplate.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
      resetForm();
    } catch {
      /* handled by react-query */
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-(--card) w-full rounded-t-xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {editingTemplate ? "Edit Recurring Template" : "New Recurring Template"}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-(--muted)rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 bg-(--muted)rounded-lg p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  type === t
                    ? "bg-(--card) text-(--foreground) shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === cat
                      ? "bg-blue-600 text-white"
                      : "bg-(--muted)text-(--foreground) hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1.5">
              Interval
            </div>
            <div className="flex gap-2">
              {(["weekly", "monthly", "yearly"] as RecurrenceInterval[]).map(
                (inv) => (
                  <button
                    key={inv}
                    onClick={() => setInterval(inv)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      interval === inv
                        ? "bg-blue-600 text-white"
                        : "bg-(--muted)text-(--foreground) hover:bg-gray-200"
                    }`}
                  >
                    {INTERVAL_LABELS[inv]}
                  </button>
                )
              )}
            </div>
          </div>

          {interval === "weekly" && (
            <div>
              <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1.5">
                Day of Week
              </label>
              <select
                id="dayOfWeek"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number.parseInt(e.target.value))}
                className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day, idx) => (
                  <option key={day} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(interval === "monthly" || interval === "yearly") && (
            <div>
              <label htmlFor="dayOfMonth" className="block text-sm font-medium text-gray-700 mb-1.5">
                Day of Month
              </label>
              <input
                id="dayOfMonth"
                type="number"
                value={dayOfMonth}
                onChange={(e) =>
                  setDayOfMonth(
                    Math.min(28, Math.max(1, Number.parseInt(e.target.value) || 1))
                  )
                }
                min={1}
                max={28}
                className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Capped at 28 to avoid February edge cases.
              </p>
            </div>
          )}

          {interval === "yearly" && (
            <div>
              <label htmlFor="monthOfYear" className="block text-sm font-medium text-gray-700 mb-1.5">
                Month
              </label>
              <select
                id="monthOfYear"
                value={monthOfYear}
                onChange={(e) => setMonthOfYear(Number.parseInt(e.target.value))}
                className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((month, idx) => (
                  <option key={month} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
              placeholder="e.g. Monthly electricity bill"
              maxLength={500}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || !category || isPending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
            {!isPending && (editingTemplate ? "Save Changes" : "Create Template")}
          </button>
        </div>
      </div>
    </div>
  );
}
