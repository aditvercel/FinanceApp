import { NextRequest, NextResponse } from "next/server";
import { ReportsService } from "../service";
import { requireAuth, getRequestId } from "@/lib/middleware";
import { ok, err } from "@/lib/types";
import { z } from "zod";

const service = new ReportsService();

const UpdateReportSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const report = await service.getDetail(id, auth);
    if (!report) {
      return NextResponse.json(err(404, "Report not found", requestId), { status: 404 });
    }
    return NextResponse.json(ok(report, "Report retrieved", requestId));
  } catch (error) {
    console.error(`[${requestId}] Get report error:`, error);
    return NextResponse.json(err(500, "Failed to retrieve report", requestId), { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateReportSchema.parse(body);
    const success = await service.update(id, auth, validated);
    if (!success) {
      return NextResponse.json(err(403, "Only the owner can edit this report", requestId), { status: 403 });
    }
    return NextResponse.json(ok(null, "Report updated", requestId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(err(400, "Invalid data", requestId), { status: 400 });
    }
    console.error(`[${requestId}] Update report error:`, error);
    return NextResponse.json(err(500, "Failed to update report", requestId), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const success = await service.delete(id, auth);
    if (!success) {
      return NextResponse.json(err(403, "Only the owner can delete this report", requestId), { status: 403 });
    }
    return NextResponse.json(ok({ id }, "Report deleted", requestId));
  } catch (error) {
    console.error(`[${requestId}] Delete report error:`, error);
    return NextResponse.json(err(500, "Failed to delete report", requestId), { status: 500 });
  }
}
