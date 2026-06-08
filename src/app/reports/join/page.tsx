"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJoinReport } from "@/features/finance/reports/hooks";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Users } from "lucide-react";

export default function JoinReportPage() {
  const router = useRouter();
  const [reportId, setReportId] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [preview, setPreview] = useState<{ name: string; ownerName: string; memberCount: number } | null>(null);
  const [error, setError] = useState("");
  const joinReport = useJoinReport();

  const formattedValue = reportId.toUpperCase().replace(/\s/g, "");

  const handleLookup = async () => {
    setError("");
    if (!formattedValue) {
      setError("Enter a report code.");
      return;
    }
    try {
      const res = await fetch(`/api/reports/lookup?reportId=${formattedValue}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setPreview(json.data);
      setStep("confirm");
    } catch (e: any) {
      setError("No report found with that code. Check with the person who shared it.");
    }
  };

  const handleJoin = async () => {
    try {
      await joinReport.mutateAsync(formattedValue);
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Failed to join report.");
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
        <h1 className="text-2xl font-bold">Join a Report</h1>
      </header>

      {step === "input" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Enter the report code shared with you
            </label>
            <input
              type="text"
              value={formattedValue}
              onChange={(e) => setReportId(e.target.value)}
              className="w-full px-3 py-3 text-lg tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="RPT_XK9MP2"
              maxLength={20}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleLookup}
            disabled={!formattedValue}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Look up Report
          </button>
        </div>
      )}

      {step === "confirm" && preview && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <h2 className="font-semibold text-lg">{preview.name}</h2>
                <p className="text-sm text-gray-500">
                  Owned by {preview.ownerName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-black mb-4">
              <Users className="w-4 h-4" />
              <span>{preview.memberCount} members</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              You will join as a Viewer. The owner can change your role later.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStep("input");
                  setPreview(null);
                  setError("");
                }}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joinReport.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {joinReport.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Join as Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
