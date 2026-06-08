"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "./api";

export function useDashboard(
  reportId: string,
  period: "daily" | "monthly" | "yearly" = "monthly"
) {
  return useQuery({
    queryKey: ["dashboard", reportId, period],
    queryFn: () => getDashboardData(reportId, period),
    enabled: !!reportId,
  });
}
