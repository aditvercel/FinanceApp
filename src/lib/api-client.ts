if (typeof window !== "undefined") {
  const ORIGINAL_FETCH = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await ORIGINAL_FETCH(input, init);

    // Only intercept our own API calls — not Supabase internal calls
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isOurApi = url.startsWith("/api/") || url.includes(window.location.origin + "/api/");

    if (res.status === 401 && isOurApi && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
      return res;
    }

    return res;
  };
}

export {};
