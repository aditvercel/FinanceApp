import { NextRequest, NextResponse } from "next/server";
import { ExportService } from "./service";
import { ExportQuerySchema } from "./contract";
import { getUserId, requireRateLimit } from "@/lib/middleware";
import { err } from "@/lib/types";

const exportService = new ExportService();

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(err(401, "Authentication required", requestId), {
      status: 401,
    });
  }

  const rateLimitResponse = requireRateLimit(request, userId, "export");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const queryParams = {
    reportId: searchParams.get("reportId"),
    format: searchParams.get("format") ?? "csv",
    period: searchParams.get("period") ?? "all",
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  };

  const validated = ExportQuerySchema.safeParse(queryParams);
  if (!validated.success) {
    return NextResponse.json(
      err(400, validated.error.issues[0]?.message ?? "Invalid parameters", requestId),
      { status: 400 }
    );
  }

  const { reportId, format, period, startDate, endDate } = validated.data;

  try {
    const result = await exportService.export(
      reportId,
      format,
      period,
      userId,
      requestId,
      startDate,
      endDate
    );

    if (result.suggestions && result.suggestions.length > 0) {
      return NextResponse.json(
        {
          status: 422,
          message: `Entry count (${result.entryCount}) exceeds PDF limit of 10000`,
          refId: requestId,
          data: {
            entryCount: result.entryCount,
            suggestions: result.suggestions,
          },
        },
        { status: 422 }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer!), {
      headers: {
        "Content-Type": result.contentType!,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.buffer!.length),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export failed";
    console.error(`[${requestId}] Export error:`, error);
    return NextResponse.json(err(500, message, requestId), {
      status: 500,
    });
  }
}
