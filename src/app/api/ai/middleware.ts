import { NextRequest } from "next/server";
import { ChatRequestSchema, ChatRequest } from "./contract";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS ?? 2048);
const MAX_RATE = 10;
const WINDOW_MS = 60_000;

const rateStore = new Map<string, { count: number; windowStart: number }>();

const INJECTION_PATTERNS = [
  { test: (s: string) => /^(ignore|disregard|forget|you are now)\b/i.test(s.trim()) },
  { test: (s: string) => /\[SYSTEM\]|<system>|<\/s>|###/.test(s) },
  { test: (s: string) => s.length > 3000 },
];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

function extractUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (payload.sub as string) ?? (payload.id as string) ?? null;
}

function detectInjection(messages: { role: string; content: string }[]): string | null {
  for (const msg of messages) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(msg.content)) {
        return `Prompt injection detected in message content`;
      }
    }
  }
  return null;
}

function estimateTokenCount(totalChars: number): number {
  return Math.ceil(totalChars / 4);
}

export interface ValidationResult {
  valid: boolean;
  userId?: string | null;
  error?: Response;
  data?: ChatRequest;
}

export async function validateChatRequest(
  request: NextRequest,
  requestId: string,
): Promise<ValidationResult> {
  let userId: string | null = null;

  // 1. Authentication
  const authHeader = request.headers.get("authorization");
  userId = extractUserId(authHeader);
  if (!userId) {
    return {
      valid: false,
      error: Response.json(
        { status: 401, message: "Authentication required", refId: requestId, data: null },
        { status: 401 },
      ),
    };
  }

  // 2. Request size check
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
    return reject(requestId, 413, "Request body too large", userId);
  }

  // 3. Parse body
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf-8") > MAX_BODY_BYTES) {
      return reject(requestId, 413, "Request body too large", userId);
    }
    body = JSON.parse(text);
  } catch {
    return reject(requestId, 400, "Invalid JSON body", userId);
  }

  // 4. Schema validation (strict mode)
  const parsed = ChatRequestSchema.strict().safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return reject(requestId, 400, `Validation error: ${issue.path.join(".")} ${issue.message}`, userId);
  }

  const data = parsed.data;

  // 5. Prompt injection detection
  const injectionReason = detectInjection(data.messages);
  if (injectionReason) {
    console.warn(`[${requestId}] Rejected: ${injectionReason} (userId: ${userId})`);
    return reject(requestId, 400, injectionReason, userId);
  }

  // 6. Token pre-check
  const totalChars = data.messages.reduce((s, m) => s + m.content.length, 0);
  const estimatedTokens = estimateTokenCount(totalChars);
  if (estimatedTokens > MAX_TOKENS * 0.8) {
    console.warn(`[${requestId}] Rejected: estimated tokens ${estimatedTokens} exceeds limit (userId: ${userId})`);
    return reject(requestId, 400, "Input too long — reduce message length", userId);
  }

  // 7. Rate limiting
  const now = Date.now();
  let entry = rateStore.get(userId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateStore.set(userId, entry);
  }
  if (entry.count >= MAX_RATE) {
    const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    console.warn(`[${requestId}] Rate limit exceeded for userId: ${userId}`);
    return {
      valid: false,
      userId,
      error: Response.json(
        {
          status: 429,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          refId: requestId,
          data: null,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      ),
    };
  }
  entry.count++;

  return { valid: true, userId, data };
}

function reject(
  requestId: string,
  status: number,
  message: string,
  userId?: string,
): ValidationResult {
  console.warn(`[${requestId}] Rejected: ${message}${userId ? ` (userId: ${userId})` : ""}`);
  return {
    valid: false,
    userId,
    error: Response.json({ status, message, refId: requestId, data: null }, { status }),
  };
}
