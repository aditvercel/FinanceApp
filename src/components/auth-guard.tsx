"use client";

import { useAuth } from "@/lib/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { TabBar } from "./tab-bar";

const PUBLIC_PATHS = ["/login", "/signup", "/onboarding"];

function isOnboardingCompleted(): boolean {
  if (globalThis.window === undefined) return true;
  return localStorage.getItem("onboarding_completed") === "true";
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isPublic) {
      if (pathname === "/onboarding") return;
      const done = isOnboardingCompleted();
      router.replace(done ? "/" : "/onboarding");
      return;
    }

    if (isAuthenticated && !isPublic && !isOnboardingCompleted()) {
      router.replace("/onboarding");
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return null;
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isAuthenticated && !isPublic) {
    return null;
  }

  return (
    <>
      <main className={`flex-1 flex flex-col ${isPublic ? "" : "pb-16"}`}>
        {children}
      </main>
      {!isPublic && <TabBar />}
    </>
  );
}
