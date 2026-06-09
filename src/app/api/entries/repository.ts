import { getServiceClient } from "@/lib/supabase";
import type { CreateEntry, EditEntry } from "./contract";

interface SnapshotRow {
  id: string;
  entry_id: string;
  version: number;
  changed_by: string;
  action: string;
  reverted_from: number | null;
  type: string;
  amount: number;
  amount_original: number | null;
  currency_original: string | null;
  exchange_rate: number | null;
  exchange_rate_source: string | null;
  exchanged_at: string | null;
  category: string;
  note: string | null;
  merchant: string | null;
  entry_date: string;
  is_current: boolean;
  receipt_image_path: string | null;
  changed_at: string;
}

interface EntryRow {
  id: string;
  report_id: string;
  created_by: string;
  created_at: string;
}

interface LineItemRow {
  id: string;
  entry_id: string;
  snapshot_version: number;
  name: string;
  price: number;
  confidence: string;
  created_at: string;
}

export type EntryWithSnapshot = {
  id: string;
  reportId: string;
  createdBy: string;
  createdAt: string;
  version: number;
  changedBy: string;
  action: string;
  revertedFrom: number | null;
  type: string;
  amount: number;
  amountOriginal: number | null;
  currencyOriginal: string | null;
  exchangeRate: number | null;
  exchangeRateSource: string | null;
  exchangedAt: string | null;
  category: string;
  note: string | null;
  merchant: string | null;
  entryDate: string;
  receiptImagePath: string | null;
  changedAt: string;
  lineItems: Array<{
    name: string;
    price: number;
    confidence: string;
  }>;
};

export type SnapshotVersion = {
  id: string;
  entryId: string;
  version: number;
  changedBy: string;
  action: string;
  revertedFrom: number | null;
  type: string;
  amount: number;
  category: string;
  note: string | null;
  merchant: string | null;
  entryDate: string;
  changedAt: string;
  lineItems: Array<{
    name: string;
    price: number;
    confidence: string;
  }>;
};

function mapEntry(e: EntryRow, s: SnapshotRow): EntryWithSnapshot {
  return {
    id: e.id,
    reportId: e.report_id,
    createdBy: e.created_by,
    createdAt: e.created_at,
    version: s.version,
    changedBy: s.changed_by,
    action: s.action,
    revertedFrom: s.reverted_from,
    type: s.type,
    amount: s.amount,
    amountOriginal: s.amount_original,
    currencyOriginal: s.currency_original,
    exchangeRate: s.exchange_rate,
    exchangeRateSource: s.exchange_rate_source,
    exchangedAt: s.exchanged_at,
    category: s.category,
    note: s.note,
    merchant: s.merchant,
    entryDate: s.entry_date,
    receiptImagePath: s.receipt_image_path,
    changedAt: s.changed_at,
    lineItems: [],
  };
}

export class EntryRepository {
  private get client() {
    const c = getServiceClient();
    if (!c) throw new Error("Supabase client not available");
    return c;
  }

  async getEntries(
    reportId: string,
    userId: string,
    opts?: { cursor?: string; limit?: number }
  ): Promise<{ entries: EntryWithSnapshot[]; nextCursor: string | null }> {
    const pageSize = opts?.limit ?? 20;
    const query = this.client
      .from("entries")
      .select(`
        id,
        report_id,
        created_by,
        created_at,
        entry_snapshots!inner(
          id,
          version,
          changed_by,
          action,
          reverted_from,
          type,
          amount,
          amount_original,
          currency_original,
          exchange_rate,
          exchange_rate_source,
          exchanged_at,
          category,
          note,
          merchant,
          entry_date,
          is_current,
          receipt_image_path,
          changed_at
        )
      `)
      .eq("report_id", reportId)
      .eq("entry_snapshots.is_current", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (opts?.cursor) {
      const [cursorCreatedAt, cursorId] = opts.cursor.split("|");
      query.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    const hasMore = (entries?.length ?? 0) > pageSize;
    const slice = (entries ?? []).slice(0, pageSize);

    const result = await Promise.all(
      slice.map(async (row: Record<string, unknown>) => {
        const e = row as unknown as EntryRow & { entry_snapshots: SnapshotRow[] };
        const snap = e.entry_snapshots?.[0];
        const mapped = mapEntry(e, snap);
        if (snap) {
          const lineItems = await this.getLineItems(e.id, snap.version);
          mapped.lineItems = lineItems;
        }
        return mapped;
      })
    );

    let nextCursor: string | null = null;
    if (hasMore && entries && entries.length > 0) {
      const last = entries[pageSize - 1] as unknown as EntryRow & { entry_snapshots: SnapshotRow[] };
      nextCursor = `${last.created_at}|${last.id}`;
    }

    return { entries: result, nextCursor };
  }

  async getEntry(id: string, userId: string): Promise<EntryWithSnapshot | null> {
    const { data: entry, error } = await this.client
      .from("entries")
      .select(`
        id,
        report_id,
        created_by,
        created_at,
        entry_snapshots!inner(
          id,
          version,
          changed_by,
          action,
          reverted_from,
          type,
          amount,
          amount_original,
          currency_original,
          exchange_rate,
          exchange_rate_source,
          exchanged_at,
          category,
          note,
          merchant,
          entry_date,
          is_current,
          receipt_image_path,
          changed_at
        )
      `)
      .eq("id", id)
      .eq("entry_snapshots.is_current", true)
      .single();

    if (error) return null;
    if (!entry) return null;

    const e = entry as unknown as EntryRow & { entry_snapshots: SnapshotRow[] };
    const snap = e.entry_snapshots?.[0];
    if (!snap) return null;

    const mapped = mapEntry(e, snap);
    mapped.lineItems = await this.getLineItems(e.id, snap.version);
    return mapped;
  }

  async getHistory(entryId: string, userId: string): Promise<SnapshotVersion[]> {
    const { data: snapshots, error } = await this.client
      .from("entry_snapshots")
      .select("*")
      .eq("entry_id", entryId)
      .order("version", { ascending: false });

    if (error) throw error;

    const result: SnapshotVersion[] = [];
    for (const snap of snapshots ?? []) {
      const lineItems = await this.getLineItems(entryId, snap.version);
      result.push({
        id: snap.id,
        entryId: snap.entry_id,
        version: snap.version,
        changedBy: snap.changed_by,
        action: snap.action,
        revertedFrom: snap.reverted_from,
        type: snap.type,
        amount: snap.amount,
        category: snap.category,
        note: snap.note,
        merchant: snap.merchant ?? null,
        entryDate: snap.entry_date,
        changedAt: snap.changed_at,
        lineItems,
      });
    }
    return result;
  }

  async createEntry(
    data: CreateEntry & { createdBy: string; reportId: string; draftId?: string }
  ): Promise<{ entryId: string; version: number }> {
    const entryPayload: Record<string, unknown> = {
      report_id: data.reportId,
      created_by: data.createdBy,
    };
    if (data.draftId) {
      entryPayload.draft_id = data.draftId;
    }

    const { data: entry, error: entryError } = await this.client
      .from("entries")
      .insert(entryPayload)
      .select("id")
      .single();

    if (entryError) throw entryError;

    const { data: snapshot, error: snapError } = await this.client
      .from("entry_snapshots")
      .insert({
        entry_id: entry.id,
        version: 1,
        changed_by: data.createdBy,
        action: "create",
        type: data.type,
        amount: data.amount,
        category: data.category,
        note: data.note ?? null,
        entry_date: data.entryDate,
        is_current: true,
      })
      .select("version")
      .single();

    if (snapError) throw snapError;

    return { entryId: entry.id, version: snapshot.version };
  }

  async editEntry(
    entryId: string,
    data: EditEntry & { changedBy: string }
  ): Promise<{ version: number }> {
    const { data: maxVer, error: verError } = await this.client
      .from("entry_snapshots")
      .select("version")
      .eq("entry_id", entryId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (verError) throw verError;
    const currentVersion = maxVer?.version ?? 0;
    const newVersion = currentVersion + 1;

    const { error: updateError } = await this.client
      .from("entry_snapshots")
      .update({ is_current: false })
      .eq("entry_id", entryId)
      .eq("is_current", true);

    if (updateError) throw updateError;

    const { error: insertError } = await this.client
      .from("entry_snapshots")
      .insert({
        entry_id: entryId,
        version: newVersion,
        changed_by: data.changedBy,
        action: "edit",
        type: data.type,
        amount: data.amount,
        category: data.category,
        note: data.note ?? null,
        entry_date: data.entryDate,
        is_current: true,
      });

    if (insertError) throw insertError;

    return { version: newVersion };
  }

  async revertEntry(
    entryId: string,
    changedBy: string,
    targetVersion: number
  ): Promise<{ version: number }> {
    const { data: sourceSnap, error: sourceError } = await this.client
      .from("entry_snapshots")
      .select("*")
      .eq("entry_id", entryId)
      .eq("version", targetVersion)
      .single();

    if (sourceError) throw new Error("Version not found");

    const { data: maxVer } = await this.client
      .from("entry_snapshots")
      .select("version")
      .eq("entry_id", entryId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const newVersion = (maxVer?.version ?? 0) + 1;

    const { error: updateError } = await this.client
      .from("entry_snapshots")
      .update({ is_current: false })
      .eq("entry_id", entryId)
      .eq("is_current", true);

    if (updateError) throw updateError;

    const { error: insertError } = await this.client
      .from("entry_snapshots")
      .insert({
        entry_id: entryId,
        version: newVersion,
        changed_by: changedBy,
        action: "revert",
        reverted_from: targetVersion,
        type: sourceSnap.type,
        amount: sourceSnap.amount,
        amount_original: sourceSnap.amount_original,
        currency_original: sourceSnap.currency_original,
        exchange_rate: sourceSnap.exchange_rate,
        exchange_rate_source: sourceSnap.exchange_rate_source,
        exchanged_at: sourceSnap.exchanged_at,
        category: sourceSnap.category,
        note: sourceSnap.note,
        merchant: sourceSnap.merchant,
        entry_date: sourceSnap.entry_date,
        is_current: true,
      });

    if (insertError) throw insertError;

    return { version: newVersion };
  }

  async softDeleteEntry(
    entryId: string,
    userId: string
  ): Promise<{ version: number; reportId: string }> {
    const { data: curr, error: currErr } = await this.client
      .from("entry_snapshots")
      .select("id, version")
      .eq("entry_id", entryId)
      .eq("is_current", true)
      .single();

    if (currErr || !curr) return { version: 0, reportId: "" };

    const { data: entryRow } = await this.client
      .from("entries")
      .select("report_id")
      .eq("id", entryId)
      .single();

    const newVersion = curr.version + 1;

    const { error: markErr } = await this.client
      .from("entry_snapshots")
      .update({ is_current: false })
      .eq("id", curr.id);

    if (markErr) return { version: 0, reportId: "" };

    const { error: snapErr } = await this.client
      .from("entry_snapshots")
      .insert({
        entry_id: entryId,
        version: newVersion,
        changed_by: userId,
        action: "deleted",
        type: "expense",
        amount: 0,
        category: "Deleted",
        note: "Entry deleted",
        entry_date: new Date().toISOString().split("T")[0],
        is_current: false,
      });

    if (snapErr) return { version: 0, reportId: "" };

    return { version: newVersion, reportId: entryRow?.report_id ?? "" };
  }

  async insertLineItems(
    entryId: string,
    version: number,
    items: Array<{ name: string; price: number; confidence: string }>
  ): Promise<void> {
    if (items.length === 0) return;

    const { error } = await this.client.from("entry_line_items").insert(
      items.map((item) => ({
        entry_id: entryId,
        snapshot_version: version,
        name: item.name,
        price: item.price,
        confidence: item.confidence,
      }))
    );

    if (error) throw error;
  }

  async getLineItems(
    entryId: string,
    version: number
  ): Promise<Array<{ name: string; price: number; confidence: string }>> {
    const { data, error } = await this.client
      .from("entry_line_items")
      .select("name, price, confidence")
      .eq("entry_id", entryId)
      .eq("snapshot_version", version);

    if (error) return [];
    return data ?? [];
  }

  async checkMemberRole(
    reportId: string,
    userId: string
  ): Promise<"owner" | "editor" | "viewer" | null> {
    const { data: report, error: reportError } = await this.client
      .from("reports")
      .select("owner_id")
      .eq("id", reportId)
      .single();

    if (!reportError && report?.owner_id === userId) return "owner";

    const { data: member, error: memberError } = await this.client
      .from("report_members")
      .select("role")
      .eq("report_id", reportId)
      .eq("user_id", userId)
      .single();

    if (memberError) return null;
    return member?.role as "owner" | "editor" | "viewer" | null;
  }

  async getEntryReportId(entryId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("entries")
      .select("report_id")
      .eq("id", entryId)
      .single();

    if (error) return null;
    return data?.report_id ?? null;
  }
}
