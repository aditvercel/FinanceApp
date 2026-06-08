import { NextRequest, NextResponse } from "next/server";
import { MarkReadSchema } from "./contract";
import {
  getNotifications,
  markRead,
  markAllRead,
} from "./repository";
import { ok, err } from "@/lib/types";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "read");
  if (rateLimit) return rateLimit;

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(1, Number(limitParam)), 50) : 50;

    const notifications = await getNotifications(userId, limit);

    return NextResponse.json(ok(notifications, "Notifications retrieved", requestId));
  } catch (error) {
    console.error("Notifications list error:", error);
    return NextResponse.json(err(500, "Failed to retrieve notifications", requestId), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  try {
    const body = await request.json();
    const validated = MarkReadSchema.parse(body);

    if (validated.action === "markRead") {
      if (!validated.id) {
        return NextResponse.json(err(400, "Notification id is required for markRead", requestId), { status: 400 });
      }
      await markRead(validated.id, userId);

      return NextResponse.json(ok(null, "Notification marked as read", requestId));
    }

    if (validated.action === "markAllRead") {
      await markAllRead(userId);

      return NextResponse.json(ok(null, "All notifications marked as read", requestId));
    }

    return NextResponse.json(err(400, "Invalid action", requestId), { status: 400 });
  } catch {
    return NextResponse.json(err(400, "Invalid request body", requestId), { status: 400 });
  }
}
