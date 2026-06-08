import { supabase } from "@/lib/supabase";

export interface ReportRow {
  id: string;
  report_id: string;
  name: string;
  owner_id: string;
  currency: string;
  created_at: string;
}

export interface ReportMemberRow {
  id: string;
  report_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  granted_by: string | null;
  granted_at: string;
}

export type MemberWithUser = ReportMemberRow & {
  display_name?: string;
  avatar_url?: string;
};

export interface ReportWithMeta extends ReportRow {
  member_count: number;
  role: string;
}

export interface ReportLookupPreview {
  name: string;
  ownerName: string;
  memberCount: number;
}

export class ReportRepository {
  async getReports(userId: string): Promise<ReportWithMeta[] | null> {
    try {
      const { data: owned, error: err1 } = await supabase
        .from("reports")
        .select("*, report_members!inner(role)")
        .eq("report_members.user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (err1) {
        console.warn("getReports query failed:", err1.message);
        return null;
      }

      const reports: ReportWithMeta[] = await Promise.all(
        (owned ?? []).map(async (r) => {
          const { count } = await supabase
            .from("report_members")
            .select("*", { count: "exact", head: true })
            .eq("report_id", r.id);

          return {
            id: r.id,
            report_id: r.report_id,
            name: r.name,
            owner_id: r.owner_id,
            currency: r.currency,
            created_at: r.created_at,
            member_count: count ?? 1,
            role: r.report_members?.[0]?.role ?? "viewer",
          };
        })
      );

      return reports;
    } catch (err) {
      console.warn("getReports error:", err);
      return null;
    }
  }

  async getReport(id: string, userId: string): Promise<ReportWithMeta | null> {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*, report_members!inner(role)")
        .eq("id", id)
        .eq("report_members.user_id", userId)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        console.warn("getReport query failed:", error?.message);
        return null;
      }

      const { count } = await supabase
        .from("report_members")
        .select("*", { count: "exact", head: true })
        .eq("report_id", data.id);

      return {
        id: data.id,
        report_id: data.report_id,
        name: data.name,
        owner_id: data.owner_id,
        currency: data.currency,
        created_at: data.created_at,
        member_count: count ?? 1,
        role: data.report_members?.[0]?.role ?? "viewer",
      };
    } catch (err) {
      console.warn("getReport error:", err);
      return null;
    }
  }

  async getUserDisplayName(userId: string): Promise<string | null> {
    try {
      const { data } = await supabase
        .from("user_preferences")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.display_name) return data.display_name;

      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      const name = authData?.user?.user_metadata?.display_name ?? null;
      if (name) {
        try {
          await supabase.from("user_preferences").upsert({ user_id: userId, display_name: name });
        } catch {
        }
      }
      return name;
    } catch {
      return null;
    }
  }

  async getReportByShortId(shortId: string): Promise<ReportRow | null> {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .ilike("report_id", shortId)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        console.warn("getReportByShortId query failed:", error?.message);
        return null;
      }

      return data;
    } catch (err) {
      console.warn("getReportByShortId error:", err);
      return null;
    }
  }

  async lookupByShortId(shortId: string): Promise<ReportLookupPreview | null> {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id, name, owner_id")
        .ilike("report_id", shortId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !data) {
        console.warn("lookupByShortId query failed:", error?.message);
        return null;
      }

      const [prefResult, countResult] = await Promise.all([
        supabase
          .from("user_preferences")
          .select("display_name")
          .eq("user_id", data.owner_id)
          .maybeSingle(),
        supabase
          .from("report_members")
          .select("*", { count: "exact", head: true })
          .eq("report_id", data.id),
      ]);

      return {
        name: data.name,
        ownerName: prefResult.data?.display_name ?? "Owner",
        memberCount: countResult.count ?? 1,
      };
    } catch (err) {
      console.warn("lookupByShortId error:", err);
      return null;
    }
  }

  async createReport(data: {
    name: string;
    currency: string;
    ownerId: string;
  }): Promise<ReportRow | null> {
    try {
      const { data: report, error } = await supabase
        .from("reports")
        .insert({
          name: data.name,
          currency: data.currency,
          owner_id: data.ownerId,
        })
        .select()
        .single();

      if (error || !report) {
        console.warn("createReport insert failed:", error?.message);
        return null;
      }

      const { error: memberError } = await supabase
        .from("report_members")
        .insert({
          report_id: report.id,
          user_id: data.ownerId,
          role: "owner",
          granted_by: data.ownerId,
        });

      if (memberError) {
        console.warn("createReport member insert failed:", memberError.message);
        await supabase.from("reports").delete().eq("id", report.id);
        return null;
      }

      return report;
    } catch (err) {
      console.warn("createReport error:", err);
      return null;
    }
  }

  async joinReport(
    reportId: string,
    userId: string
  ): Promise<ReportRow | null> {
    try {
      const { error } = await supabase.from("report_members").insert({
        report_id: reportId,
        user_id: userId,
        role: "viewer",
      });

      if (error) {
        console.warn("joinReport insert failed:", error.message);
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (fetchError || !data) {
        console.warn("joinReport fetch failed:", fetchError?.message);
        return null;
      }

      return data;
    } catch (err) {
      console.warn("joinReport error:", err);
      return null;
    }
  }

  async isMember(reportId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("report_members")
        .select("id")
        .eq("report_id", reportId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("isMember query failed:", error.message);
        return false;
      }

      return data !== null;
    } catch (err) {
      console.warn("isMember error:", err);
      return false;
    }
  }

  async getMembers(
    reportId: string
  ): Promise<MemberWithUser[] | null> {
    try {
      const { data, error } = await supabase
        .from("report_members")
        .select("*")
        .eq("report_id", reportId);

      if (error) {
        console.warn("getMembers query failed:", error.message);
        return null;
      }

      const userIds = (data ?? []).map((m) => m.user_id);
      let nameMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (prefs) {
          for (const p of prefs) {
            nameMap[p.user_id] = p.display_name || "User";
          }
        }
      }

      return (data ?? []).map((m) => ({
        id: m.id,
        report_id: m.report_id,
        user_id: m.user_id,
        role: m.role as "owner" | "editor" | "viewer",
        granted_by: m.granted_by,
        granted_at: m.granted_at,
        display_name: nameMap[m.user_id],
        avatar_url: undefined,
      }));
    } catch (err) {
      console.warn("getMembers error:", err);
      return null;
    }
  }

  async addMember(
    reportId: string,
    userId: string,
    role: "editor" | "viewer",
    grantedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("report_members").insert({
        report_id: reportId,
        user_id: userId,
        role,
        granted_by: grantedBy,
      });

      if (error) {
        console.warn("addMember insert failed:", error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn("addMember error:", err);
      return false;
    }
  }

  async removeMember(reportId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("report_members")
        .delete()
        .eq("report_id", reportId)
        .eq("user_id", userId);

      if (error) {
        console.warn("removeMember delete failed:", error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn("removeMember error:", err);
      return false;
    }
  }

  async updateMemberRole(
    reportId: string,
    userId: string,
    role: "editor" | "viewer"
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("report_members")
        .update({ role })
        .eq("report_id", reportId)
        .eq("user_id", userId);

      if (error) {
        console.warn("updateMemberRole update failed:", error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn("updateMemberRole error:", err);
      return false;
    }
  }

  async updateReport(
    id: string,
    ownerId: string,
    data: { name?: string; currency?: string }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("reports")
        .update(data)
        .eq("id", id)
        .eq("owner_id", ownerId);

      if (error) {
        console.warn("updateReport failed:", error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn("updateReport error:", err);
      return false;
    }
  }

  async softDeleteReport(
    id: string,
    ownerId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("owner_id", ownerId);

      if (error) {
        console.warn("softDeleteReport failed:", error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn("softDeleteReport error:", err);
      return false;
    }
  }
}
