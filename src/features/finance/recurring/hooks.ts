"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
} from "./api";

export function useRecurringTemplates(reportId: string) {
  return useQuery({
    queryKey: ["recurring", reportId],
    queryFn: () => getRecurringTemplates(reportId),
    enabled: !!reportId,
  });
}

export function useCreateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecurringTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["recurring", data?.reportId],
      });
    },
  });
}

export function useUpdateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateRecurringTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });
}

export function useDeleteRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecurringTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });
}
