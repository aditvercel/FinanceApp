"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEntries,
  createEntry,
  editEntry,
  revertEntry,
  getEntryHistory,
} from "./api";

export function useEntries(reportId: string) {
  return useQuery({
    queryKey: ["entries", reportId],
    queryFn: () => getEntries(reportId),
    enabled: !!reportId,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEntry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["entries", data?.reportId],
      });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useEditEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      editEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRevertEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      targetVersion,
    }: {
      id: string;
      targetVersion: number;
    }) => revertEntry(id, targetVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useEntryHistory(id: string) {
  return useQuery({
    queryKey: ["entries", id, "history"],
    queryFn: () => getEntryHistory(id),
    enabled: !!id,
  });
}
