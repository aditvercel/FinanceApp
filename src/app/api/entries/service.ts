import { EntryRepository } from "./repository";
import type { EntryWithSnapshot, SnapshotVersion } from "./repository";
import type { CreateEntry, EditEntry } from "./contract";
import { createEvent, getUsersDisplayNames } from "@/app/api/activity/repository";
import { createNotification } from "@/app/api/notifications/repository";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export class EntryService {
  constructor(private repo: EntryRepository) {}

  async list(
    reportId: string,
    userId: string,
    opts?: { cursor?: string; limit?: number }
  ): Promise<{ entries: EntryWithSnapshot[]; nextCursor: string | null }> {
    const role = await this.repo.checkMemberRole(reportId, userId);
    if (!role) throw new PermissionError("Access denied to this report");

    return this.repo.getEntries(reportId, userId, opts);
  }

  async get(entryId: string, userId: string): Promise<EntryWithSnapshot | null> {
    const entry = await this.repo.getEntry(entryId, userId);
    if (!entry) return null;

    const reportId = await this.repo.getEntryReportId(entryId);
    if (!reportId) return null;

    const role = await this.repo.checkMemberRole(reportId, userId);
    if (!role) throw new PermissionError("Access denied");

    return entry;
  }

  async create(data: CreateEntry, userId: string): Promise<EntryWithSnapshot> {
    const role = await this.repo.checkMemberRole(data.reportId, userId);
    if (!role || (role !== "owner" && role !== "editor")) {
      throw new PermissionError("Only editors can create entries");
    }

    const result = await this.repo.createEntry({
      ...data,
      createdBy: userId,
      reportId: data.reportId,
      draftId: data.draftId,
    });

    createEvent({
      reportId: data.reportId,
      actorId: userId,
      eventType: "entry.created",
      metadata: {
        entryId: result.entryId,
        category: data.category,
        amount: data.amount,
        version: result.version,
      },
    });

    createNotification({
      userId,
      type: "entry.created",
      title: `${data.type === "income" ? "Income" : "Expense"} added`,
      body: `Rp ${data.amount.toLocaleString("id-ID")} · ${data.category}${data.note ? ` — ${data.note}` : ""}`,
      actionUrl: `/reports/${data.reportId}?tab=Activity`,
    });

    return {
      id: result.entryId,
      reportId: data.reportId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      version: result.version,
      changedBy: userId,
      action: "create",
      revertedFrom: null,
      type: data.type,
      amount: data.amount,
      amountOriginal: null,
      currencyOriginal: null,
      exchangeRate: null,
      exchangeRateSource: null,
      exchangedAt: null,
      category: data.category,
      note: data.note ?? null,
      merchant: null,
      entryDate: data.entryDate,
      receiptImagePath: null,
      changedAt: new Date().toISOString(),
      lineItems: [],
    };
  }

  async edit(
    entryId: string,
    userId: string,
    data: EditEntry
  ): Promise<EntryWithSnapshot> {
    const reportId = await this.repo.getEntryReportId(entryId);
    if (!reportId) throw new ValidationError("Entry not found");

    const role = await this.repo.checkMemberRole(reportId, userId);
    if (!role || (role !== "owner" && role !== "editor")) {
      throw new PermissionError("Only editors can edit entries");
    }

    const result = await this.repo.editEntry(entryId, {
      ...data,
      changedBy: userId,
    });

    createEvent({
      reportId,
      actorId: userId,
      eventType: "entry.edited",
      metadata: {
        entryId,
        category: data.category,
        amount: data.amount,
        version: result.version,
      },
    });

    createNotification({
      userId,
      type: "entry.edited",
      title: "Entry edited",
      body: `Rp ${data.amount.toLocaleString("id-ID")} · ${data.category}`,
      actionUrl: `/reports/${reportId}?tab=Activity`,
    });

    const entry = await this.repo.getEntry(entryId, userId);
    if (!entry) throw new Error("Failed to reload entry after edit");

    return entry;
  }

  async revert(
    entryId: string,
    userId: string,
    targetVersion: number
  ): Promise<EntryWithSnapshot> {
    const reportId = await this.repo.getEntryReportId(entryId);
    if (!reportId) throw new ValidationError("Entry not found");

    const role = await this.repo.checkMemberRole(reportId, userId);
    if (role !== "owner") {
      throw new PermissionError("Only the report owner can revert entries");
    }

    const result = await this.repo.revertEntry(entryId, userId, targetVersion);

    const originalLineItems = await this.repo.getLineItems(entryId, targetVersion);
    await this.repo.insertLineItems(entryId, result.version, originalLineItems);

    createEvent({
      reportId,
      actorId: userId,
      eventType: "entry.reverted",
      metadata: {
        entryId,
        version: result.version,
        revertedFrom: targetVersion,
      },
    });

    createNotification({
      userId,
      type: "entry.reverted",
      title: "Entry reverted",
      body: `Reverted entry to version ${targetVersion}`,
      actionUrl: `/reports/${reportId}?tab=Activity`,
    });

    const entry = await this.repo.getEntry(entryId, userId);
    if (!entry) throw new Error("Failed to reload entry after revert");

    return entry;
  }

  async delete(
    entryId: string,
    userId: string
  ): Promise<{ success: boolean; reportId: string }> {
    const reportId = await this.repo.getEntryReportId(entryId);
    if (!reportId) throw new ValidationError("Entry not found");

    const role = await this.repo.checkMemberRole(reportId, userId);
    if (!role || (role !== "owner" && role !== "editor")) {
      throw new PermissionError("Only editors can delete entries");
    }

    const result = await this.repo.softDeleteEntry(entryId, userId);
    if (!result.version) throw new Error("Failed to delete entry");

    createEvent({
      reportId: result.reportId,
      actorId: userId,
      eventType: "entry.deleted",
      metadata: { entryId, version: result.version },
    });

    createNotification({
      userId,
      type: "entry.deleted",
      title: "Entry deleted",
      body: "An entry was deleted",
      actionUrl: `/reports/${result.reportId}?tab=Activity`,
    });

    return { success: true, reportId: result.reportId };
  }

  async getHistory(entryId: string, userId: string): Promise<SnapshotVersion[]> {
    const reportId = await this.repo.getEntryReportId(entryId);
    if (!reportId) throw new ValidationError("Entry not found");

    const role = await this.repo.checkMemberRole(reportId, userId);
    if (!role) throw new PermissionError("Access denied");

    return this.repo.getHistory(entryId, userId);
  }
}

export function computeDiff(
  current: SnapshotVersion,
  previous: SnapshotVersion | null
): Array<{ field: string; from: unknown; to: unknown }> {
  if (!previous) return [];
  const diffs: Array<{ field: string; from: unknown; to: unknown }> = [];

  if (current.amount !== previous.amount) {
    diffs.push({ field: "amount", from: previous.amount, to: current.amount });
  }
  if (current.category !== previous.category) {
    diffs.push({ field: "category", from: previous.category, to: current.category });
  }
  if (current.note !== previous.note) {
    diffs.push({ field: "note", from: previous.note, to: current.note });
  }
  if (current.entryDate !== previous.entryDate) {
    diffs.push({ field: "entryDate", from: previous.entryDate, to: current.entryDate });
  }
  if (current.lineItems.length !== previous.lineItems.length) {
    diffs.push({
      field: "lineItems",
      from: previous.lineItems.length,
      to: current.lineItems.length,
    });
  }

  return diffs;
}
