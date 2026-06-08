import { supabase } from "@/lib/supabase";
import type { Notification } from "./contract";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
    metadata: row.metadata ?? undefined,
  };
}

export async function getNotifications(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const client = supabase;

  const unread = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  const unreadRows = (unread.data ?? []) as NotificationRow[];
  const unreadMapped = unreadRows.map(mapRow);

  if (unreadMapped.length >= limit) {
    return unreadMapped;
  }

  const remaining = limit - unreadMapped.length;

  const read = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", true)
    .order("created_at", { ascending: false })
    .limit(remaining);

  const readRows = (read.data ?? []) as NotificationRow[];
  const readMapped = readRows.map(mapRow);

  return [...unreadMapped, ...readMapped];
}

export async function markRead(
  id: string,
  userId: string
): Promise<void> {
  const client = supabase;

  await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function markAllRead(userId: string): Promise<void> {
  const client = supabase;

  await client
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

export async function createNotification(
  data: Omit<Notification, "id" | "createdAt" | "isRead">
): Promise<void> {
  const client = supabase;

  const { error } = await client.from("notifications").insert({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    action_url: data.actionUrl ?? null,
    is_read: false,
    metadata: data.metadata ?? null,
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }
}
