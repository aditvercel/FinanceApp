"use client";

import {
  ArrowLeft,
  Clock,
  RotateCcw,
  User,
} from "lucide-react";
import { useState } from "react";
import { useEntryHistory, useRevertEntry } from "./hooks";

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDiffLabel(
  current: any,
  previous: any | null,
  field: string
): string | null {
  if (!previous) return null;
  if (field === "amount" && current.amount !== previous.amount) {
    return `amount changed: Rp ${previous.amount.toLocaleString()} → Rp ${current.amount.toLocaleString()}`;
  }
  if (field === "category" && current.category !== previous.category) {
    return `category changed: ${previous.category} → ${current.category}`;
  }
  if (field === "lineItems" && current.lineItems?.length !== previous.lineItems?.length) {
    return `line items changed: ${previous.lineItems?.length} → ${current.lineItems?.length}`;
  }
  if (field === "note" && current.note !== previous.note) {
    return "note changed";
  }
  if (field === "entryDate" && current.entryDate !== previous.entryDate) {
    return `date changed: ${previous.entryDate} → ${current.entryDate}`;
  }
  return null;
}

interface VersionHistorySheetProps {
  entryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistorySheet({
  entryId,
  open,
  onOpenChange,
}: VersionHistorySheetProps) {
  const { data: versions, isLoading } = useEntryHistory(entryId);
  const revertEntry = useRevertEntry();
  const [confirmVersion, setConfirmVersion] = useState<any>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  if (!open) return null;

  const handleRevert = async (targetVersion: number) => {
    setRevertError(null);
    try {
      await revertEntry.mutateAsync({ entryId, targetVersion });
      setConfirmVersion(null);
    } catch (err: any) {
      setRevertError(err.message || "Revert failed");
    }
  };

  const currentVersion = versions?.find((v: any) => v.isCurrent);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full h-[85vh] rounded-t-xl flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Entry History</h2>
            {currentVersion && (
              <p className="text-sm text-gray-500">
                {currentVersion.category} — {currentVersion.note?.split(",")[0] || "Entry"}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No history available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version: any, idx: number) => {
                const prev = idx < versions.length - 1 ? versions[idx + 1] : null;
                const diffs = [
                  getDiffLabel(version, prev, "amount"),
                  getDiffLabel(version, prev, "category"),
                  getDiffLabel(version, prev, "lineItems"),
                  getDiffLabel(version, prev, "note"),
                  getDiffLabel(version, prev, "entryDate"),
                ].filter(Boolean);

                const isCurrent = version.isCurrent;
                const actionLabel =
                  version.action === "create"
                    ? "Created"
                    : version.action === "revert"
                    ? `Reverted from v${version.revertedFrom}`
                    : "Edited";

                return (
                  <div
                    key={version.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      isCurrent
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            v{version.version}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              CURRENT
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDateTime(version.changedAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-medium">
                            {version.changedBy?.displayName || "Unknown"}
                          </span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-500">{actionLabel}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-semibold">
                            Rp {version.amount.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-sm text-black">{version.category}</span>
                          {version.lineItems && (
                            <>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">
                                {version.lineItems.length} item
                                {version.lineItems.length !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>

                        {diffs.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {diffs.map((diff, di) => (
                              <p key={di} className="text-xs text-amber-600">
                                ← {diff}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => setConfirmVersion(version)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 shrink-0 ml-2"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {revertError && (
            <p className="mt-3 text-sm text-red-600 text-center">{revertError}</p>
          )}
        </div>
      </div>

      {confirmVersion && (
        <ConfirmRevertSheet
          currentVersion={currentVersion}
          targetVersion={confirmVersion}
          onConfirm={() => handleRevert(confirmVersion.version)}
          onCancel={() => {
            setConfirmVersion(null);
            setRevertError(null);
          }}
          isPending={revertEntry.isPending}
        />
      )}
    </div>
  );
}

function ConfirmRevertSheet({
  currentVersion,
  targetVersion,
  onConfirm,
  onCancel,
  isPending,
}: {
  currentVersion: any;
  targetVersion: any;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const changedFields: Array<{ label: string; before: string; after: string }> = [];

  if (currentVersion) {
    if (currentVersion.amount !== targetVersion.amount) {
      changedFields.push({
        label: "Amount",
        before: `Rp ${currentVersion.amount.toLocaleString()}`,
        after: `Rp ${targetVersion.amount.toLocaleString()}`,
      });
    }
    if (currentVersion.category !== targetVersion.category) {
      changedFields.push({
        label: "Category",
        before: currentVersion.category,
        after: targetVersion.category,
      });
    }
    if (currentVersion.lineItems?.length !== targetVersion.lineItems?.length) {
      changedFields.push({
        label: "Line items",
        before: `${currentVersion.lineItems?.length || 0} items`,
        after: `${targetVersion.lineItems?.length || 0} items`,
      });
    }
    if (currentVersion.note !== targetVersion.note) {
      changedFields.push({
        label: "Note",
        before: currentVersion.note || "(empty)",
        after: targetVersion.note || "(empty)",
      });
    }
    if (currentVersion.entryDate !== targetVersion.entryDate) {
      changedFields.push({
        label: "Date",
        before: currentVersion.entryDate,
        after: targetVersion.entryDate,
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end">
      <div className="bg-white w-full rounded-t-xl p-4">
        <h3 className="text-lg font-bold mb-2">Restore v{targetVersion.version}?</h3>
        <p className="text-sm text-black mb-4">
          This will create a new version (v{targetVersion.version !== undefined && currentVersion?.version !== undefined
            ? Math.max(targetVersion.version, currentVersion.version) + 1
            : "?"})
          with the values from {formatDateTime(targetVersion.changedAt)} by{" "}
          {targetVersion.changedBy?.displayName || "Unknown"}.
        </p>

        {changedFields.length > 0 && (
          <div className="space-y-2 mb-4">
            {changedFields.map((field) => (
              <div key={field.label} className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs font-medium text-gray-500 mb-1">{field.label}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-600 line-through">{field.before}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-medium">{field.after}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {changedFields.length === 0 && (
          <p className="text-sm text-gray-500 mb-4">
            No differences between these versions.
          </p>
        )}

        <p className="text-xs text-gray-500 mb-4">
          Your current version (v{currentVersion?.version || "?"}) is not deleted —
          it remains in history and can be restored later.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Restoring...
              </>
            ) : (
              "Restore"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
