"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getDashboardData } from "./api";

export function useDashboard(
  reportId: string,
  period: "daily" | "monthly" | "yearly" = "monthly"
) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["dashboard", userId, reportId, period],
    queryFn: () => getDashboardData(reportId, period),
    enabled: !!reportId && !!userId,
  });
}
