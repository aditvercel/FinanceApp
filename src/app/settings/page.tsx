"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Trash2,
  Shield,
  Bell,
  Palette,
  Camera,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface SettingsRowProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly description?: string;
  readonly onClick: () => void;
  readonly danger?: boolean;
}

function SettingsRow({ icon, label, description, onClick, danger }:  SettingsRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-(--card) border border-(--border) rounded-xl hover:border-(--border) transition-all text-left"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center bg-(--card)"
      >
        <span className={danger ? "text-red-600" : "text-(--foreground)"}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${danger ? "text-red-600" : "text-(--foreground)"}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
    </button>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(user?.displayName || "User");
  const avatarColors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-purple-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
  ];
  const avatarColor = avatarColors[Math.abs((user?.id || "").charCodeAt(0)) % avatarColors.length];

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
      });
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-(--muted)rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-(--foreground)" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <div className="space-y-3">
        <SectionLabel>Profile</SectionLabel>

        {isEditing ? (
          <div className="bg-(--card) border border-(--border) rounded-xl p-4 space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-(--border)"
                  />
                ) : (
                  <div className={`w-20 h-20 ${avatarColor} rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-(--primary) text-(--primary-foreground) rounded-full flex items-center justify-center shadow-md hover:opacity-90"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            {avatarUrl && (
              <button
                onClick={() => setAvatarUrl("")}
                className="text-xs text-red-500 hover:text-red-600 mx-auto block"
              >
                Remove photo
              </button>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full py-2 px-3 border border-(--border) rounded-lg text-sm bg-(--background) text-(--foreground)"
                placeholder="Your name"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDisplayName(user?.displayName || "");
                  setAvatarUrl(user?.avatarUrl || "");
                  setError(null);
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-(--border) rounded-lg text-sm text-(--foreground)"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-(--primary) text-(--primary-foreground) rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setDisplayName(user?.displayName || "");
              setAvatarUrl(user?.avatarUrl || "");
              setIsEditing(true);
            }}
            className="w-full flex items-center gap-3 p-4 bg-(--card) border border-(--border) rounded-xl hover:border-blue-300 transition-all text-left group cursor-pointer"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-(--foreground)">{user?.displayName || "Set your name"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tap to edit profile</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        )}

        <div className="h-2" />

        <SectionLabel>Reports</SectionLabel>

        <SettingsRow
          icon={<Palette className="w-5 h-5 text-(--foreground)" />}
          label="Custom Categories"
          description="Add, edit, or delete categories"
          onClick={() => router.push("/settings/categories")}
        />

        <SettingsRow
          icon={<Clock className="w-5 h-5 text-(--foreground)" />}
          label="Recurring Templates"
          description="Manage automated entry schedules"
          onClick={() => router.push("/settings/recurring")}
        />

        <div className="h-4" />

        <SectionLabel>Data</SectionLabel>

        <SettingsRow
          icon={<Trash2 className="w-5 h-5 text-(--foreground)" />}
          label="Recently Deleted"
          description="Recover reports deleted within 30 days"
          onClick={() => router.push("/settings/deleted")}
        />

        <SettingsRow
          icon={<Shield className="w-5 h-5 text-(--foreground)" />}
          label="Data & Privacy"
          description="Manage your data and export preferences"
          onClick={() => router.push("/settings/privacy")}
        />

        <SettingsRow
          icon={<Bell className="w-5 h-5 text-(--foreground)" />}
          label="Notification Preferences"
          description="Control which alerts you receive"
          onClick={() => router.push("/settings/notifications")}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
      {children}
    </p>
  );
}
