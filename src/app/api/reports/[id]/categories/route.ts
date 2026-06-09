import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { getRequestId, requireAuth, requireRateLimit } from "@/lib/middleware";
import { ok, created, err } from "@/lib/types";

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().max(10).default("📦"),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "read");
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;

    const memberRole = await checkMemberRole(id, auth);
    const owner = await isOwner(id, auth);
    if (!memberRole && !owner) {
      return NextResponse.json(err(403, "Access denied", requestId), { status: 403 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("report_categories")
      .select("*")
      .eq("report_id", id)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      return NextResponse.json(err(500, "Failed to get categories", requestId), { status: 500 });
    }

    const categories = (data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      isDefault: c.is_default,
    }));

    return NextResponse.json(ok(categories, "Categories retrieved", requestId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rateLimit = requireRateLimit(request, auth, "write");
  if (rateLimit) return rateLimit;

  try {
    const { id } = await params;

    const memberRole = await checkMemberRole(id, auth);
    const owner = await isOwner(id, auth);
    const isEditor = memberRole === "editor";

    if (!owner && !isEditor) {
      return NextResponse.json(
        err(403, "Access denied. Only owner and editors can manage categories.", requestId),
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = CreateCategorySchema.parse(body);

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("report_categories")
      .insert({
        report_id: id,
        name: validated.name,
        emoji: validated.emoji,
        created_by: auth,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          err(409, "A category with this name already exists in this report", requestId),
          { status: 409 },
        );
      }
      return NextResponse.json(err(500, "Failed to create category", requestId), { status: 500 });
    }

    const category = {
      id: data.id,
      name: data.name,
      emoji: data.emoji,
      isDefault: data.is_default,
    };

    return NextResponse.json(created(category, "Category created", requestId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(err(400, "Validation error", requestId), { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(err(500, message, requestId), { status: 500 });
  }
}
