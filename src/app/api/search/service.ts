import { supabase } from "@/lib/supabase";
import type { SearchQuery, SearchResult, ParsedQuery } from "./contract";

function parseQueryText(q: string): ParsedQuery {
  const parts = q.trim().split(/\s+/);
  const textTerms: string[] = [];
  let amountMin: number | undefined;
  let amountMax: number | undefined;

  for (const part of parts) {
    if (part.startsWith(">")) {
      const val = Number(part.slice(1));
      if (!isNaN(val) && val > 0) {
        amountMin = val;
        continue;
      }
    }
    if (part.startsWith("<")) {
      const val = Number(part.slice(1));
      if (!isNaN(val) && val > 0) {
        amountMax = val;
        continue;
      }
    }
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const min = Number(rangeMatch[1]);
      const max = Number(rangeMatch[2]);
      if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0 && min <= max) {
        amountMin = min;
        amountMax = max;
        continue;
      }
    }
    textTerms.push(part);
  }

  return { textTerms, amountMin, amountMax };
}

export async function search(
  query: SearchQuery,
  userId: string
): Promise<SearchResult[]> {
  const client = supabase;
  const parsed = parseQueryText(query.q);

  const effectiveAmountMin = parsed.amountMin ?? query.amountMin;
  const effectiveAmountMax = parsed.amountMax ?? query.amountMax;

  const reportIds = await getAccessibleReportIds(userId);
  if (reportIds.length === 0) return [];
  if (query.reportId && !reportIds.includes(query.reportId)) return [];

  const targetReportIds = query.reportId
    ? [query.reportId]
    : reportIds;

  const reportIdToName = await getReportNames(targetReportIds);

  let snapQuery = client
    .from("entry_snapshots")
    .select(`
      id,
      entry_id,
      type,
      amount,
      category,
      note,
      entry_date,
      version
    `)
    .eq("is_current", true)
    .order("entry_date", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.type) {
    snapQuery = snapQuery.eq("type", query.type);
  }
  if (query.category) {
    snapQuery = snapQuery.eq("category", query.category);
  }
  if (effectiveAmountMin !== undefined) {
    snapQuery = snapQuery.gte("amount", effectiveAmountMin);
  }
  if (effectiveAmountMax !== undefined) {
    snapQuery = snapQuery.lte("amount", effectiveAmountMax);
  }
  if (query.dateStart) {
    snapQuery = snapQuery.gte("entry_date", query.dateStart);
  }
  if (query.dateEnd) {
    snapQuery = snapQuery.lte("entry_date", query.dateEnd);
  }

  if (parsed.textTerms.length > 0) {
    for (const term of parsed.textTerms) {
      snapQuery = snapQuery.or(
        `note.ilike.%${term}%,category.ilike.%${term}%`
      );
    }
  }

  const { data: snapshots, error } = await snapQuery;

  if (error) {
    console.error("Search query error:", error);
    return [];
  }

  if (!snapshots || snapshots.length === 0) return [];

  const entryIds = snapshots.map((s: any) => s.entry_id);

  const entryReportMap = await getEntryReportMap(entryIds);
  const lineItemMap = await getLineItemsForEntries(entryIds);

  const results: SearchResult[] = [];

  for (const snap of snapshots as any[]) {
    const reportId = entryReportMap[snap.entry_id];

    if (!reportId || !targetReportIds.includes(reportId)) continue;

    results.push({
      entryId: snap.entry_id,
      reportId,
      reportName: reportIdToName[reportId] ?? "Unknown",
      type: snap.type,
      amount: snap.amount,
      category: snap.category,
      note: snap.note ?? "",
      entryDate: snap.entry_date,
      matchedField: computeMatchedField(snap, parsed.textTerms),
      lineItems: lineItemMap[snap.entry_id] ?? [],
    });
  }

  return results;
}

function computeMatchedField(
  snapshot: any,
  textTerms: string[]
): string {
  if (textTerms.length === 0) return "all";

  const note = (snapshot.note ?? "").toLowerCase();
  const category = (snapshot.category ?? "").toLowerCase();

  for (const term of textTerms) {
    const lower = term.toLowerCase();
    if (note.includes(lower)) return "note";
    if (category.includes(lower)) return "category";
  }

  return "note";
}

async function getEntryReportMap(
  entryIds: string[]
): Promise<Record<string, string>> {
  if (entryIds.length === 0) return {};

  const client = supabase;

  const { data } = await client
    .from("entries")
    .select("id, report_id")
    .in("id", entryIds);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.report_id;
  }
  return map;
}

async function getLineItemsForEntries(
  entryIds: string[]
): Promise<Record<string, Array<{ name: string; price: number }>>> {
  if (entryIds.length === 0) return {};

  const client = supabase;

  const { data } = await client
    .from("entry_line_items")
    .select("entry_id, name, price, snapshot_version")
    .in("entry_id", entryIds);

  const activeVersions = await getActiveSnapshotVersions(entryIds);

  const map: Record<string, Array<{ name: string; price: number }>> = {};

  for (const row of data ?? []) {
    const activeVersion = activeVersions[row.entry_id];
    if (activeVersion !== undefined && row.snapshot_version !== activeVersion) {
      continue;
    }
    if (!map[row.entry_id]) {
      map[row.entry_id] = [];
    }
    map[row.entry_id].push({ name: row.name, price: row.price });
  }

  return map;
}

async function getActiveSnapshotVersions(
  entryIds: string[]
): Promise<Record<string, number>> {
  if (entryIds.length === 0) return {};

  const client = supabase;

  const { data } = await client
    .from("entry_snapshots")
    .select("entry_id, version")
    .in("entry_id", entryIds)
    .eq("is_current", true);

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.entry_id] = row.version;
  }
  return map;
}

async function getReportNames(
  reportIds: string[]
): Promise<Record<string, string>> {
  if (reportIds.length === 0) return {};

  const client = supabase;

  const { data } = await client
    .from("reports")
    .select("id, name")
    .in("id", reportIds);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.name;
  }
  return map;
}

async function getAccessibleReportIds(
  userId: string
): Promise<string[]> {
  const client = supabase;

  const [ownedResult, memberResult] = await Promise.all([
    client.from("reports").select("id").eq("owner_id", userId),
    client
      .from("report_members")
      .select("report_id")
      .eq("user_id", userId),
  ]);

  const owned = (ownedResult.data ?? []).map((r) => r.id);
  const member = (memberResult.data ?? []).map((r) => r.report_id);
  return [...new Set([...owned, ...member])];
}
