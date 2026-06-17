"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, PlusIcon, BellIcon, UserIcon } from "lucide-react";
import { AddExpenseSheet } from "@/features/finance/entries/ui";
import { useState } from "react";

export function TabBar() {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const pathname = usePathname();

  const hideOnPaths = ["/entries/scan", "/login", "/signup"];
  if (hideOnPaths.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-(--card) border-t border-(--border) h-16 flex items-center justify-around px-4 z-40">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === "/" ? "text-(--primary)" : "text-(--muted-foreground) hover:text-(--foreground)"
          }`}
        >
          <HomeIcon className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </Link>

        <button
          onClick={() => setShowAddSheet(true)}
          className="flex flex-col items-center gap-1 text-(--muted-foreground) hover:text-(--foreground) transition-colors"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-(--primary) to-(--secondary) rounded-full flex items-center justify-center -mt-4 shadow-lg shadow-(--primary)/20">
            <PlusIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs -mt-1">Add</span>
        </button>

        <Link
          href="/notifications"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === "/notifications" ? "text-(--primary)" : "text-(--muted-foreground) hover:text-(--foreground)"
          }`}
        >
          <BellIcon className="w-6 h-6" />
          <span className="text-xs">Alerts</span>
        </Link>

        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === "/profile" ? "text-(--primary)" : "text-(--muted-foreground) hover:text-(--foreground)"
          }`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </Link>
      </nav>
      <AddExpenseSheet open={showAddSheet} onOpenChange={setShowAddSheet} />
    </>
  );
}
