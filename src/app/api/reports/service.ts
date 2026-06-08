import { ReportRepository, ReportWithMeta, ReportLookupPreview } from "./repository";
import { createEvent } from "@/app/api/activity/repository";
import { createNotification } from "@/app/api/notifications/repository";

export type ReportListItem = {
  id: string;
  reportId: string;
  name: string;
  currency: string;
  role: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
};

export type ReportMemberDetail = {
  id: string;
  userId: string;
  reportId: string;
  role: "owner" | "editor" | "viewer";
  displayName?: string;
  avatarUrl?: string;
};

export type ReportDetail = ReportListItem & {
  ownerId: string;
  members: ReportMemberDetail[];
};

export type ReportCreated = {
  id: string;
  reportId: string;
  name: string;
  currency: string;
};

export type ReportJoined = {
  id: string;
  reportId: string;
  name: string;
  currency: string;
  role: string;
};

export class ReportsService {
  private repo: ReportRepository;

  constructor(repo?: ReportRepository) {
    this.repo = repo ?? new ReportRepository();
  }

  async list(userId: string): Promise<ReportListItem[]> {
    const reports = await this.repo.getReports(userId);
    if (!reports) return [];

    return reports.map((r) => ({
      id: r.id,
      reportId: r.report_id,
      name: r.name,
      currency: r.currency,
      role: r.role,
      ownerId: r.owner_id,
      memberCount: r.member_count,
      createdAt: r.created_at,
    }));
  }

  async create(
    data: { name: string; currency: string },
    userId: string
  ): Promise<ReportCreated | null> {
    const report = await this.repo.createReport({
      name: data.name,
      currency: data.currency,
      ownerId: userId,
    });

    if (!report) return null;

    return {
      id: report.id,
      reportId: report.report_id,
      name: report.name,
      currency: report.currency,
    };
  }

  async lookup(shortReportId: string): Promise<ReportLookupPreview | null> {
    return this.repo.lookupByShortId(shortReportId.toLowerCase());
  }

  async join(
    shortReportId: string,
    userId: string
  ): Promise<ReportJoined | null> {
    const report = await this.repo.getReportByShortId(shortReportId.toLowerCase());
    if (!report) return null;

    const already = await this.repo.isMember(report.id, userId);
    if (already) {
      return {
        id: report.id,
        reportId: report.report_id,
        name: report.name,
        currency: report.currency,
        role: "viewer",
      };
    }

    const joined = await this.repo.joinReport(report.id, userId);
    if (!joined) return null;

    return {
      id: joined.id,
      reportId: joined.report_id,
      name: joined.name,
      currency: joined.currency,
      role: "viewer",
    };
  }

  async getDetail(
    id: string,
    userId: string
  ): Promise<ReportDetail | null> {
    const report = await this.repo.getReport(id, userId);
    if (!report) return null;

    const members = await this.repo.getMembers(id);

    return {
      id: report.id,
      reportId: report.report_id,
      name: report.name,
      currency: report.currency,
      role: report.role,
      memberCount: report.member_count,
      createdAt: report.created_at,
      ownerId: report.owner_id,
      members: (members ?? []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        reportId: m.report_id,
        role: m.role,
        displayName: m.display_name,
        avatarUrl: m.avatar_url,
      })),
    };
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; currency?: string }
  ): Promise<boolean> {
    const report = await this.repo.getReport(id, userId);
    if (!report || report.owner_id !== userId) return false;

    const success = await this.repo.updateReport(id, userId, data);
    if (!success) return false;

    createEvent({
      reportId: id,
      actorId: userId,
      eventType: "report.updated",
      metadata: { oldName: report.name, newName: data.name },
    });

    createNotification({
      userId,
      type: "report.updated",
      title: "Report renamed",
      body: `"${report.name}" → "${data.name}"`,
      actionUrl: `/reports/${id}`,
    });

    return true;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const report = await this.repo.getReport(id, userId);
    if (!report || report.owner_id !== userId) return false;

    const success = await this.repo.softDeleteReport(id, userId);
    if (!success) return false;

    createEvent({
      reportId: id,
      actorId: userId,
      eventType: "report.deleted",
      metadata: { name: report.name },
    });

    createNotification({
      userId,
      type: "report.deleted",
      title: "Report deleted",
      body: `"${report.name}" was deleted. It can be recovered within 30 days.`,
      actionUrl: `/reports/${id}`,
    });

    return true;
  }

  async manageMember(
    reportId: string,
    ownerId: string,
    action: "remove" | "promote" | "demote",
    payload: { userId: string }
  ): Promise<boolean> {
    const report = await this.repo.getReport(reportId, ownerId);
    if (!report || report.owner_id !== ownerId || report.role !== "owner") {
      return false;
    }

    let success = false;

    if (action === "remove") {
      success = await this.repo.removeMember(reportId, payload.userId);
      if (success) {
        const name = await this.repo.getUserDisplayName(payload.userId);
        createEvent({
          reportId,
          actorId: ownerId,
          eventType: "member.removed",
          metadata: { targetUserId: payload.userId, targetDisplayName: name ?? "User" },
        });
        createNotification({
          userId: payload.userId,
          type: "member.removed",
          title: "Removed from report",
          body: `You were removed from "${report.name}".`,
          actionUrl: `/reports/${reportId}`,
        });
      }
    }

    if (action === "promote") {
      success = await this.repo.updateMemberRole(reportId, payload.userId, "editor");
      if (success) {
        const name = await this.repo.getUserDisplayName(payload.userId);
        createEvent({
          reportId,
          actorId: ownerId,
          eventType: "member.promoted",
          metadata: { targetUserId: payload.userId, targetDisplayName: name ?? "User", role: "editor" },
        });
        createNotification({
          userId: payload.userId,
          type: "member.promoted",
          title: "You're now an editor",
          body: `You can now add and edit entries in "${report.name}".`,
          actionUrl: `/reports/${reportId}`,
        });
      }
    }

    if (action === "demote") {
      success = await this.repo.updateMemberRole(reportId, payload.userId, "viewer");
      if (success) {
        const name = await this.repo.getUserDisplayName(payload.userId);
        createEvent({
          reportId,
          actorId: ownerId,
          eventType: "member.demoted",
          metadata: { targetUserId: payload.userId, targetDisplayName: name ?? "User", role: "viewer" },
        });
        createNotification({
          userId: payload.userId,
          type: "member.demoted",
          title: "Role changed to viewer",
          body: `You can now only view entries in "${report.name}".`,
          actionUrl: `/reports/${reportId}`,
        });
      }
    }

    return success;
  }

  async requestEditor(
    reportId: string,
    userId: string
  ): Promise<boolean> {
    const reportDetail = await this.repo.getReport(reportId, userId);
    if (!reportDetail || reportDetail.role !== "viewer") return false;

    const requestorName = await this.repo.getUserDisplayName(userId);

    createNotification({
      userId: reportDetail.owner_id,
      type: "member.editor_requested",
      title: "Editor access requested",
      body: `${requestorName ?? "A user"} wants editor access to "${reportDetail.name}".`,
      actionUrl: `/reports/${reportId}`,
      metadata: { requestorId: userId, requestorName },
    });

    createEvent({
      reportId,
      actorId: userId,
      eventType: "member.editor_requested",
      metadata: { targetDisplayName: requestorName },
    });

    return true;
  }
}
