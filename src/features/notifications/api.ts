export async function getNotifications() {
  const res = await fetch("/api/notifications");
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed");
  return json.data;
}

export async function markNotificationRead(id: string) {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markRead", id }),
  });
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markAllRead" }),
  });
  return res.json();
}
