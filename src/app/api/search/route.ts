import { NextRequest, NextResponse } from "next/server";
import { SearchQuerySchema } from "./contract";
import { search } from "./service";
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

    const parsed = SearchQuerySchema.parse(searchParams);

    const results = await search(parsed, userId);

    return NextResponse.json(ok(results, "Search results", requestId));
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(err(400, "Invalid search query", requestId), { status: 400 });
  }
}
