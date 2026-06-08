"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEntryHistory, revertEntry } from "./api";

export function useEntryHistory(entryId: string) {
  return useQuery({
    queryKey: ["entry-history", entryId],
    queryFn: () => getEntryHistory(entryId),
    enabled: !!entryId,
  });
}

export function useRevertEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, targetVersion }: { entryId: string; targetVersion: number }) =>
      revertEntry(entryId, targetVersion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entry-history"] });
    },
  });
}
