import type { ActivityQuery, ActivityEvent } from "./contract";
import { getEvents, getAccessibleReportIds, getUsersDisplayNames } from "./repository";

export async function listEvents(
  query: ActivityQuery,
  userId: string
): Promise<ActivityEvent[]> {
  const reportIds = await getAccessibleReportIds(userId);

  if (reportIds.length === 0) {
    return [];
  }

  if (query.reportId && !reportIds.includes(query.reportId)) {
    return [];
  }

  const events = await getEvents(query, userId);

  if (events.length === 0) {
    return [];
  }

  const metaNames: Record<string, string> = {};
  for (const e of events) {
    const meta = e.metadata as Record<string, any> | null;
    if (meta?.actor_name) {
      metaNames[e.actor_id] = meta.actor_name;
    }
  }

  const missingActorIds = [...new Set(events.map((e) => e.actor_id).filter((id) => !metaNames[id]))];
  const userProfiles = missingActorIds.length > 0 ? await getUsersDisplayNames(missingActorIds) : {};

  return events.map((e) => {
    const profile = userProfiles[e.actor_id];
    return {
      id: e.id,
      reportId: e.report_id,
      actorId: e.actor_id,
      actorName: metaNames[e.actor_id] ?? profile?.displayName ?? "Unknown",
      actorAvatarUrl: profile?.avatarUrl ?? null,
      eventType: e.event_type,
      metadata: e.metadata as Record<string, any>,
      createdAt: e.created_at,
    };
  });
}
