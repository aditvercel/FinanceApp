"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useReports } from "@/features/finance/reports/hooks";
import { CategoryManager } from "@/features/finance/categories/ui";
import { useState } from "react";

export default function CustomCategoriesPage() {
  const router = useRouter();
  const { data: reports, isLoading } = useReports();
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-(--muted) rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-(--foreground)" />
        </button>
        <h1 className="text-2xl font-bold">Custom Categories</h1>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reports found. Create a report first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Report
            </label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a report...</option>
              {reports.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {selectedReportId && (
            <div className="bg-(--card) border border-(--border) rounded-xl p-4">
              <CategoryManager reportId={selectedReportId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
