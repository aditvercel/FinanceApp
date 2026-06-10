"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="max-w-sm text-center space-y-4">
        <div className="text-5xl">😵</div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Something went wrong
        </h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--primary)" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
