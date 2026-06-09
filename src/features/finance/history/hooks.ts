"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getEntryHistory, revertEntry } from "./api";

export function useEntryHistory(entryId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["entry-history", userId, entryId],
    queryFn: () => getEntryHistory(entryId),
    enabled: !!entryId && !!userId,
  });
}

export function useRevertEntry() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, targetVersion }: { entryId: string; targetVersion: number }) =>
      revertEntry(entryId, targetVersion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entry-history", userId] });
    },
  });
}
