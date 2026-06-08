import { NextRequest, NextResponse } from "next/server";
import { RevertEntrySchema } from "../../contract";
import { EntryService, ValidationError, PermissionError } from "../../service";
import { EntryRepository } from "../../repository";
import { getRequestId, requireAuth, requireRateLimit } from "@/lib/middleware";
import { ok, err } from "@/lib/types";
import { ZodError } from "zod";

const service = new EntryService(new EntryRepository());

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "heavy");
  if (rateLimit) return rateLimit;

  try {
    const { id: entryId } = await params;

    const body = await request.json();
    const validated = RevertEntrySchema.parse(body);

    const entry = await service.revert(entryId, userId, validated.targetVersion);
    return NextResponse.json(ok(entry, "Entry reverted", requestId));
  } catch (error) {
    console.error("Revert entry error:", error);
    if (error instanceof ValidationError) {
      return NextResponse.json(err(404, error.message, requestId), { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json(err(403, error.message, requestId), { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        err(400, "Validation failed: " + error.issues.map((e) => e.message).join(", "), requestId),
        { status: 400 }
      );
    }
    return NextResponse.json(err(500, "Internal error", requestId), { status: 500 });
  }
}
