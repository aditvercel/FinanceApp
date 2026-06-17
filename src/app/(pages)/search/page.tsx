"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/features/search/hooks";
import {
  Search as SearchIcon,
  ArrowLeft,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const CATEGORIES = [
  "All",
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

function parsePowerQuery(q: string): {
  text: string;
  amountMin?: number;
  amountMax?: number;
} {
  let text = q;
  let amountMin: number | undefined;
  let amountMax: number | undefined;

  const gtMatch = q.match(/^>(\d+)$/);
  if (gtMatch) {
    amountMin = Number(gtMatch[1]);
    text = "";
  }

  const ltMatch = q.match(/^<(\d+)$/);
  if (ltMatch) {
    amountMax = Number(ltMatch[1]);
    text = "";
  }

  const rangeMatch = q.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    amountMin = Number(rangeMatch[1]);
    amountMax = Number(rangeMatch[2]);
    text = "";
  }

  return { text, amountMin, amountMax };
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [amountFilter, setAmountFilter] = useState("any");
  const [amountMinInput, setAmountMinInput] = useState("");
  const [amountMaxInput, setAmountMaxInput] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [showAmountInput, setShowAmountInput] = useState(false);

  const parsed = useMemo(() => parsePowerQuery(query), [query]);

  const searchParams = useMemo(() => {
    const params: Record<string, any> = {};
    const text = parsed.text || query;
    if (text) params.q = text;
    if (parsed.amountMin !== undefined) params.amountMin = parsed.amountMin;
    if (parsed.amountMax !== undefined) params.amountMax = parsed.amountMax;
    if (category !== "All") params.category = category;
    if (type !== "All") params.type = type;
    if (amountFilter === "less" && amountMinInput)
      params.amountMax = Number(amountMinInput);
    if (amountFilter === "greater" && amountMinInput)
      params.amountMin = Number(amountMinInput);
    if (amountFilter === "between") {
      if (amountMinInput) params.amountMin = Number(amountMinInput);
      if (amountMaxInput) params.amountMax = Number(amountMaxInput);
    }
    if (dateStart) params.dateStart = dateStart;
    if (dateEnd) params.dateEnd = dateEnd;
    return params;
  }, [
    query,
    parsed,
    category,
    type,
    amountFilter,
    amountMinInput,
    amountMaxInput,
    dateStart,
    dateEnd,
  ]);

  const { data: results, isLoading } = useSearch(searchParams);

  const hasFilters =
    category !== "All" ||
    type !== "All" ||
    amountFilter !== "any" ||
    dateStart ||
    dateEnd;

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-(--muted)rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-(--foreground)" />
        </button>
        <h1 className="text-2xl font-bold">Search</h1>
      </header>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries, notes, merchants... (e.g. >50000)"
          className="w-full pl-10 pr-9 py-2.5 border border-(--border) rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-(--foreground)" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-xs border border-(--border) rounded-lg px-2.5 py-1.5 bg-(--card)"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-xs border border-(--border) rounded-lg px-2.5 py-1.5 bg-(--card)"
        >
          <option value="All">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <div className="relative">
          <button
            onClick={() => setShowAmountInput(!showAmountInput)}
            className={`text-xs border rounded-lg px-2.5 py-1.5 ${
              amountFilter !== "any"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-(--border) bg-(--card) text-gray-700"
            }`}
          >
            {amountFilter === "any"
              ? "Any Amount"
              : amountFilter === "less"
              ? `< Rp ${amountMinInput || "..."}`
              : amountFilter === "greater"
              ? `> Rp ${amountMinInput || "..."}`
              : `Rp ${amountMinInput || "..."} - Rp ${amountMaxInput || "..."}`}
          </button>
          {showAmountInput && (
            <div className="absolute left-0 top-full mt-1 bg-(--card) border border-(--border) rounded-lg shadow-lg z-10 p-3 w-64">
              <div className="space-y-2">
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-full text-sm border border-(--border) rounded px-2 py-1"
                >
                  <option value="any">Any</option>
                  <option value="less">Less than...</option>
                  <option value="greater">Greater than...</option>
                  <option value="between">Between...</option>
                </select>
                {amountFilter !== "any" && (
                  <div className="space-y-1">
                    <input
                      type="number"
                      placeholder="Rp"
                      value={amountMinInput}
                      onChange={(e) => setAmountMinInput(e.target.value)}
                      className="w-full text-sm border border-(--border) rounded px-2 py-1"
                    />
                    {amountFilter === "between" && (
                      <input
                        type="number"
                        placeholder="and Rp"
                        value={amountMaxInput}
                        onChange={(e) => setAmountMaxInput(e.target.value)}
                        className="w-full text-sm border border-(--border) rounded px-2 py-1"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          className="text-xs border border-(--border) rounded-lg px-2 py-1.5"
          placeholder="Start date"
        />
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="text-xs border border-(--border) rounded-lg px-2 py-1.5"
          placeholder="End date"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : results && results.length > 0 ? (
          results.map((result: any, i: number) => (
            <div
              key={result.entryId || i}
              className="flex items-start gap-3 p-3 bg-(--card) border border-gray-100 rounded-lg"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  result.type === "income"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {result.type === "income" ? "↑" : "↓"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{result.category}</p>
                <p className="text-xs text-gray-500 truncate">
                  {result.note || result.matchedField}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {result.reportName} ·{" "}
                  {new Date(result.entryDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}
                </p>
                {result.lineItems && result.lineItems.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.lineItems.map((li: any, j: number) => (
                      <span
                        key={j}
                        className="text-xs bg-(--muted)px-1.5 py-0.5 rounded"
                      >
                        {li.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span
                className={`font-medium text-sm shrink-0 ${
                  result.type === "income"
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {result.type === "income" ? "+" : "-"}
                {formatCurrency(result.amount)}
              </span>
            </div>
          ))
        ) : hasFilters || query ? (
          <div className="text-center py-12">
            <SearchIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-(--foreground) font-medium">
              No results for {query ? `"${query}"` : "your filters"}
            </p>
            <div className="text-sm text-gray-500 mt-2 space-y-1">
              <p>Try fewer words</p>
              <p>Check spelling</p>
              <p>Expand date range</p>
              <p>Remove category filter</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-(--foreground)">Start typing to search</p>
            <p className="text-sm text-gray-500 mt-1">
              Try &quot;indomie&quot; or &quot;groceries&quot;
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Power syntax: &gt;50000, &lt;100000, 50000-100000
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
