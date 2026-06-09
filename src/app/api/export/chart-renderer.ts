const COLORS = ["#fbbf24", "#60a5fa", "#a78bfa", "#34d399", "#f97316", "#f472b6", "#9ca3af"];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
}

interface ChartEntry {
  date: string;
  type: string;
  amount: number;
  category: string;
}

function prepareData(entries: ChartEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const dayMap = new Map<string, number>();
  const weekMap = new Map<string, { income: number; expense: number }>();
  const catMap = new Map<string, number>();

  for (const e of sorted) {
    const amt = e.amount;
    const d = e.date.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + (e.type === "income" ? amt : -amt));

    const dt = new Date(d + "T00:00:00");
    const ws = new Date(dt);
    ws.setDate(dt.getDate() - dt.getDay());
    const wk = ws.toISOString().slice(0, 10);
    const w = weekMap.get(wk) ?? { income: 0, expense: 0 };
    if (e.type === "income") w.income += amt;
    else w.expense += amt;
    weekMap.set(wk, w);

    if (e.type === "expense") {
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + amt);
    }
  }

  const sortedDays = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  const lineLabels: string[] = [];
  const lineAmounts: number[] = [];
  for (const [d, v] of sortedDays) {
    cumulative += v;
    lineLabels.push(new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    lineAmounts.push(cumulative);
  }

  const sortedWeeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const barLabels = sortedWeeks.map(([w]) => {
    const dt = new Date(w + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  const barIncome = sortedWeeks.map(([, w]) => w.income);
  const barExpense = sortedWeeks.map(([, w]) => w.expense);

  const sortedCats = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
  const doughnutLabels = sortedCats.map(([c]) => c);
  const doughnutAmounts = sortedCats.map(([, v]) => v);

  return { lineLabels, lineAmounts, barLabels, barIncome, barExpense, doughnutLabels, doughnutAmounts };
}

function drawLineChart(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  labels: string[],
  amounts: number[]
) {
  if (labels.length === 0) {
    doc.fontSize(10).fillColor("#999").text("No data", x + w / 2 - 20, y + h / 2 - 5);
    doc.fillColor("#000");
    return;
  }

  const min = Math.min(...amounts, 0);
  const max = Math.max(...amounts, 0);
  const range = max - min || 1;
  const padX = 40;
  const padY = 20;
  const chartW = w - padX - 10;
  const chartH = h - padY - 25;

  const zeroY = y + padY + chartH - (min === 0 ? chartH : (0 - min) / range * chartH);

  doc.lineWidth(1).strokeColor("#e5e7eb");
  doc.moveTo(x + padX, zeroY).lineTo(x + padX + chartW, zeroY).stroke();

  const lastColor = amounts[amounts.length - 1] >= 0 ? "#34d399" : "#f87171";
  const stepX = labels.length > 1 ? chartW / (labels.length - 1) : chartW;

  doc.lineWidth(2).strokeColor(lastColor);
  const points: Array<{ px: number; py: number }> = [];
  amounts.forEach((a, i) => {
    const px = x + padX + (labels.length > 1 ? i * stepX : chartW / 2);
    const py = y + padY + chartH - ((a - min) / range) * chartH;
    points.push({ px, py });
    if (i === 0) doc.moveTo(px, py);
    else doc.lineTo(px, py);
  });
  doc.stroke();

  points.forEach((p) => {
    doc.fillColor("#fff");
    doc.circle(p.px, p.py, 2.5).fill();
    doc.fillColor(p.py <= zeroY ? "#34d399" : "#f87171");
    doc.circle(p.px, p.py, 2.5).fill();
  });

  doc.fontSize(7).fillColor("#666");
  const labelStep = Math.max(1, Math.floor(labels.length / 8));
  labels.forEach((l, i) => {
    if (i % labelStep === 0 || i === labels.length - 1) {
      doc.text(l, points[i].px - 12, y + padY + chartH + 5, { width: 30, align: "center" });
    }
  });

  doc.fillColor("#000");
}

function drawBarChart(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  labels: string[],
  income: number[],
  expense: number[]
) {
  if (labels.length === 0) {
    doc.fontSize(10).fillColor("#999").text("No data", x + w / 2 - 20, y + h / 2 - 5);
    doc.fillColor("#000");
    return;
  }

  const maxVal = Math.max(...income, ...expense, 1);
  const padX = 40;
  const padY = 20;
  const chartW = w - padX - 10;
  const chartH = h - padY - 40;
  const barW = Math.min(chartW / labels.length / 3, 12);

  doc.lineWidth(1).strokeColor("#e5e7eb");
  doc.moveTo(x + padX, y + padY).lineTo(x + padX, y + padY + chartH).stroke();
  doc.moveTo(x + padX, y + padY + chartH).lineTo(x + padX + chartW, y + padY + chartH).stroke();

  const stepX = chartW / labels.length;
  labels.forEach((l, i) => {
    const cx = x + padX + i * stepX + stepX / 2;

    const incH = (income[i] / maxVal) * chartH;
    const expH = (expense[i] / maxVal) * chartH;

    if (incH > 0) {
      doc.fillColor("#34d399");
      doc.roundedRect(cx - barW - 1, y + padY + chartH - incH, barW, incH, 2).fill();
    }
    if (expH > 0) {
      doc.fillColor("#f87171");
      doc.roundedRect(cx + 1, y + padY + chartH - expH, barW, expH, 2).fill();
    }

    doc.fontSize(6).fillColor("#666");
    doc.text(l, cx - 15, y + padY + chartH + 5, { width: 30, align: "center" });
  });

  doc.fontSize(8).fillColor("#34d399");
  doc.text("█ Income", x + w - 70, y + padY + 2, { width: 60 });
  doc.fillColor("#f87171");
  doc.text("█ Expense", x + w - 70, y + padY + 14, { width: 60 });

  doc.fillColor("#000");
}

function drawDoughnutChart(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  labels: string[],
  amounts: number[]
) {
  if (labels.length === 0) {
    doc.fontSize(10).fillColor("#999").text("No data", x + w / 2 - 20, y + h / 2 - 5);
    doc.fillColor("#000");
    return;
  }

  const cx = x + w / 2;
  const cy = y + h / 2 - 10;
  const outerR = Math.min(w, h) / 2 - 20;
  const innerR = outerR * 0.55;
  const total = amounts.reduce((s, v) => s + v, 0) || 1;

  let startAngle = -Math.PI / 2;
  amounts.forEach((amt, i) => {
    const sliceAngle = (amt / total) * Math.PI * 2;
    const color = COLORS[i % COLORS.length];

    doc.fillColor(color);

    const steps = Math.max(3, Math.ceil(sliceAngle / 0.05));
    const outerPoints: Array<[number, number]> = [];
    const innerPoints: Array<[number, number]> = [];

    for (let s = 0; s <= steps; s++) {
      const angle = startAngle + (s / steps) * sliceAngle;
      outerPoints.push([cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR]);
      innerPoints.push([cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR]);
    }

    doc.moveTo(outerPoints[0][0], outerPoints[0][1]);
    for (let p = 1; p < outerPoints.length; p++) {
      doc.lineTo(outerPoints[p][0], outerPoints[p][1]);
    }
    for (let p = innerPoints.length - 1; p >= 0; p--) {
      doc.lineTo(innerPoints[p][0], innerPoints[p][1]);
    }
    doc.closePath().fill();

    startAngle += sliceAngle;
  });

  doc.fontSize(7).fillColor("#666");
  let legendY = y + h - 15;
  const legendX = x + 10;
  labels.slice(0, 7).forEach((l, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = legendX + col * (w / 2);
    const ly = legendY + row * 12;

    doc.fillColor(COLORS[i % COLORS.length]);
    doc.rect(lx, ly - 2, 7, 7).fill();
    doc.fillColor("#333");
    doc.fontSize(7).text(`${l} (${Math.round((amounts[i] / total) * 100)}%)`, lx + 10, ly - 3, { width: w / 2 - 20 });
  });

  doc.fontSize(9).fillColor("#333");
  doc.text(formatCurrency(total), cx - 20, cy - 5, { width: 40, align: "center" });

  doc.fillColor("#000");
}

export function renderCharts(
  doc: any,
  entries: ChartEntry[]
) {
  const data = prepareData(entries);
  if (!data) return { entryCount: entries.length };

  const pageW = 495.28;
  const marginX = 50;

  doc.addPage();
  doc.fontSize(16).text("Financial Charts", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#666").text(`Based on ${entries.length} entries`, { align: "center" });
  doc.fillColor("#000");
  doc.moveDown(0.8);

  const chartH = 180;

  doc.fontSize(11).text("Net Balance Over Time", { underline: false });
  doc.moveDown(0.3);
  drawLineChart(doc, marginX, doc.y, pageW, chartH, data.lineLabels, data.lineAmounts);
  doc.y += chartH + 30;

  doc.fontSize(11).text("Income vs Expense");
  doc.moveDown(0.3);
  drawBarChart(doc, marginX, doc.y, pageW, chartH, data.barLabels, data.barIncome, data.barExpense);
  doc.y += chartH + 30;

  doc.addPage();
  doc.fontSize(14).text("Expense by Category", { align: "center" });
  doc.moveDown(0.5);
  drawDoughnutChart(doc, marginX, doc.y, pageW, pageW * 0.6, data.doughnutLabels, data.doughnutAmounts);
  doc.y += pageW * 0.6 + 20;

  doc.fontSize(11).text("Top Categories");
  doc.moveDown(0.3);
  const totalExpense = data.doughnutAmounts.reduce((s, v) => s + v, 0) || 1;
  doc.fontSize(9);
  const catX = marginX;
  for (let i = 0; i < Math.min(data.doughnutLabels.length, 7); i++) {
    const pct = Math.round((data.doughnutAmounts[i] / totalExpense) * 100);
    doc.fillColor(COLORS[i % COLORS.length]);
    doc.rect(catX, doc.y, 8, 8).fill();
    doc.fillColor("#333");
    doc.text(`${data.doughnutLabels[i]}  ${formatCurrency(data.doughnutAmounts[i])}  (${pct}%)`, catX + 12, doc.y - 1);
    doc.moveDown(1);
  }
  doc.fillColor("#000");

  return { entryCount: entries.length };
}
