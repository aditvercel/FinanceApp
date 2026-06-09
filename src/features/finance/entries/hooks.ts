"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import {
  getEntries,
  getEntriesPaginated,
  createEntry,
  editEntry,
  revertEntry,
  getEntryHistory,
} from "./api";

export function useEntries(reportId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["entries", userId, reportId],
    queryFn: () => getEntries(reportId),
    enabled: !!reportId && !!userId,
  });
}

export function useInfiniteEntries(reportId: string, pageSize = 10) {
  const { user } = useAuth();
  const userId = user?.id;
  return useInfiniteQuery({
    queryKey: ["entries", userId, reportId, "infinite"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getEntriesPaginated(reportId, { cursor: pageParam, limit: pageSize }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!reportId && !!userId,
  });
}

export function useCreateEntry() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEntry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["entries", userId, data?.reportId],
      });
      queryClient.invalidateQueries({ queryKey: ["reports", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });
}

export function useEditEntry() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      editEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });
}

export function useRevertEntry() {
  const { user } = useAuth();
  const userId = user?.id;
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
      queryClient.invalidateQueries({ queryKey: ["entries", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });
}

export function useEntryHistory(id: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["entries", userId, id, "history"],
    queryFn: () => getEntryHistory(id),
    enabled: !!id && !!userId,
  });
}
