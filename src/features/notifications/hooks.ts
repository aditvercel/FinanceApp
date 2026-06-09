"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "./api";

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: getNotifications,
    refetchInterval: 30000,
    enabled: !!userId,
  });
}

export function useMarkRead() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });
}
