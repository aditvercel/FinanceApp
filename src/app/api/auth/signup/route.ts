import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ok, err } from "@/lib/types";
import { getRequestId } from "@/lib/middleware";

const SignupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const validated = SignupSchema.parse(body);

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

    // In mock mode, accept any signup
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const mockUserId = crypto.randomUUID();
      return NextResponse.json(
        ok(
          {
            token: `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: mockUserId }))}.mock`,
            user: {
              id: mockUserId,
              email: validated.email,
              displayName: validated.displayName ?? validated.email.split("@")[0],
            },
          },
          "Signup successful (mock)",
          requestId
        ),
        { status: 201 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          display_name: validated.displayName ?? validated.email.split("@")[0],
        },
      },
    });

    if (error) {
      const message =
        error.message === "User already registered"
          ? "An account with this email already exists"
          : error.message || "Registration failed";
      return NextResponse.json(err(400, message, requestId), { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(err(500, "Failed to create account", requestId), { status: 500 });
    }

    const userId = data.user.id;
    const userEmail = data.user.email ?? validated.email;
    const displayName =
      validated.displayName ?? data.user.user_metadata?.display_name ?? userEmail.split("@")[0];

    // Populate user_preferences
    try {
      const serviceSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
        {
          cookies: {
            getAll() { return []; },
            setAll() {},
          },
        },
      );
      await serviceSupabase.from("user_preferences").upsert({
        user_id: userId,
        display_name: displayName,
      });
    } catch {
      // non-critical — user_preferences will be created on first login
    }

    // If email confirmation is required, session may be null
    const token = data.session?.access_token ?? null;

    return NextResponse.json(
      ok(
        {
          token,
          user: {
            id: userId,
            email: userEmail,
            displayName,
          },
        },
        token ? "Account created" : "Account created. Please check your email to confirm.",
        requestId
      ),
      { status: token ? 201 : 200 }
    );
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json(
        err(400, "Please provide a valid email and password (min 6 characters)", requestId),
        { status: 400 }
      );
    }
    console.error("Signup error:", e);
    return NextResponse.json(err(500, "Registration service unavailable", requestId), {
      status: 500,
    });
  }
}
