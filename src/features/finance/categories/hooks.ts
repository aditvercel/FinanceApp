"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { createCategory, updateCategory, deleteCategory, getCategories } from "./api";

export function useCategories(reportId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["categories", userId, reportId],
    queryFn: () => getCategories(reportId),
    enabled: !!reportId && !!userId,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, name, emoji }: { reportId: string; name: string; emoji: string }) =>
      createCategory(reportId, name, emoji),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["categories", userId, vars.reportId] }),
  });
}

export function useUpdateCategory() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, categoryId, data }: { reportId: string; categoryId: string; data: { name?: string; emoji?: string } }) =>
      updateCategory(reportId, categoryId, data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["categories", userId, vars.reportId] }),
  });
}

export function useDeleteCategory() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, categoryId }: { reportId: string; categoryId: string }) =>
      deleteCategory(reportId, categoryId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["categories", userId, vars.reportId] }),
  });
}
