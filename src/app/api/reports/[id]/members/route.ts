import { NextRequest, NextResponse } from "next/server";
import { ManageMemberSchema } from "../../contract";
import { ReportsService } from "../../service";
import { requireAuth, requireRateLimit, getRequestId } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const service = new ReportsService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "write");
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = ManageMemberSchema.parse(body);

    const success = await service.manageMember(id, auth, validated.action, {
      userId: validated.userId,
    });

    if (!success) {
      return NextResponse.json(
        err(403, "Only the owner can manage members", requestId),
        { status: 403 }
      );
    }

    return NextResponse.json(ok(null, "Member updated", requestId));
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json(
        err(400, "Invalid request", requestId),
        { status: 400 }
      );
    }
    console.error(`[${requestId}] Manage member error:`, e);
    return NextResponse.json(
      err(500, "Failed to manage member", requestId),
      { status: 500 }
    );
  }
}
