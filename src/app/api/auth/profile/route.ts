import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { ok, err } from "@/lib/types";
import { getRequestId, requireAuth } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const userId = auth;

  try {
    // In mock mode, return a mock profile
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return NextResponse.json(
        ok(
          {
            id: userId,
            displayName: "Mock User",
            email: "mock@example.com",
            avatarUrl: undefined,
          },
          "Profile retrieved (mock)",
          requestId
        )
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      return NextResponse.json(err(404, "User not found", requestId), { status: 404 });
    }

    const supabaseUser = data.user;

    return NextResponse.json(
      ok(
        {
          id: supabaseUser.id,
          displayName:
            supabaseUser.user_metadata?.display_name ??
            supabaseUser.user_metadata?.full_name ??
            supabaseUser.email?.split("@")[0] ??
            "User",
          email: supabaseUser.email ?? undefined,
          avatarUrl: supabaseUser.user_metadata?.avatar_url ?? undefined,
        },
        "Profile retrieved",
        requestId
      )
    );
  } catch (e) {
    console.error("Profile error:", e);
    return NextResponse.json(err(500, "Failed to retrieve profile", requestId), { status: 500 });
  }
}
