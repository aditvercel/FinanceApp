"use client";

import { useRouter } from "next/navigation";
import { Users, Wallet, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import type { Report } from "./model";

function formatCurrency(amount: number, currency = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface ReportCardProps {
  report: Report;
  onClick?: () => void;
}

export function ReportCard({ report, onClick }: ReportCardProps) {
  const hasWarning = report.budgetWarnings?.some((w) => w.status === "warning");
  const hasExceeded = report.budgetWarnings?.some((w) => w.status === "exceeded");

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{report.name}</h3>
          <p className="text-sm text-gray-500">
            {formatCurrency(report.totalExpense, report.currency)} spent
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>
            {report.memberCount === 1
              ? "just you"
              : `${report.memberCount} members`}
          </span>
        </div>
        {hasExceeded && (
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <AlertTriangle className="w-4 h-4" />
            Over budget
          </span>
        )}
        {hasWarning && !hasExceeded && (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <AlertTriangle className="w-4 h-4" />
            Budget warning
          </span>
        )}
      </div>

      {report.budgetWarnings && report.budgetWarnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.budgetWarnings.slice(0, 3).map((w) => (
            <span
              key={w.category}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                w.status === "exceeded"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {w.category} {Math.round(w.percentage)}%
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

interface ReportListProps {
  reports: Report[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

export function ReportList({
  reports,
  onSelect,
  onCreate,
  onJoin,
}: ReportListProps) {
  return (
    <div className="space-y-3">
      {reports.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">No reports yet</p>
        </div>
      )}
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onClick={() => onSelect(report.id)}
        />
      ))}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCreate}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          + Create Report
        </button>
        <button
          onClick={onJoin}
          className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          + Join Report
        </button>
      </div>
    </div>
  );
}
