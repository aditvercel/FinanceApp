"use client";

import { useState, type FormEvent } from "react";
import { X, Users, Search, CheckCircle2, Loader2 } from "lucide-react";
import { useJoinReport } from "../hooks";

interface JoinReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinReportSheet({ open, onOpenChange }: JoinReportSheetProps) {
  const [code, setCode] = useState("");
  const joinMutation = useJoinReport();
  const [error, setError] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    name: string;
    reportId?: string;
  } | null>(null);

  if (!open) return null;

  const handleInputChange = (value: string) => {
    const uppercased = value.toUpperCase().replace(/\s/g, "");
    setCode(uppercased);
    setError(null);
    setConfirmData(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    try {
      const result = await joinMutation.mutateAsync(code);
      setConfirmData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No report found with that code. Check with the person who shared it."
      );
    }
  };

  const handleConfirm = async () => {
    try {
      await joinMutation.mutateAsync(code);
      onOpenChange(false);
      setCode("");
      setConfirmData(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join report"
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-(--card) w-full rounded-t-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Join a Report</h2>
          <button
            onClick={() => {
              onOpenChange(false);
              setCode("");
              setError(null);
              setConfirmData(null);
            }}
            className="p-2 hover:bg-(--muted)rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!confirmData ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Enter the report code shared with you
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="e.g. RPT_XK9MP2"
                  className="w-full pl-10 pr-3 py-3 text-lg border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest font-mono"
                  autoFocus
                  maxLength={20}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!code.trim() || joinMutation.isPending}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {joinMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Find Report"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Report found</span>
              </div>
              <h3 className="text-lg font-semibold text-(--foreground)">
                {confirmData.name}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>Report ID: {confirmData.reportId ?? confirmData.id}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirmData(null);
                  setError(null);
                }}
                className="flex-1 py-2.5 border border-(--border) rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={joinMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                {joinMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Join as Viewer"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
