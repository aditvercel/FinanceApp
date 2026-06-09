// Only run in browser — never on the server (SSR would wrap Supabase's own fetch calls)
if (typeof window !== "undefined") {
  const ORIGINAL_FETCH = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await ORIGINAL_FETCH(input, init);

    if (
      res.status === 401 &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
      throw new Error("Unauthorized — redirecting to login");
    }

    return res;
  };
}

export {};
