import { supabase, getServiceClient } from "@/lib/supabase";
import type { ActivityQuery } from "./contract";

export type EventRow = {
  id: string;
  report_id: string;
  actor_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreateEventData = {
  reportId: string;
  actorId: string;
  actorName?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
};

export async function getEvents(
  query: ActivityQuery,
  userId: string
): Promise<EventRow[]> {
  const client = supabase;

  let dbQuery = client
    .from("activity_events")
    .select(`
      id,
      report_id,
      actor_id,
      event_type,
      metadata,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(query.limit);

  if (query.reportId) {
    dbQuery = dbQuery.eq("report_id", query.reportId);
  }

  if (query.eventType) {
    dbQuery = dbQuery.eq("event_type", query.eventType);
  }

  if (query.before) {
    dbQuery = dbQuery.lt("created_at", query.before);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("Failed to fetch activity events:", error);
    return [];
  }

  return (data ?? []) as EventRow[];
}

export async function getAccessibleReportIds(
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

export async function createEvent(data: CreateEventData): Promise<void> {
  const client = supabase;

  const meta = { ...(data.metadata ?? {}) };
  if (data.actorName) {
    meta.actor_name = data.actorName;
  }

  const { error } = await client.from("activity_events").insert({
    report_id: data.reportId,
    actor_id: data.actorId,
    event_type: data.eventType,
    metadata: meta,
  });

  if (error) {
    console.error("Failed to create activity event:", error);
  }
}

export async function getUsersDisplayNames(
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const map: Record<string, string> = {};

  const serviceClient = getServiceClient();

  // Try user_preferences first
  try {
    const { data } = await serviceClient
      .from("user_preferences")
      .select("user_id, display_name")
      .in("user_id", userIds);

    if (data) {
      for (const row of data) {
        map[row.user_id] = row.display_name || "User";
      }
    }
  } catch {
    // fall through
  }

  // Fallback: query auth.users metadata for any missing
  for (const id of userIds) {
    if (map[id]) continue;
    try {
      const { data: authData } = await serviceClient.auth.admin.getUserById(id);
      const name = authData?.user?.user_metadata?.display_name ?? "User";
      map[id] = name;
      // Upsert for future lookups
      try {
        await serviceClient.from("user_preferences").upsert({ user_id: id, display_name: name });
      } catch {
      }
    } catch {
      map[id] = "User";
    }
  }

  return map;
}
