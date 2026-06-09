"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { getActivity } from "./api";

export function useActivity(params?: { reportId?: string; limit?: number }) {
  const { user } = useAuth();
  const userId = user?.id;
  return useInfiniteQuery({
    queryKey: ["activity", userId, params?.reportId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getActivity({ ...params, before: pageParam }),
    getNextPageParam: (lastPage: any[]) =>
      lastPage.length === (params?.limit ?? 10) ? lastPage[lastPage.length - 1].createdAt : undefined,
    enabled: !!userId,
  });
}
