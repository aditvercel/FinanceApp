"use client";

import { useQuery } from "@tanstack/react-query";
import { getMerchants } from "./api";

export function useMerchants(reportId: string, period: "monthly" | "yearly" | "all" = "monthly") {
  return useQuery({
    queryKey: ["merchants", reportId, period],
    queryFn: () => getMerchants(reportId, period),
    enabled: !!reportId,
  });
}
