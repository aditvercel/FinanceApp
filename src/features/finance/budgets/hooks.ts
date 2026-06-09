"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getBudgets, upsertBudget } from "./api";

export function useBudgets(reportId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["budgets", userId, reportId],
    queryFn: () => getBudgets(reportId),
    enabled: !!reportId && !!userId,
  });
}

export function useUpsertBudget() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertBudget,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["budgets", userId, data?.reportId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });
}
