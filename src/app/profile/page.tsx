"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  Info,
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
      className={`w-full flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all text-left ${
        danger ? "hover:border-red-300" : ""
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          danger ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        <span className={danger ? "text-red-600" : "text-black"}>{icon}</span>
      </div>
      <p
        className={`flex-1 font-medium text-sm ${
          danger ? "text-red-600" : "text-gray-900"
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

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
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

  return (
    <div className="p-4 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="flex items-center gap-4 mb-8 p-4 bg-white border border-gray-200 rounded-xl">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user || authUser ? initials : <User className="w-8 h-8" />}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate">
            {displayName}
          </h2>
          <p className="text-gray-500 text-sm truncate">{email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <ProfileRow
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          onClick={() => router.push("/settings")}
        />
        <ProfileRow
          icon={<Shield className="w-5 h-5" />}
          label="Privacy"
          onClick={() => router.push("/settings/privacy")}
        />
        <ProfileRow
          icon={<HelpCircle className="w-5 h-5" />}
          label="Help & Support"
          onClick={() => router.push("/help")}
        />

        <div className="pt-4">
          <ProfileRow
            icon={<LogOut className="w-5 h-5" />}
            label="Sign Out"
            danger
            onClick={() => {
              if (confirm("Are you sure you want to sign out?")) {
                logout();
              }
            }}
          />
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">Finance Tracker</p>
        <p className="text-xs text-gray-400 mt-0.5">Version 1.0.0</p>
      </div>
    </div>
  );
}
