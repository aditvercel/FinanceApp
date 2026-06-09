import { supabase } from "@/lib/supabase";
import { ExportRow, BudgetRow, ExportSuggestion } from "./contract";
import { renderCharts } from "./chart-renderer";

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
    buffer?: Buffer;
    filename?: string;
    contentType?: string;
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

    const filename = `${reportName}-${period}.${format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv"}`;
    const contentType =
      format === "csv"
        ? "text/csv"
        : format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";

    return { buffer, filename, contentType };
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
      const d = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      const doc: any = d;

      const chunks: Buffer[] = [];
      d.on("data", (chunk: Buffer) => chunks.push(chunk));
      d.on("end", () => resolve(Buffer.concat(chunks)));
      d.on("error", reject);

      const pageW = 495.28;
      const marginX = 50;

      const totalIncome = entries
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + e.amount, 0);
      const totalExpense = entries
        .filter((e) => e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);

      /* ── Cover Page ── */
      doc.fontSize(28).fillColor("#1e3a5f").text(report.name, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor("#666").text("Financial Report", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Generated: ${new Date().toISOString().split("T")[0]}`, { align: "center" });
      doc.moveDown(0.3);
      doc.text(
        `Period: ${entries[entries.length - 1]?.date ?? "N/A"} to ${entries[0]?.date ?? "N/A"}`,
        { align: "center" }
      );
      doc.fillColor("#000");

      doc.moveDown(3);
      doc.fontSize(12).fillColor("#1e3a5f").text("Summary", { underline: false });
      doc.moveDown(0.8);

      const summaryY = doc.y;
      const boxW = (pageW - 20) / 2;
      const boxH = 70;

      [["Income", totalIncome, "#34d399"], ["Expense", totalExpense, "#f87171"]].forEach(([label, val, color], i) => {
        const bx = marginX + i * (boxW + 20);
        doc.fillColor("#f8fafc").roundedRect(bx, summaryY, boxW, boxH, 6).fill();
        doc.fillColor(color).fontSize(10).text(label as string, bx + 12, summaryY + 10);
        doc.fillColor("#000").fontSize(16).font("Helvetica-Bold").text(
          (val as number).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }),
          bx + 12,
          summaryY + 28,
          { width: boxW - 24 }
        );
        doc.font("Helvetica");
      });

      doc.y = summaryY + boxH + 15;
      doc.fillColor("#1e3a5f").fontSize(12).text("Net Balance", { underline: false });
      doc.moveDown(0.3);
      const netColor = totalIncome - totalExpense >= 0 ? "#34d399" : "#f87171";
      doc.fillColor(netColor).fontSize(22).font("Helvetica-Bold").text(
        (totalIncome - totalExpense).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
      );
      doc.fillColor("#000").font("Helvetica");
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#666").text(`Total entries: ${entries.length}`);
      doc.fillColor("#000");

      /* ── Charts ── */
      renderCharts(doc as any, entries);

      /* ── Entries Table ── */
      doc.addPage();
      doc.fontSize(14).fillColor("#1e3a5f").text("Transaction History", { align: "center" });
      doc.moveDown(0.8);
      doc.fillColor("#000");

      const colWidths = [50, 55, 70, 80, 45, 60, 50];
      const headers = ["Date", "Type", "Category", "Amount", "Merchant", "Note", "Ver"];
      const headerY = doc.y;

      doc.fontSize(8).font("Helvetica-Bold").fillColor("#fff");
      let x = marginX;
      doc.fillColor("#1e3a5f").roundedRect(x, headerY - 4, pageW, 16, 3).fill();
      doc.fillColor("#fff");
      x = marginX + 4;
      headers.forEach((h, i) => {
        doc.text(h, x, headerY, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });

      let y = headerY + 18;
      doc.font("Helvetica").fontSize(7).fillColor("#333");
      let rowCount = 0;

      for (const entry of entries) {
        if (y > 740) {
          doc.addPage();
          y = 50;
          rowCount = 0;

          doc.fontSize(8).font("Helvetica-Bold").fillColor("#fff");
          let hx = marginX;
          doc.fillColor("#1e3a5f").roundedRect(hx, y - 4, pageW, 16, 3).fill();
          doc.fillColor("#fff");
          hx = marginX + 4;
          headers.forEach((h, i) => {
            doc.text(h, hx, y, { width: colWidths[i], align: "left" });
            hx += colWidths[i];
          });
          y += 18;
          doc.font("Helvetica").fontSize(7).fillColor("#333");
        }

        if (rowCount % 2 === 0) {
          doc.fillColor("#f8fafc");
          doc.roundedRect(marginX, y - 2, pageW, 13, 2).fill();
        }

        doc.fillColor("#333");
        x = marginX + 4;
        const row = [
          entry.date.slice(5),
          entry.type.slice(0, 4),
          entry.category.slice(0, 14),
          entry.amount.toLocaleString("id-ID"),
          (entry.merchant ?? "").slice(0, 10),
          (entry.note ?? "").slice(0, 12),
          entry.version.toString(),
        ];
        row.forEach((cell, i) => {
          doc.text(cell, x, y, { width: colWidths[i], align: "left" });
          x += colWidths[i];
        });
        y += 14;
        rowCount++;
      }

      /* ── Footer ── */
      doc.moveDown(2);
      doc.fontSize(7).font("Helvetica-Oblique").fillColor("#999");
      doc.text(
        `Generated by FinanceApp · ${new Date().toISOString().replace("T", " ").slice(0, 19)}`,
        { align: "center" }
      );
      doc.fillColor("#000");

      doc.end();
    });
  }
}
