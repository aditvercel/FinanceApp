"use client";

import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DEFAULT_OPTIONS: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
};

interface NetBalanceChartProps {
  labels: string[];
  amounts: number[];
  options?: ChartOptions<"line">;
}

export function NetBalanceChart({
  labels,
  amounts,
  options,
}: NetBalanceChartProps) {
  const data = {
    labels,
    datasets: [
      {
        data: amounts,
        borderColor: amounts[amounts.length - 1] >= 0 ? "#34d399" : "#f87171",
        backgroundColor: "transparent",
        tension: 0.3,
        fill: false,
        pointBackgroundColor: amounts.map((a) =>
          a >= 0 ? "#34d399" : "#f87171"
        ),
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="h-48">
      <Line data={data} options={options ?? DEFAULT_OPTIONS} />
    </div>
  );
}

interface IncomeExpenseBarProps {
  labels: string[];
  income: number[];
  expense: number[];
  options?: ChartOptions<"bar">;
}

export function IncomeExpenseBar({
  labels,
  income,
  expense,
  options,
}: IncomeExpenseBarProps) {
  const data = {
    labels,
    datasets: [
      {
        label: "Income",
        data: income,
        backgroundColor: "#34d399",
        borderRadius: 4,
      },
      {
        label: "Expense",
        data: expense,
        backgroundColor: "#f87171",
        borderRadius: 4,
      },
    ],
  };

  const mergedOptions: ChartOptions<"bar"> = {
    ...(options ?? DEFAULT_OPTIONS as any),
    plugins: {
      ...((options?.plugins as any) ?? DEFAULT_OPTIONS.plugins),
      legend: {
        display: true,
        position: "bottom",
        labels: { usePointStyle: true, padding: 16 },
      },
    },
  };

  return (
    <div className="h-48">
      <Bar data={data} options={mergedOptions as any} />
    </div>
  );
}

interface ExpenseDoughnutProps {
  labels: string[];
  amounts: number[];
  budgets?: Array<{ category: string; amount: number }>;
  options?: ChartOptions<"doughnut">;
}

export function ExpenseDoughnut({
  labels,
  amounts,
  budgets,
  options,
}: ExpenseDoughnutProps) {
  const budgetMap = new Map(
    (budgets ?? []).map((b) => [b.category, b.amount])
  );

  const backgroundColors = labels.map((label) => {
    const budget = budgetMap.get(label);
    if (!budget) return getDefaultColor(labels.indexOf(label));
    const spent = amounts[labels.indexOf(label)] || 0;
    const pct = (spent / budget) * 100;
    if (pct >= 100) return "#ef4444";
    if (pct >= 80) return "#f59e0b";
    return getDefaultColor(labels.indexOf(label));
  });

  const datasets: any[] = [
    {
      data: amounts,
      backgroundColor: backgroundColors,
      borderWidth: 2,
      borderColor: "#fff",
    },
  ];

  if (budgets && budgets.length > 0) {
    datasets.push({
      data: labels.map((label) => {
        const budget = budgetMap.get(label);
        return budget ?? 0;
      }),
      backgroundColor: labels.map((_, i) => {
        const base = getDefaultColor(i);
        return base + "40";
      }),
      borderWidth: 1,
      borderColor: labels.map((_, i) => {
        const base = getDefaultColor(i);
        return base;
      }),
      borderRadius: 0,
    });
  }

  const data = { labels, datasets };

  const mergedOptions: ChartOptions<"doughnut"> = {
    ...(options ?? DEFAULT_OPTIONS as any),
    plugins: {
      ...((options?.plugins as any) ?? DEFAULT_OPTIONS.plugins),
      legend: {
        display: true,
        position: "bottom",
        labels: { usePointStyle: true, padding: 12 },
      },
    },
  };

  return (
    <div className="h-48">
      <Doughnut data={data} options={mergedOptions as any} />
    </div>
  );
}

const DEFAULT_COLORS = [
  "#fbbf24",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#f97316",
  "#f472b6",
  "#9ca3af",
];

function getDefaultColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}
