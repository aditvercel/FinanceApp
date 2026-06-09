"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import {
  getRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
} from "./api";

export function useRecurringTemplates(reportId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["recurring", userId, reportId],
    queryFn: () => getRecurringTemplates(reportId),
    enabled: !!reportId && !!userId,
  });
}

export function useCreateRecurringTemplate() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecurringTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["recurring", userId, data?.reportId],
      });
    },
  });
}

export function useUpdateRecurringTemplate() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateRecurringTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", userId] });
    },
  });
}

export function useDeleteRecurringTemplate() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecurringTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", userId] });
    },
  });
}
