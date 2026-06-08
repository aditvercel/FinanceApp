import { NextRequest, NextResponse } from "next/server";
import { CreateEntrySchema } from "./contract";
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
    const reportId = request.nextUrl.searchParams.get("reportId");
    if (!reportId) {
      return NextResponse.json(err(400, "reportId query parameter required", requestId), { status: 400 });
    }

    const entries = await service.list(reportId, userId);
    return NextResponse.json(ok(entries, "Entries retrieved", requestId));
  } catch (error) {
    console.error("List entries error:", error);
    if (error instanceof PermissionError) {
      return NextResponse.json(err(403, error.message, requestId), { status: 403 });
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
