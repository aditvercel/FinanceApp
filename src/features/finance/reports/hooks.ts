"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getReports, getReport, createReport, joinReport, requestEditorAccess, manageMember } from "./api";

export function useReports() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["reports", userId],
    queryFn: getReports,
    enabled: !!userId,
  });
}

export function useReport(id: string) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["reports", userId, id],
    queryFn: () => getReport(id),
    enabled: !!id && !!userId,
  });
}

export function useCreateReport() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", userId] });
    },
  });
}

export function useJoinReport() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", userId] });
    },
  });
}

export function useRequestEditorAccess() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestEditorAccess,
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: ["reports", userId, reportId] });
    },
  });
}

export function useManageMember() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, userId, action }: { reportId: string; userId: string; action: "promote" | "demote" | "remove" }) =>
      manageMember(reportId, userId, action),
    onSuccess: (_data, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: ["reports", userId, reportId] });
      queryClient.invalidateQueries({ queryKey: ["reports", userId] });
    },
  });
}
