import { NextRequest, NextResponse } from "next/server";
import { ActivityQuerySchema } from "./contract";
import { listEvents } from "./service";
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
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    const parsedLimit = searchParams.limit ? Number(searchParams.limit) : undefined;
    const parsed = ActivityQuerySchema.parse({
      ...searchParams,
      limit: parsedLimit,
    });

    const events = await listEvents(parsed, userId);

    return NextResponse.json(ok(events, "Activity retrieved", requestId));
  } catch (error) {
    console.error("Activity list error:", error);
    return NextResponse.json(err(400, "Invalid query parameters", requestId), { status: 400 });
  }
}
