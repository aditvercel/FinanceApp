"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-provider";
import { searchEntries } from "./api";

export function useSearch(params: Record<string, any>) {
  const { user } = useAuth();
  const userId = user?.id;
  const [debounced, setDebounced] = useState(params);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(params), 300);
    return () => clearTimeout(timeout);
  }, [JSON.stringify(params)]);

  return useQuery({
    queryKey: ["search", userId, debounced],
    queryFn: () => searchEntries(debounced),
    enabled: (!!debounced.q || Object.keys(debounced).some(k => k !== "q" && debounced[k] !== undefined && debounced[k] !== "")) && !!userId,
  });
}
