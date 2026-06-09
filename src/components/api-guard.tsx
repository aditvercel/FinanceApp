"use client";

import "@/lib/api-client";

export function ApiGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
