"use client";

import { useAuth } from "@/lib/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: "var(--background)"}}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{color: "var(--primary)"}} />
          <p className="text-sm" style={{color: "var(--muted-foreground)"}}>Loading...</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isAuthenticated && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: "var(--background)"}}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{color: "var(--primary)"}} />
          <p className="text-sm" style={{color: "var(--muted-foreground)"}}>Redirecting to login...</p>
        </div>
      </div>
    );
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
