import { NextRequest, NextResponse } from "next/server";
import { EditEntrySchema, RevertEntrySchema } from "../contract";
import { EntryService, PermissionError, ValidationError } from "../service";
import { EntryRepository } from "../repository";
import { getRequestId, requireAuth, requireRateLimit } from "@/lib/middleware";
import { ok, err } from "@/lib/types";
import { ZodError } from "zod";

const service = new EntryService(new EntryRepository());

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "write");
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = EditEntrySchema.parse(body);
    const entry = await service.edit(id, userId, validated);
    return NextResponse.json(ok(entry, "Entry updated", requestId));
  } catch (error) {
    console.error("Edit entry error:", error);
    if (error instanceof ValidationError || error instanceof PermissionError) {
      return NextResponse.json(err(400, error.message, requestId), { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(err(400, "Validation failed", requestId), { status: 400 });
    }
    return NextResponse.json(err(500, "Failed to update entry", requestId), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "write");
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;
    const result = await service.delete(id, userId);
    return NextResponse.json(ok(result, "Entry deleted", requestId));
  } catch (error) {
    console.error("Delete entry error:", error);
    if (error instanceof PermissionError) {
      return NextResponse.json(err(403, error.message, requestId), { status: 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(err(404, error.message, requestId), { status: 404 });
    }
    return NextResponse.json(err(500, "Failed to delete entry", requestId), { status: 500 });
  }
}
