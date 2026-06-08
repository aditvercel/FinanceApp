"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateReport } from "@/features/finance/reports/hooks";
import { ArrowLeft, Loader2 } from "lucide-react";

const CURRENCIES = [
  { code: "IDR", label: "IDR - Indonesian Rupiah" },
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "SGD", label: "SGD - Singapore Dollar" },
  { code: "MYR", label: "MYR - Malaysian Ringgit" },
];

export default function NewReportPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [error, setError] = useState("");
  const createReport = useCreateReport();

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Report name is required.");
      return;
    }
    try {
      const result = await createReport.mutateAsync({ name: name.trim(), currency });
      router.push(`/reports/${result.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to create report.");
    }
  };

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-2xl font-bold">Create Report</h1>
      </header>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Report Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Household 2025"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={createReport.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createReport.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Create Report
        </button>
      </div>
    </div>
  );
}
