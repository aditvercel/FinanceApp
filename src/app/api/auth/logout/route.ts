import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/types";
import { getRequestId } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );
    await supabase.auth.signOut();
  } catch {
    // Silently ignore — session may already be invalid
  }

  return NextResponse.json(ok(null, "Logged out", requestId));
}
