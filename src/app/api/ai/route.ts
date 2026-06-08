import { NextRequest, NextResponse } from "next/server";
import { ClaudeService } from "./service";
import { validateChatRequest } from "./middleware";
import { ValidationError, RateLimitError, InternalError } from "./types";

const service = new ClaudeService();

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const isStream = request.headers.get("accept") === "text/event-stream" ||
    request.nextUrl.searchParams.get("stream") === "true";

  const validation = await validateChatRequest(request, requestId);
  if (!validation.valid) {
    return validation.error!;
  }

  const { data, userId } = validation;

  try {
    if (isStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(`: refId=${requestId}\n\n`),
          );

          try {
            for await (const chunk of service.stream(data!, requestId, userId!)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            const msg = err instanceof InternalError ? err.message : "Stream error";
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Ref-Id": requestId,
        },
      });
    }

    const response = await service.chat(data!, requestId, userId!);

    return NextResponse.json({
      status: 200,
      message: "Success",
      refId: requestId,
      data: response,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { status: 400, message: error.message, refId: requestId, data: null },
        { status: 400 },
      );
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { status: 429, message: error.message, refId: requestId, data: null },
        { status: 429 },
      );
    }
    if (error instanceof InternalError) {
      return NextResponse.json(
        { status: error.statusCode, message: error.message, refId: requestId, data: null },
        { status: error.statusCode },
      );
    }

    console.error(`[${requestId}] Unhandled error:`, error);
    return NextResponse.json(
      { status: 500, message: "Internal error", refId: requestId, data: null },
      { status: 500 },
    );
  }
}