"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, updateCategory, deleteCategory, getCategories } from "./api";

export function useCategories(reportId: string) {
  return useQuery({
    queryKey: ["categories", reportId],
    queryFn: () => getCategories(reportId),
    enabled: !!reportId,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, name, emoji }: { reportId: string; name: string; emoji: string }) =>
      createCategory(reportId, name, emoji),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["categories", vars.reportId] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, categoryId, data }: { reportId: string; categoryId: string; data: { name?: string; emoji?: string } }) =>
      updateCategory(reportId, categoryId, data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["categories", vars.reportId] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, categoryId }: { reportId: string; categoryId: string }) =>
      deleteCategory(reportId, categoryId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["categories", vars.reportId] }),
  });
}
