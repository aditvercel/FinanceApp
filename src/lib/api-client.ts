"use client";

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await originalFetch(input, init);

  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.href = "/login";
    throw new Error("Unauthorized — redirecting to login");
  }

  return res;
};

export {};
