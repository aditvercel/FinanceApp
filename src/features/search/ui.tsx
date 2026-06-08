"use client";

import {
  Search,
  X,
  Filter,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { useSearch } from "./hooks";

const CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

const AMOUNT_FILTERS = ["Any", "Less than", "Greater than", "Between"] as const;

function parseAmountQuery(q: string): Record<string, any> {
  const trimmed = q.trim();
  const gt = trimmed.match(/^>(\d+)$/);
  if (gt) return { amountMin: Number(gt[1]), q: "" };
  const lt = trimmed.match(/^<(\d+)$/);
  if (lt) return { amountMax: Number(lt[1]), q: "" };
  const range = trimmed.match(/^(\d+)-(\d+)$/);
  if (range) return { amountMin: Number(range[1]), amountMax: Number(range[2]), q: "" };
  return { q: trimmed };
}

export function SearchBar({ onSearch }: { onSearch: (params: Record<string, any>) => void }) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [amountFilter, setAmountFilter] = useState<string>("Any");
  const [amountValue, setAmountValue] = useState("");
  const [amountValue2, setAmountValue2] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const buildParams = (q: string) => {
    const parsed = parseAmountQuery(q);
    const params: Record<string, any> = { ...parsed };

    if (amountFilter === "Less than" && amountValue) params.amountMax = Number(amountValue);
    else if (amountFilter === "Greater than" && amountValue) params.amountMin = Number(amountValue);
    else if (amountFilter === "Between" && amountValue && amountValue2) {
      params.amountMin = Number(amountValue);
      params.amountMax = Number(amountValue2);
    }

    if (categoryFilter) params.category = categoryFilter;
    if (typeFilter) params.type = typeFilter;
    if (dateFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      params.dateStart = today;
      params.dateEnd = today;
    } else if (dateFilter === "week") {
      const d = new Date();
      params.dateEnd = d.toISOString().split("T")[0];
      d.setDate(d.getDate() - 7);
      params.dateStart = d.toISOString().split("T")[0];
    } else if (dateFilter === "month") {
      const d = new Date();
      params.dateEnd = d.toISOString().split("T")[0];
      d.setMonth(d.getMonth() - 1);
      params.dateStart = d.toISOString().split("T")[0];
    }

    return params;
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    onSearch(buildParams(q));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search entries..."
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-10 top-1/2 -translate-y-1/2 ${
            showFilters ? "text-blue-600" : "text-gray-400"
          } hover:text-black`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-black mb-1 block">Amount</label>
            <div className="flex gap-2">
              <select
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
              >
                {AMOUNT_FILTERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              {amountFilter === "Between" ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={amountValue}
                    onChange={(e) => setAmountValue(e.target.value)}
                    placeholder="Min"
                    className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={amountValue2}
                    onChange={(e) => setAmountValue2(e.target.value)}
                    placeholder="Max"
                    className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                  />
                </div>
              ) : amountFilter !== "Any" ? (
                <input
                  type="number"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  placeholder="Amount"
                  className="w-32 text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-black mb-1 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
              >
                <option value="">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-black mb-1 block">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
              >
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-black mb-1 block">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
              >
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchResults({ params }: { params: Record<string, any> }) {
  const { data: results, isLoading, error } = useSearch(params);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg border p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Search failed. Please try again.</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    const q = params.q || "";
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="font-medium text-gray-700">
          {q ? `No results for "${q}"` : "No entries found"}
        </h3>
        <div className="text-sm text-gray-500 mt-2 space-y-1">
          {q && (
            <>
              <p>Try fewer words, check spelling, or expand date range.</p>
              {(params.category || params.type) && (
                <p>Try removing some filters.</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-gray-500">{results.length} result{results.length !== 1 ? "s" : ""}</p>
      {results.map((entry: any) => (
        <div
          key={entry.id}
          className="bg-white rounded-lg border p-3 hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {entry.reportName && (
                  <span className="text-xs text-gray-400">{entry.reportName}</span>
                )}
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    entry.type === "income"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {entry.type}
                </span>
              </div>
              <p className="font-medium mt-1 truncate">
                {entry.category}
                {entry.merchant && <span className="text-gray-500 font-normal"> — {entry.merchant}</span>}
              </p>
              {entry.note && (
                <p className="text-sm text-black truncate mt-0.5">{entry.note}</p>
              )}
              {entry.lineItems && entry.lineItems.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Items: {entry.lineItems.map((li: any) => li.name).join(", ")}
                </p>
              )}
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-semibold">
                Rp {entry.amount?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(entry.entryDate || entry.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchView() {
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});

  return (
    <div>
      <SearchBar onSearch={(params) => setSearchParams(params)} />
      {Object.keys(searchParams).length > 0 && (
        <SearchResults params={searchParams} />
      )}
    </div>
  );
}
