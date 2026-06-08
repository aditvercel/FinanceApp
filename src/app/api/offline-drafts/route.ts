import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/middleware";
import { ok, err, created } from "@/lib/types";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(err(401, "Authentication required", requestId), {
      status: 401,
    });
  }

  try {
    const { data, error } = await supabase
      .from("offline_drafts")
      .select("*")
      .eq("user_id", userId)
      .is("flushed_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`[${requestId}] Failed to fetch drafts:`, error.message);
      return NextResponse.json(
        err(500, "Failed to fetch drafts", requestId),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ok(data ?? [], "Offline drafts retrieved", requestId)
    );
  } catch (error) {
    console.error(`[${requestId}] Offline drafts error:`, error);
    return NextResponse.json(
      err(500, "Failed to fetch drafts", requestId),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(err(401, "Authentication required", requestId), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { reportId, payload, source } = body;

    if (!reportId) {
      return NextResponse.json(
        err(400, "reportId is required", requestId),
        { status: 400 }
      );
    }

    if (!payload) {
      return NextResponse.json(
        err(400, "payload is required", requestId),
        { status: 400 }
      );
    }

    const membership = await supabase
      .from("report_members")
      .select("id")
      .eq("report_id", reportId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership.data) {
      const report = await supabase
        .from("reports")
        .select("id")
        .eq("id", reportId)
        .eq("owner_id", userId)
        .maybeSingle();

      if (!report.data) {
        return NextResponse.json(
          err(403, "Access denied to this report", requestId),
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("offline_drafts")
      .insert({
        user_id: userId,
        report_id: reportId,
        payload,
        source: source ?? "client",
      })
      .select()
      .single();

    if (error) {
      console.error(`[${requestId}] Failed to save draft:`, error.message);
      return NextResponse.json(
        err(500, "Failed to save draft", requestId),
        { status: 500 }
      );
    }

    return NextResponse.json(
      created(
        { id: data.id, draftId: data.id },
        "Offline draft saved",
        requestId
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${requestId}] Offline draft save error:`, error);
    return NextResponse.json(
      err(500, "Failed to save draft", requestId),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(err(401, "Authentication required", requestId), {
      status: 401,
    });
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const draftId = pathParts[pathParts.length - 1];

  if (!draftId) {
    return NextResponse.json(
      err(400, "Draft ID is required", requestId),
      { status: 400 }
    );
  }

  try {
    const { data: existing } = await supabase
      .from("offline_drafts")
      .select("id, user_id")
      .eq("id", draftId)
      .single();

    if (!existing) {
      return NextResponse.json(
        err(404, "Draft not found", requestId),
        { status: 404 }
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        err(403, "Not authorized to delete this draft", requestId),
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("offline_drafts")
      .update({ flushed_at: new Date().toISOString() })
      .eq("id", draftId)
      .eq("user_id", userId);

    if (error) {
      console.error(`[${requestId}] Failed to delete draft:`, error.message);
      return NextResponse.json(
        err(500, "Failed to delete draft", requestId),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ok(null, "Draft abandoned", requestId)
    );
  } catch (error) {
    console.error(`[${requestId}] Draft delete error:`, error);
    return NextResponse.json(
      err(500, "Failed to delete draft", requestId),
      { status: 500 }
    );
  }
}
