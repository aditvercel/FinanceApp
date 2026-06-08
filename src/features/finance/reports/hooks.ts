"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReports, getReport, createReport, joinReport, requestEditorAccess, manageMember } from "./api";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["reports", id],
    queryFn: () => getReport(id),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useJoinReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useRequestEditorAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestEditorAccess,
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: ["reports", reportId] });
    },
  });
}

export function useManageMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, userId, action }: { reportId: string; userId: string; action: "promote" | "demote" | "remove" }) =>
      manageMember(reportId, userId, action),
    onSuccess: (_data, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ["reports", reportId] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
