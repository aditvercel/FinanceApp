import { NextRequest, NextResponse } from "next/server";
import { CreateEntrySchema, ListEntriesQuerySchema } from "./contract";
import { EntryService, PermissionError, ValidationError } from "./service";
import { EntryRepository } from "./repository";
import { getRequestId, requireAuth, requireRateLimit } from "@/lib/middleware";
import { ok, created, err } from "@/lib/types";
import { ZodError } from "zod";

const service = new EntryService(new EntryRepository());

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "read");
  if (rateLimit) return rateLimit;

  try {
    const rawParams = {
      reportId: request.nextUrl.searchParams.get("reportId"),
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    };
    const params = ListEntriesQuerySchema.parse(rawParams);

    const result = await service.list(params.reportId, userId, {
      cursor: params.cursor,
      limit: params.limit,
    });
    return NextResponse.json(ok(result, "Entries retrieved", requestId));
  } catch (error) {
    console.error("List entries error:", error);
    if (error instanceof PermissionError) {
      return NextResponse.json(err(403, error.message, requestId), { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(err(400, "Invalid query parameters", requestId), { status: 400 });
    }
    return NextResponse.json(err(500, "Internal error", requestId), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "write");
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const validated = CreateEntrySchema.parse(body);

    const entry = await service.create(validated, userId);
    return NextResponse.json(created(entry, "Entry created", requestId), { status: 201 });
  } catch (error) {
    console.error("Create entry error:", error);
    if (error instanceof ValidationError || error instanceof PermissionError) {
      return NextResponse.json(err(400, error.message, requestId), { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(err(400, "Validation failed: " + error.issues.map(e => e.message).join(", "), requestId), { status: 400 });
    }
    return NextResponse.json(err(500, "Internal error", requestId), { status: 500 });
  }
}
