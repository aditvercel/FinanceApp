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
  userId: string,
  reportIds?: string[]
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
  } else if (reportIds && reportIds.length > 0) {
    dbQuery = dbQuery.in("report_id", reportIds);
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
    client.from("reports").select("id").eq("owner_id", userId).is("deleted_at", null),
    client
      .from("report_members")
      .select("report_id, reports!inner(deleted_at)")
      .eq("user_id", userId)
      .is("reports.deleted_at", null),
  ]);

  const owned = (ownedResult.data ?? []).map((r: { id: string }) => r.id);
  const member = (memberResult.data ?? []).map((r: { report_id: string }) => r.report_id);
  return [...new Set([...owned, ...member])];
}

export async function clearEvents(reportIds: string[]): Promise<void> {
  if (reportIds.length === 0) return;
  const client = supabase;
  await client.from("activity_events").delete().in("report_id", reportIds);
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

export type UserProfile = {
  displayName: string;
  avatarUrl: string | null;
};

export async function getUsersDisplayNames(
  userIds: string[]
): Promise<Record<string, UserProfile>> {
  if (userIds.length === 0) return {};

  const map: Record<string, UserProfile> = {};

  const serviceClient = getServiceClient();

  // Try user_preferences first
  try {
    const { data } = await serviceClient
      .from("user_preferences")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    if (data) {
      for (const row of data) {
        map[row.user_id] = {
          displayName: row.display_name || "User",
          avatarUrl: (row as any).avatar_url || null,
        };
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
      const avatarUrl = authData?.user?.user_metadata?.avatar_url ?? null;
      map[id] = { displayName: name, avatarUrl };
      // Upsert for future lookups
      try {
        await serviceClient.from("user_preferences").upsert({
          user_id: id,
          display_name: name,
          avatar_url: avatarUrl,
        });
      } catch {
      }
    } catch {
      map[id] = { displayName: "User", avatarUrl: null };
    }
  }

  return map;
}
