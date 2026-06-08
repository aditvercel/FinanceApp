import { supabase } from "@/lib/supabase";
import { ExportRow, BudgetRow, ExportSuggestion } from "./contract";

const MAX_PDF_ENTRIES = 10000;

export class ExportService {
  async export(
    reportId: string,
    format: "csv" | "xlsx" | "pdf",
    period: string,
    userId: string,
    requestId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    signedUrl: string;
    entryCount?: number;
    suggestions?: ExportSuggestion[];
  }> {
    const report = await this.getReport(reportId, userId);
    if (!report) {
      throw new Error("Report not found or access denied");
    }

    let entries = await this.getEntries(reportId, period, startDate, endDate);

    if (format === "pdf" && entries.length > MAX_PDF_ENTRIES) {
      const suggestions = this.generateSuggestions(entries, period);
      return {
        signedUrl: "",
        entryCount: entries.length,
        suggestions,
      };
    }

    let buffer: Buffer;
    const reportName = report.name.replace(/[^a-zA-Z0-9\s_-]/g, "");

    switch (format) {
      case "csv":
        buffer = await this.generateCsv(entries);
        break;
      case "xlsx": {
        const budgets = await this.getBudgets(reportId, entries);
        buffer = await this.generateXlsx(entries, budgets, reportName);
        break;
      }
      case "pdf":
        buffer = await this.generatePdf(entries, report, reportName);
        break;
    }

    const path = `exports/${reportId}/${requestId}-${format}.${format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv"}`;

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(path, buffer, {
        contentType:
          format === "csv"
            ? "text/csv"
            : format === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from("exports")
      .createSignedUrl(path, 3600);

    const signedUrl = urlData?.signedUrl ?? "";

    await this.createNotification(reportId, userId, format, signedUrl, requestId);
    await this.createActivityEvent(reportId, userId, format, reportName, requestId);

    return { signedUrl };
  }

  private async getReport(
    reportId: string,
    userId: string
  ): Promise<{ id: string; name: string; owner_id: string } | null> {
    const { data, error } = await supabase
      .from("reports")
      .select("id, name, owner_id")
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (error || !data) return null;

    const { data: membership } = await supabase
      .from("report_members")
      .select("id")
      .eq("report_id", reportId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership && data.owner_id !== userId) return null;

    return data;
  }

  private async getEntries(
    reportId: string,
    period: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExportRow[]> {
    let query = supabase
      .from("entry_snapshots")
      .select(`
        entry_date,
        type,
        category,
        amount,
        merchant,
        note,
        version,
        changed_by,
        changed_at,
        entry_id
      `)
      .in(
        "entry_id",
        (
          await supabase
            .from("entries")
            .select("id")
            .eq("report_id", reportId)
        ).data?.map((e) => e.id) ?? []
      )
      .eq("is_current", true);

    if (period !== "all") {
      const now = new Date();
      if (period === "daily") {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query
          .gte("entry_date", thirtyDaysAgo.toISOString().split("T")[0])
          .lte("entry_date", now.toISOString().split("T")[0]);
      } else if (period === "monthly") {
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        query = query
          .gte("entry_date", twelveMonthsAgo.toISOString().split("T")[0])
          .lte("entry_date", now.toISOString().split("T")[0]);
      } else if (period === "yearly") {
        const fiveYearsAgo = new Date(now);
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        query = query
          .gte("entry_date", fiveYearsAgo.toISOString().split("T")[0])
          .lte("entry_date", now.toISOString().split("T")[0]);
      }
    }

    if (startDate) {
      query = query.gte("entry_date", startDate);
    }
    if (endDate) {
      query = query.lte("entry_date", endDate);
    }

    query = query.order("entry_date", { ascending: false });

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((e: any) => ({
      date: e.entry_date,
      type: e.type,
      category: e.category,
      amount: Number(e.amount),
      merchant: e.merchant ?? null,
      note: e.note ?? null,
      version: e.version,
      changed_by: e.changed_by,
      changed_at: e.changed_at,
    }));
  }

  private async getBudgets(
    reportId: string,
    entries: ExportRow[]
  ): Promise<BudgetRow[]> {
    const { data: budgets } = await supabase
      .from("budgets")
      .select("category, amount")
      .eq("report_id", reportId);

    if (!budgets || budgets.length === 0) return [];

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = entries.filter(
      (e) =>
        e.type === "expense" && e.date.startsWith(currentMonth)
    );

    return budgets.map((b) => {
      const spent = monthExpenses
        .filter((e) => e.category === b.category)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        category: b.category,
        budgetAmount: Number(b.amount),
        spentAmount: spent,
        percentage: Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0,
      };
    });
  }

  private generateSuggestions(
    entries: ExportRow[],
    period: string
  ): ExportSuggestion[] {
    const dates = entries.map((e) => e.date).sort();
    const latest = dates[dates.length - 1] ?? new Date().toISOString().split("T")[0];
    const today = new Date(latest);

    const suggestions: ExportSuggestion[] = [];

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyCount = entries.filter(
      (e) => e.date >= thirtyDaysAgo.toISOString().split("T")[0]
    ).length;
    suggestions.push({
      label: "Last 30 days",
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      estimatedCount: thirtyCount || Math.ceil(entries.length * 0.08),
    });

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthCount = entries.filter(
      (e) => e.date >= threeMonthsAgo.toISOString().split("T")[0]
    ).length;
    suggestions.push({
      label: "Last 3 months",
      startDate: threeMonthsAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      estimatedCount: threeMonthCount || Math.ceil(entries.length * 0.25),
    });

    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearCount = entries.filter(
      (e) => e.date >= oneYearAgo.toISOString().split("T")[0]
    ).length;
    suggestions.push({
      label: "This year",
      startDate: oneYearAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      estimatedCount: yearCount || Math.ceil(entries.length * 0.5),
    });

    return suggestions;
  }

  private async generateCsv(entries: ExportRow[]): Promise<Buffer> {
    const { stringify } = await import("csv-stringify/sync");

    const rows = entries.map((e) => ({
      date: e.date,
      type: e.type,
      category: e.category,
      amount: e.amount.toFixed(2),
      merchant: e.merchant ?? "",
      note: e.note ?? "",
      version: e.version.toString(),
      changed_by: e.changed_by,
      changed_at: e.changed_at,
    }));

    const csv = stringify(rows, { header: true });
    return Buffer.from(csv);
  }

  private async generateXlsx(
    entries: ExportRow[],
    budgets: BudgetRow[],
    reportName: string
  ): Promise<Buffer> {
    const ExcelJS = await import("exceljs");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FinanceApp";

    const summarySheet = workbook.addWorksheet("Summary");

    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Value", key: "value", width: 20 },
    ];

    const totalIncome = entries
      .filter((e) => e.type === "income")
      .reduce((s, e) => s + e.amount, 0);
    const totalExpense = entries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + e.amount, 0);

    summarySheet.addRows([
      { metric: "Report", value: reportName },
      { metric: "Total Income", value: totalIncome.toFixed(2) },
      { metric: "Total Expense", value: totalExpense.toFixed(2) },
      { metric: "Net Balance", value: (totalIncome - totalExpense).toFixed(2) },
      { metric: "Entry Count", value: entries.length },
      { metric: "Date Range", value: `${entries[entries.length - 1]?.date ?? "N/A"} to ${entries[0]?.date ?? "N/A"}` },
    ]);

    if (budgets.length > 0) {
      summarySheet.addRow({});
      summarySheet.addRow({ metric: "Category", value: "Budget vs Actual" });
      budgets.forEach((b) => {
        summarySheet.addRow({
          metric: b.category,
          value: `Budget: ${b.budgetAmount.toFixed(2)}, Spent: ${b.spentAmount.toFixed(2)} (${b.percentage.toFixed(1)}%)`,
        });
      });
    }

    const entriesSheet = workbook.addWorksheet("Entries");
    entriesSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Type", key: "type", width: 10 },
      { header: "Category", key: "category", width: 18 },
      { header: "Amount", key: "amount", width: 16 },
      { header: "Merchant", key: "merchant", width: 20 },
      { header: "Note", key: "note", width: 30 },
      { header: "Version", key: "version", width: 10 },
      { header: "Changed By", key: "changed_by", width: 36 },
      { header: "Changed At", key: "changed_at", width: 22 },
    ];

    entries.forEach((e) => {
      entriesSheet.addRow({
        date: e.date,
        type: e.type,
        category: e.category,
        amount: e.amount.toFixed(2),
        merchant: e.merchant ?? "",
        note: e.note ?? "",
        version: e.version,
        changed_by: e.changed_by,
        changed_at: e.changed_at,
      });
    });

    const headerRow = entriesSheet.getRow(1);
    headerRow.font = { bold: true };

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private async generatePdf(
    entries: ExportRow[],
    report: { name: string },
    reportName: string
  ): Promise<Buffer> {
    const PDFDocument = (await import("pdfkit")).default;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(24).text(report.name, { align: "center" });
      doc.fontSize(12).text("Financial Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toISOString().split("T")[0]}`, {
        align: "center",
      });
      doc.moveDown(0.5);
      doc.text(
        `Period: ${entries[entries.length - 1]?.date ?? "N/A"} to ${entries[0]?.date ?? "N/A"}`,
        { align: "center" }
      );
      doc.moveDown(1.5);

      const totalIncome = entries
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + e.amount, 0);
      const totalExpense = entries
        .filter((e) => e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);

      doc.fontSize(14).text("Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Total Income: Rp ${totalIncome.toLocaleString("id-ID")}`);
      doc.text(`Total Expense: Rp ${totalExpense.toLocaleString("id-ID")}`);
      doc.text(
        `Net Balance: Rp ${(totalIncome - totalExpense).toLocaleString("id-ID")}`
      );
      doc.text(`Entry Count: ${entries.length}`);
      doc.moveDown(1.5);

      doc.fontSize(14).text("Entries", { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const colWidths = [50, 60, 70, 80, 50];
      const headers = ["Date", "Type", "Category", "Amount", "Ver"];
      let y = tableTop;

      doc.fontSize(9).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((h, i) => {
        doc.text(h, x, y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });
      doc.moveDown(0.3);
      y = doc.y;
      doc.font("Helvetica").fontSize(8);

      for (const entry of entries) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }

        x = 50;
        const row = [
          entry.date.slice(5),
          entry.type.slice(0, 4),
          entry.category.slice(0, 12),
          entry.amount.toLocaleString("id-ID"),
          entry.version.toString(),
        ];
        row.forEach((cell, i) => {
          doc.text(cell, x, y, { width: colWidths[i], align: "left" });
          x += colWidths[i];
        });
        y += 14;
      }

      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica-Oblique");
      doc.text(
        `Generated by FinanceApp · ${new Date().toISOString()}`,
        { align: "center" }
      );

      doc.end();
    });
  }

  private async createNotification(
    reportId: string,
    userId: string,
    format: string,
    signedUrl: string,
    requestId: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "export.ready",
        title: "Export ready",
        body: `Your ${format.toUpperCase()} export is ready. Download before ${new Date(expiresAt).toLocaleTimeString()}.`,
        action_url: signedUrl,
        metadata: {
          format,
          expiresAt,
          signedUrl,
          exportParams: { reportId, format },
        },
      });
    } catch (err) {
      console.warn(`[${requestId}] Failed to create export notification:`, err);
    }
  }

  private async createActivityEvent(
    reportId: string,
    userId: string,
    format: string,
    reportName: string,
    requestId: string
  ): Promise<void> {
    try {
      await supabase.from("activity_events").insert({
        report_id: reportId,
        actor_id: userId,
        event_type: "report.exported",
        metadata: {
          format,
          reportName,
        },
      });
    } catch (err) {
      console.warn(`[${requestId}] Failed to create activity event:`, err);
    }
  }
}
