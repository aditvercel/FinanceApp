"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type User = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<{ emailConfirmationRequired: boolean }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function toAppUser(sbUser: SupabaseUser): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? "",
    displayName:
      sbUser.user_metadata?.display_name ??
      sbUser.user_metadata?.full_name ??
      sbUser.email?.split("@")[0] ??
      "User",
    avatarUrl: sbUser.user_metadata?.avatar_url ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(toAppUser(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(toAppUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Invalid email or password"
          : error.message;
      throw new Error(message);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName?: string): Promise<{ emailConfirmationRequired: boolean }> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName ?? email.split("@")[0] },
        },
      });
      if (error) {
        const message =
          error.message === "User already registered"
            ? "An account with this email already exists"
            : error.message;
        throw new Error(message);
      }
      const emailConfirmationRequired = !data.session && !!data.user;
      return { emailConfirmationRequired };
    },
    [],
  );

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
