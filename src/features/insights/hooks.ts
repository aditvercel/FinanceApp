"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInsights, refreshInsights } from "./api";

export function useInsights(reportId: string) {
  return useQuery({
    queryKey: ["insights", reportId],
    queryFn: () => getInsights(reportId),
    staleTime: 30 * 60 * 1000,
    enabled: !!reportId,
  });
}

export function useRefreshInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refreshInsights,
    onSuccess: (_data, reportId) =>
      qc.invalidateQueries({ queryKey: ["insights", reportId] }),
  });
}
