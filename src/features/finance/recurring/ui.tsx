"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Loader2,
  Repeat,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import type { RecurringTemplate, RecurrenceInterval } from "./model";
import {
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
  useDeleteRecurringTemplate,
} from "./hooks";

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

interface TemplateListProps {
  templates: RecurringTemplate[];
  onAdd: () => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export function TemplateList({
  templates,
  onAdd,
  onToggle,
  onDelete,
}: TemplateListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Recurring</h3>
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
            className={`bg-white border rounded-lg p-3 ${
              template.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">
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

const CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
}

export function TemplateForm({ open, onOpenChange, reportId }: TemplateFormProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [interval, setInterval] = useState<RecurrenceInterval>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [monthOfYear, setMonthOfYear] = useState<number>(1);
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const createMutation = useCreateRecurringTemplate();

  if (!open) return null;

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!category || isNaN(numAmount) || numAmount <= 0) return;

    const payload: any = {
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
      await createMutation.mutateAsync(payload);
      onOpenChange(false);
      setAmount("");
      setNote("");
    } catch {
      /* handled by react-query */
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">New Recurring Template</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  type === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                Rp
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                autoFocus
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === cat
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-black hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Interval
            </label>
            <div className="flex gap-2">
              {(["weekly", "monthly", "yearly"] as RecurrenceInterval[]).map(
                (inv) => (
                  <button
                    key={inv}
                    onClick={() => setInterval(inv)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      interval === inv
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-black hover:bg-gray-200"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(interval === "monthly" || interval === "yearly") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Day of Month
              </label>
              <input
                type="number"
                value={dayOfMonth}
                onChange={(e) =>
                  setDayOfMonth(
                    Math.min(28, Math.max(1, parseInt(e.target.value) || 1))
                  )
                }
                min={1}
                max={28}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Capped at 28 to avoid February edge cases.
              </p>
            </div>
          )}

          {interval === "yearly" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Month
              </label>
              <select
                value={monthOfYear}
                onChange={(e) => setMonthOfYear(parseInt(e.target.value))}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <option key={idx} value={idx + 1}>
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
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Monthly electricity bill"
              maxLength={500}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || !category || createMutation.isPending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Create Template"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
