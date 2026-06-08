"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Upload,
  Camera,
  WifiOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useReceiptScan } from "./hooks";
import { useCreateEntry } from "@/features/finance/entries/hooks";

interface ReceiptScanFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId?: string;
  lockedReportId?: string;
  lockedReportName?: string;
}

const LABELS = [
  "Reading receipt...",
  "Detecting line items...",
  "Inferring category...",
  "Checking for foreign currency...",
];

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

interface ScanResult {
  merchant?: string;
  date?: string;
  currency: string;
  currencyOriginal?: string;
  totalOriginal?: number;
  exchangeRate?: number;
  exchangeRateSource?: "live" | "manual" | "fallback";
  total: number;
  category: string;
  lineItems: Array<{
    name: string;
    price: number;
    confidence: "high" | "medium" | "low";
  }>;
  note: string;
  confidence: "high" | "medium" | "low";
  categoryConfidence?: "high" | "medium" | "low";
  categoryOriginal?: string;
  rawText?: string;
}

export function ReceiptScanFlow({
  open,
  onOpenChange,
  lockedReportId,
  lockedReportName,
}: ReceiptScanFlowProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "review">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [progressLabel, setProgressLabel] = useState(LABELS[0]);
  const [isOffline, setIsOffline] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [editedFields, setEditedFields] = useState<Partial<ScanResult>>({});

  const scanMutation = useReceiptScan();
  const createEntry = useCreateEntry();
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const labelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout30Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!navigator.onLine) setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setPreview(null);
      setScanResult(null);
      setError(null);
      setEditedFields({});
      setElapsed(0);
      clearIntervals();
    }
  }, [open]);

  const clearIntervals = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (labelIntervalRef.current) clearInterval(labelIntervalRef.current);
    if (timeout30Ref.current) clearTimeout(timeout30Ref.current);
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setStep("scanning");
      setError(null);
      setElapsed(0);

      let labelIndex = 0;
      setProgressLabel(LABELS[0]);
      labelIntervalRef.current = setInterval(() => {
        labelIndex = (labelIndex + 1) % LABELS.length;
        setProgressLabel(LABELS[labelIndex]);
      }, 3000);

      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      timeout30Ref.current = setTimeout(() => {
        clearIntervals();
        scanMutation.reset();
        setError("This is taking too long. Try again or enter manually.");
        setStep("upload");
      }, 30000);

      try {
        const result = await scanMutation.mutateAsync(file);
        clearIntervals();
        setScanResult(result);
        setStep("review");
      } catch (err) {
        clearIntervals();
        setError(
          err instanceof Error ? err.message : "Scan failed. Try again."
        );
        setStep("upload");
      }
    },
    [scanMutation]
  );

  const getFieldValue = useCallback(
    (field: keyof ScanResult) => {
      if (field in editedFields) return editedFields[field];
      return scanResult?.[field];
    },
    [editedFields, scanResult]
  );

  const updateField = useCallback(
    (field: string, value: unknown) => {
      setEditedFields((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const isForeignCurrency =
    scanResult?.currencyOriginal &&
    scanResult.currencyOriginal !== "IDR";

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full h-[85vh] rounded-t-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-xl font-bold">Scan Receipt</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === "upload" && (
            <div className="space-y-4">
              {isOffline && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <WifiOff className="w-4 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    You&apos;re offline. Your receipt photo has been saved as a
                    draft. We&apos;ll scan it automatically when you reconnect.
                  </p>
                </div>
              )}

              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*,.pdf";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileSelect(file);
                  };
                  input.click();
                }}
              >
                <Upload className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">
                  Drop receipt photo here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.capture = "environment" as any;
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file);
                    };
                    input.click();
                  }}
                  disabled={isOffline}
                  className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5" />
                  Take photo
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-red-600 font-medium hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <button
                onClick={() => onOpenChange(false)}
                className="w-full py-2.5 text-gray-500 font-medium hover:text-gray-700"
              >
                Enter manually
              </button>
            </div>
          )}

          {step === "scanning" && (
            <div className="text-center py-8">
              {preview && (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="max-w-40 max-h-52 mx-auto mb-6 object-contain rounded-lg shadow-sm"
                />
              )}

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden max-w-xs mx-auto">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((elapsed / 30) * 100, 95)}%`,
                  }}
                />
              </div>

              <div className="h-12 flex items-center justify-center">
                {elapsed >= 15 ? (
                  <p className="text-amber-600 font-medium animate-pulse">
                    Still working on it...
                  </p>
                ) : (
                  <p className="text-black">{progressLabel}</p>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">{elapsed}s</p>
            </div>
          )}

          {step === "review" && scanResult && (
            <div className="space-y-5">
              {isForeignCurrency && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    Converted from {scanResult.currencyOriginal}{" "}
                    {scanResult.totalOriginal?.toLocaleString("id-ID")}{" "}
                    → IDR
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Rate:{" "}
                    {getFieldValue("exchangeRate")?.toLocaleString("id-ID")}
                    {" IDR ("}
                    {getFieldValue("exchangeRateSource") === "live"
                      ? "live rate"
                      : "estimated ⚠️"}
                    )
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    You can override the total below.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex gap-2">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEntryType(t)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                        entryType === t
                          ? t === "expense"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                  <span className="text-[10px] text-gray-400 self-center ml-auto">
                    ✦ extracted
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      Rp
                    </span>
                    <input
                      type="number"
                      defaultValue={scanResult.total}
                      onChange={(e) =>
                        updateField("total", parseFloat(e.target.value) || 0)
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    defaultValue={scanResult.date || new Date().toISOString().split("T")[0]}
                    onChange={(e) => updateField("date", e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    ✦ extracted
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merchant
                </label>
                <input
                  type="text"
                  defaultValue={scanResult.merchant || ""}
                  onChange={(e) => updateField("merchant", e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Merchant name"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  ✦ extracted
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Food",
                    "Transport",
                    "Utilities",
                    "Shopping",
                    "Health",
                    "Entertainment",
                    "Other",
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => updateField("category", cat)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        (getFieldValue("category") || scanResult.category) === cat
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-black hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {scanResult.categoryOriginal &&
                  scanResult.categoryOriginal !==
                    (getFieldValue("category") || scanResult.category) && (
                    <span className="text-[10px] text-amber-600 mt-0.5 block">
                      ✦ mapped from &ldquo;{scanResult.categoryOriginal}
                      &rdquo;
                    </span>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Items
                </label>
                <div className="space-y-1.5">
                  {(scanResult.lineItems || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          CONFIDENCE_COLORS[item.confidence]
                        }`}
                      />
                      <span className="text-sm flex-1">{item.name}</span>
                      <span className="text-sm font-medium text-gray-700">
                        Rp {item.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  defaultValue={scanResult.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  ✦ auto-generated
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const report = lockedReportId;
                    if (!report || !scanResult) return;
                    setSaving(true);
                    try {
                      await createEntry.mutateAsync({
                        reportId: report,
                        type: entryType,
                        amount: editedFields.total ?? scanResult.total,
                        category: editedFields.category ?? scanResult.category,
                        note: scanResult.note,
                        entryDate: editedFields.date ?? scanResult.date ?? new Date().toISOString().split("T")[0],
                      });
                      onOpenChange(false);
                    } catch {
                      setSaving(false);
                    }
                  }}
                  disabled={saving || !lockedReportId}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Save Entry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
