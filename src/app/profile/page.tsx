"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function ProfileRow({ icon, label, onClick, danger }: ProfileRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 bg-(--card) border border-(--border) rounded-xl hover:border-(--border) transition-all text-left ${
        danger ? "hover:border-red-300" : ""
      }`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center bg-(--card)"
      >
        <span className={danger ? "text-red-600" : "text-(--foreground)"}>{icon}</span>
      </div>
      <p
        className={`flex-1 font-medium text-sm ${
          danger ? "text-red-600" : "text-(--foreground)"
        }`}
      >
        {label}
      </p>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile", authUser?.id],
    queryFn: async () => {
      const res = await fetch("/api/auth/profile");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json.data as {
        id: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
      };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!authUser,
  });

  const displayName = user?.displayName || authUser?.displayName || "User Name";
  const email = user?.email || authUser?.email || "user@example.com";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="p-4 pb-16 space-y-6 animate-pulse">
        <div className="h-7 w-20 bg-gray-200 rounded" />
        <div className="flex items-center gap-4 p-4 border border-(--border) rounded-xl">
          <div className="w-16 h-16 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 border rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 h-4 w-24 bg-gray-200 rounded" />
              <div className="w-4 h-4 bg-gray-200 rounded" />
            </div>
          ))}
          <div className="pt-4">
            <div className="flex items-center gap-3 p-4 border rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 h-4 w-20 bg-gray-200 rounded" />
              <div className="w-4 h-4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="flex items-center gap-4 mb-8 p-4 bg-(--card) border border-(--border) rounded-xl">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user || authUser ? initials : <User className="w-8 h-8" />}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-(--foreground) truncate">
            {displayName}
          </h2>
          <p className="text-gray-500 text-sm truncate">{email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <ProfileRow
          icon={<Settings className="w-5 h-5 text-(--foreground)"/>}
          label="Settings"
          onClick={() => router.push("/settings")}
        />
        
        <ProfileRow
          icon={<Shield className="w-5 h-5 text-(--foreground)" />}
          label="Privacy"
          onClick={() => router.push("/settings/privacy")}
        />
        <ProfileRow
          icon={<HelpCircle className="w-5 h-5 text-(--foreground)" />}
          label="Help & Support"
          onClick={() => router.push("/help")}
        />

        <div className="pt-4">
          <ProfileRow
            icon={<LogOut className="w-5 h-5" />}
            label="Sign Out"
            danger
            onClick={() => setShowSignOutConfirm(true)}
          />
        </div>
      </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-(--card) rounded-xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Sign Out</h3>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="p-1 hover:bg-(--muted)rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-(--foreground)">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 border border-(--border) rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirm(false);
                  logout();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">Finance Tracker</p>
        <p className="text-xs text-gray-400 mt-0.5">Version 1.0.0</p>
      </div>
    </div>
  );
}
