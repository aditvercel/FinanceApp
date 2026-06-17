import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

function hasCredentials(): boolean {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));
}

// ─── Browser client (client components, uses cookies) ───
let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;
  if (!hasCredentials()) {
    browserClient = createMockClient();
    return browserClient;
  }
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

// ─── Server client (API routes, server components) ───
export async function createServerSupabaseClient() {
  if (!hasCredentials()) return createMockClient();
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

// ─── Service role client (bypasses RLS, server-only) ───
let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;
  if (!hasCredentials() || !supabaseServiceKey) {
    serviceClient = createMockClient();
    return serviceClient;
  }
  serviceClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serviceClient;
}

// ─── Mock client for development ───
function createMockClient(): SupabaseClient {
  function buildMockQuery() {
    const handler: ProxyHandler<object> = {
      get() {
        return () => Promise.resolve({ data: null, error: null });
      },
    };
    return new Proxy({}, handler);
  }
  return {
    from: () => buildMockQuery() as ReturnType<SupabaseClient["from"]>,
    rpc: () => Promise.resolve({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
      createBucket: () => Promise.resolve({ data: null, error: null }),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      setSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      admin: {
        getUserById: () => Promise.resolve({ data: null, error: null }),
      },
    },
  } as unknown as SupabaseClient;
}

// Legacy alias (lazy — avoids calling getServiceClient at module init in browser bundles)
export function getSupabase(): SupabaseClient {
  return getServiceClient();
}

/** @deprecated Use getSupabase() instead */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getServiceClient()[prop as keyof SupabaseClient];
  },
});
