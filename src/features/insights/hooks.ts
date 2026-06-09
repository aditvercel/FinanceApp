"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getInsights, refreshInsights } from "./api";

export function useInsights(reportId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["insights", userId, reportId],
    queryFn: () => getInsights(reportId),
    staleTime: 30 * 60 * 1000,
    enabled: !!reportId && !!userId,
  });
}

export function useRefreshInsights() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refreshInsights,
    onSuccess: (_data, reportId) =>
      qc.invalidateQueries({ queryKey: ["insights", userId, reportId] }),
  });
}
