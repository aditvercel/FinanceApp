"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchEntries } from "./api";

export function useSearch(params: Record<string, any>) {
  const [debounced, setDebounced] = useState(params);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(params), 300);
    return () => clearTimeout(timeout);
  }, [JSON.stringify(params)]);

  return useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchEntries(debounced),
    enabled: !!debounced.q || Object.keys(debounced).some(k => k !== "q" && debounced[k] !== undefined && debounced[k] !== ""),
  });
}
