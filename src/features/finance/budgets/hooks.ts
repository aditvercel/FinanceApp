"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBudgets, upsertBudget } from "./api";

export function useBudgets(reportId: string) {
  return useQuery({
    queryKey: ["budgets", reportId],
    queryFn: () => getBudgets(reportId),
    enabled: !!reportId,
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertBudget,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["budgets", data?.reportId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
