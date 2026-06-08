import { NextRequest, NextResponse } from "next/server";
import { ReceiptScanService, ValidationError, InternalError } from "./service";
import { getRequestId, requireAuth, requireRateLimit } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not set — receipt scanning will fail");
}

const scanService = new ReceiptScanService();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const rateLimit = requireRateLimit(request, userId, "scan");
  if (rateLimit) return rateLimit;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(err(400, "No file provided", requestId), { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        err(415, `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`, requestId),
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        err(413, `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`, requestId),
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let mimeType = file.type;

    if (mimeType === "application/pdf") {
      try {
        const { fromBuffer } = await import("pdf2pic");
        const converter = fromBuffer(buffer, {
          density: 150,
          format: "png",
          width: 1200,
          height: 1600,
        });
        const result = await converter(1, { responseType: "base64" });
        if (result.base64) {
          mimeType = "image/png";
          const pngBuffer = Buffer.from(result.base64, "base64");
          const scanResult = await scanService.scan(pngBuffer, mimeType, requestId);
          return NextResponse.json(ok(scanResult, "Scan successful", requestId));
        }
      } catch {
        return NextResponse.json(
          err(400, "Failed to process PDF. Please upload an image instead.", requestId),
          { status: 400 }
        );
      }
    }

    const scanResult = await scanService.scan(buffer, mimeType, requestId);
    return NextResponse.json(ok(scanResult, "Scan successful", requestId));
  } catch (error: any) {
    console.error(`[${requestId}] Scan error:`, error?.message || error, error?.stack ? "\n" + error.stack : "");
    if (error instanceof ValidationError) {
      return NextResponse.json(err(400, error.message, requestId), { status: 400 });
    }
    if (error instanceof InternalError) {
      return NextResponse.json(err(500, error.message, requestId), { status: 500 });
    }
    const status = error?.status || error?.statusCode || 500;
    const message =
      status === 401 || status === 403
        ? "AI service authentication failed. Check GROQ_API_KEY."
        : status === 429
        ? "Rate limited by AI service. Try again in a moment."
        : error?.message?.includes("timeout")
        ? "AI service timed out. Try a smaller image."
        : `Scan failed: ${error?.message || "Unknown error"}`;
    return NextResponse.json(err(status >= 400 && status < 500 ? status : 500, message, requestId), { status: status >= 400 && status < 500 ? status : 500 });
  }
}
