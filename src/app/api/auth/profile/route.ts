import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { ok, err } from "@/lib/types";
import { getRequestId, requireAuth } from "@/lib/middleware";
import { z } from "zod";
import crypto from "crypto";

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().optional().nullable(),
});

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

async function ensureBucket(bucket: string): Promise<void> {
  const supabase = getServiceClient();
  try {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
    });
    if (error && !error.message?.includes("already exists")) {
      throw error;
    }
  } catch (e) {
    if (e instanceof Error && !e.message?.includes("already exists")) {
      throw e;
    }
  }
}

async function uploadAvatar(
  userId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const ext = MIME_TO_EXT[mimeType] ?? "jpg";
  const base64Data = match[3];

  const buffer = Buffer.from(base64Data, "base64");

  const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
  if (buffer.length > MAX_AVATAR_BYTES) return null;

  const supabase = getServiceClient();
  await ensureBucket("avatars");

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error || !data) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  return publicUrl;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const userId = auth;

  try {
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

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const userId = auth;

  try {
    const body = await request.json();
    const parsed = UpdateProfileSchema.parse(body);

    const supabase = getServiceClient();

    let resolvedAvatarUrl = parsed.avatarUrl;
    if (
      typeof resolvedAvatarUrl === "string" &&
      resolvedAvatarUrl.startsWith("data:image/")
    ) {
      const storageUrl = await uploadAvatar(userId, resolvedAvatarUrl);
      if (storageUrl) {
        resolvedAvatarUrl = storageUrl;
      }
    }

    const metadata: Record<string, string | null> = {};
    if (parsed.displayName !== undefined) {
      metadata.display_name = parsed.displayName;

      await supabase.from("user_preferences").upsert(
        { user_id: userId, display_name: parsed.displayName, avatar_url: resolvedAvatarUrl ?? null },
        { onConflict: "user_id" }
      );
    } else if (parsed.avatarUrl !== undefined) {
      await supabase.from("user_preferences").upsert(
        { user_id: userId, avatar_url: resolvedAvatarUrl },
        { onConflict: "user_id" }
      );
    }
    if (parsed.avatarUrl !== undefined) {
      metadata.avatar_url = resolvedAvatarUrl ?? null;
    }

    if (Object.keys(metadata).length > 0) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: metadata }
      );

      if (updateError) {
        return NextResponse.json(err(500, "Failed to update profile", requestId), { status: 500 });
      }
    }

    return NextResponse.json(
      ok(
        {
          id: userId,
          displayName: parsed.displayName ?? undefined,
          avatarUrl: resolvedAvatarUrl ?? undefined,
        },
        "Profile updated",
        requestId
      )
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(err(400, "Invalid request body", requestId), { status: 400 });
    }
    console.error("Profile update error:", e);
    return NextResponse.json(err(500, "Failed to update profile", requestId), { status: 500 });
  }
}
