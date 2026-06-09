"use client";

import { useState } from "react";
import { Plus, AlertTriangle, Circle, X, Loader2 } from "lucide-react";
import type { BudgetWithUsage } from "./model";
import { useUpsertBudget } from "./hooks";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface BudgetProgressBarProps {
  percentage: number;
  status: "ok" | "warning" | "exceeded";
}

function BudgetProgressBar({ percentage, status }: BudgetProgressBarProps) {
  const colorClass =
    status === "exceeded"
      ? "bg-red-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

interface BudgetListProps {
  budgets: BudgetWithUsage[];
  reportId: string;
  onAdd: () => void;
}

export function BudgetList({ budgets, reportId, onAdd }: BudgetListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-(--foreground)">Budgets</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {budgets.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          No budgets set yet. Add one to track spending limits.
        </p>
      )}

      <div className="space-y-2.5">
        {budgets.map((budget) => (
          <div
            key={budget.id}
            className="bg-(--card) border border-(--border) rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-(--foreground)">
                {budget.category}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  budget.status === "exceeded"
                    ? "bg-red-100 text-red-700"
                    : budget.status === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                <Circle className="w-1.5 h-1.5 fill-current" />
                {budget.status === "exceeded"
                  ? "Over budget"
                  : budget.status === "warning"
                    ? `${Math.round(budget.percentage)}%`
                    : "On track"}
              </span>
            </div>

            <BudgetProgressBar
              percentage={budget.percentage}
              status={budget.status}
            />

            <div className="flex justify-between mt-1.5 text-xs text-gray-500">
              <span>
                {formatCurrency(budget.spentAmount)} of{" "}
                {formatCurrency(budget.amount)}
              </span>
              <span>{Math.round(budget.percentage)}%</span>
            </div>

            {budget.status === "exceeded" && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  Exceeded by{" "}
                  {formatCurrency(budget.spentAmount - budget.amount)}
                </span>
              </div>
            )}
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

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  existing?: BudgetWithUsage;
}

export function BudgetForm({
  open,
  onOpenChange,
  reportId,
  existing,
}: BudgetFormProps) {
  const [category, setCategory] = useState(existing?.category ?? CATEGORIES[0]);
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const upsertMutation = useUpsertBudget();

  if (!open) return null;

  const handleSubmit = async () => {
    const numAmount = Number.parseFloat(amount);
    if (!category || Number.isNaN(numAmount) || numAmount <= 0) return;

    try {
      await upsertMutation.mutateAsync({
        reportId,
        category,
        amount: numAmount,
      });
      onOpenChange(false);
      setAmount("");
    } catch {
      /* handled by react-query */
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-(--card) w-full rounded-t-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {existing ? "Edit Budget" : "Set Budget"}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-(--muted)rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
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
                      : "bg-(--muted)text-(--foreground) hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monthly Limit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                Rp
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                autoFocus
                min="0"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              !category || !amount || upsertMutation.isPending
            }
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {upsertMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
