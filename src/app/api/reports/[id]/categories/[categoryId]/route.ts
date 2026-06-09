import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { getRequestId, requireAuth } from "@/lib/middleware";
import { ok, err } from "@/lib/types";

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().max(10).optional(),
});

async function checkMemberRole(reportId: string, userId: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("report_members")
    .select("role")
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

async function isOwner(reportId: string, userId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("owner_id", userId)
    .maybeSingle();
  return data !== null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, categoryId } = await params;

    const memberRole = await checkMemberRole(id, auth);
    const owner = await isOwner(id, auth);
    const isEditor = memberRole === "editor";

    if (!owner && !isEditor) {
      return NextResponse.json(
        err(403, "Access denied. Only owner and editors can edit categories.", requestId),
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = UpdateCategorySchema.parse(body);

    if (!validated.name && !validated.emoji) {
      return NextResponse.json(
        err(400, "At least one field (name or emoji) must be provided", requestId),
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    const { data: category } = await supabase
      .from("report_categories")
      .select("is_default")
      .eq("id", categoryId)
      .single();

    if (category?.is_default) {
      return NextResponse.json(
        err(400, "Default categories cannot be edited", requestId),
        { status: 400 },
      );
    }

    const updates: Record<string, any> = {};
    if (validated.name) updates.name = validated.name;
    if (validated.emoji) updates.emoji = validated.emoji;

    const { data, error } = await supabase
      .from("report_categories")
      .update(updates)
      .eq("id", categoryId)
      .eq("report_id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          err(409, "A category with this name already exists in this report", requestId),
          { status: 409 },
        );
      }
      return NextResponse.json(err(500, "Failed to update category", requestId), { status: 500 });
    }

    const result = {
      id: data.id,
      name: data.name,
      emoji: data.emoji,
      isDefault: data.is_default,
    };

    return NextResponse.json(ok(result, "Category updated", requestId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(err(400, "Validation error", requestId), { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, categoryId } = await params;

    const memberRole = await checkMemberRole(id, auth);
    const owner = await isOwner(id, auth);
    const isEditor = memberRole === "editor";

    if (!owner && !isEditor) {
      return NextResponse.json(
        err(403, "Access denied. Only owner and editors can delete categories.", requestId),
        { status: 403 },
      );
    }

    const supabase = getServiceClient();

    const { data: category } = await supabase
      .from("report_categories")
      .select("is_default")
      .eq("id", categoryId)
      .single();

    if (category?.is_default) {
      return NextResponse.json(
        err(400, "Default categories cannot be deleted", requestId),
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("report_categories")
      .delete()
      .eq("id", categoryId)
      .eq("report_id", id);

    if (error) {
      return NextResponse.json(err(500, "Failed to delete category", requestId), { status: 500 });
    }

    return NextResponse.json(ok(null, "Category deleted", requestId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}
