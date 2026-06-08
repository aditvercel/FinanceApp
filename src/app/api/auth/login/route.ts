import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ok, err } from "@/lib/types";
import { getRequestId } from "@/lib/middleware";

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const validated = LoginSchema.parse(body);

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      // In mock mode, accept any credentials
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const mockUserId = crypto.randomUUID();
        return NextResponse.json(
          ok(
            {
              token: `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: mockUserId }))}.mock`,
              user: {
                id: mockUserId,
                email: validated.email,
                displayName: validated.email.split("@")[0],
              },
            },
            "Login successful (mock)",
            requestId
          )
        );
      }

      const message =
        error.message === "Invalid login credentials"
          ? "Invalid email or password"
          : error.message || "Authentication failed";
      return NextResponse.json(err(401, message, requestId), { status: 401 });
    }

    const session = data.session;
    if (!session) {
      return NextResponse.json(err(401, "Authentication failed", requestId), { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email ?? validated.email;
    const displayName =
      session.user.user_metadata?.display_name ??
      session.user.user_metadata?.full_name ??
      userEmail.split("@")[0];

    return NextResponse.json(
      ok(
        {
          token: session.access_token,
          user: {
            id: userId,
            email: userEmail,
            displayName,
            avatarUrl: session.user.user_metadata?.avatar_url,
          },
        },
        "Login successful",
        requestId
      )
    );
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json(err(400, "Invalid email or password format", requestId), {
        status: 400,
      });
    }
    console.error("Login error:", e);
    return NextResponse.json(err(500, "Authentication service unavailable", requestId), {
      status: 500,
    });
  }
}
