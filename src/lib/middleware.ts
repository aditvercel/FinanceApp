import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { err } from "./types";

export function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

/**
 * Get the authenticated user ID from the request.
 * Tries Supabase session cookies first, falls back to Bearer token.
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  // Try Supabase session from cookies (SSR — browser clients)
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only context — no cookie writing needed
          },
        },
      },
    );
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    // Fall through to Bearer token
  }

  // Fallback: Bearer token (for mobile/external clients)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest,
): Promise<string | NextResponse> {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(err(401, "Authentication required"), { status: 401 });
  }
  return userId;
}

const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  chat: { limit: 10, window: 60 },
  stream: { limit: 10, window: 60 },
  scan: { limit: 10, window: 60 },
  read: { limit: 60, window: 60 },
  write: { limit: 30, window: 60 },
  heavy: { limit: 10, window: 60 },
  join: { limit: 5, window: 60 },
  export: { limit: 5, window: 60 },
  insights: { limit: 5, window: 3600 },
};

const counters = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  userId: string,
  tier: keyof typeof RATE_LIMITS,
): boolean {
  const config = RATE_LIMITS[tier];
  if (!config) return true;
  const key = `${userId}:${tier}`;
  const now = Date.now();
  const entry = counters.get(key);
  if (!entry || now - entry.windowStart > config.window * 1000) {
    counters.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= config.limit) return false;
  entry.count++;
  return true;
}

export function requireRateLimit(
  request: NextRequest,
  userId: string,
  tier: keyof typeof RATE_LIMITS,
): NextResponse | null {
  if (!checkRateLimit(userId, tier)) {
    return NextResponse.json(
      err(429, `Rate limit exceeded. Try again later.`),
      { status: 429 },
    );
  }
  return null;
}

const BLOCKED_PATTERNS = [
  /^ignore/i,
  /^disregard/i,
  /^forget/i,
  /^you are now/i,
  /\[SYSTEM\]/,
  /<system>/i,
  /<\/s>/i,
  /###/,
];

export function detectPromptInjection(content: string): boolean {
  if (content.length > 3000) return true;
  return BLOCKED_PATTERNS.some((p) => p.test(content));
}
