"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getActivity } from "./api";

export function useActivity(params?: { reportId?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ["activity", params?.reportId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getActivity({ ...params, before: pageParam }),
    getNextPageParam: (lastPage: any[]) =>
      lastPage.length === (params?.limit ?? 20) ? lastPage[lastPage.length - 1].createdAt : undefined,
  });
}
