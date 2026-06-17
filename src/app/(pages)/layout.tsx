import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/lib/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { ApiGuard } from "@/components/api-guard";
import { ToastProvider } from "@/lib/toat";
import { ThemeProvider } from "@/lib/theme-provider";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Collaborative personal finance tracker with AI insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{background: "var(--background)", color: "var(--foreground)"}}>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <ApiGuard>
                <Suspense fallback={null}>
                  <AuthGuard>
                    {children}
                  </AuthGuard>
                </Suspense>
              </ApiGuard>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
