"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Play,
  Download,
  Receipt,
  Clock,
  Trash2,
  Upload,
  Shield,
  Bell,
  Palette,
} from "lucide-react";

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}

function SettingsRow({ icon, label, description, onClick, danger }: SettingsRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all text-left"
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          danger ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        <span className={danger ? "text-red-600" : "text-black"}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${danger ? "text-red-600" : "text-gray-900"}`}>
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

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <div className="space-y-3">
        <SectionLabel>General</SectionLabel>

        <SettingsRow
          icon={<Play className="w-5 h-5" />}
          label="Onboarding"
          description="Re-run the first-time setup flow"
          onClick={() => router.push("/onboarding")}
        />

        <SettingsRow
          icon={<Download className="w-5 h-5" />}
          label="Export All Data"
          description="Download a full backup of all your reports"
          onClick={() => router.push("/export/backup")}
        />

        <SettingsRow
          icon={<Upload className="w-5 h-5" />}
          label="Import Data"
          description="Import entries from CSV"
          onClick={() => router.push("/import")}
        />

        <div className="h-4" />

        <SectionLabel>Reports</SectionLabel>

        <SettingsRow
          icon={<Palette className="w-5 h-5" />}
          label="Custom Categories"
          description="Add, edit, or delete categories"
          onClick={() => router.push("/settings/categories")}
        />

        <SettingsRow
          icon={<Receipt className="w-5 h-5" />}
          label="Receipt Storage Settings"
          description="Toggle receipt image storage per report"
          onClick={() => router.push("/settings/receipts")}
        />

        <SettingsRow
          icon={<Clock className="w-5 h-5" />}
          label="Recurring Templates"
          description="Manage automated entry schedules"
          onClick={() => router.push("/settings/recurring")}
        />

        <div className="h-4" />

        <SectionLabel>Data</SectionLabel>

        <SettingsRow
          icon={<Trash2 className="w-5 h-5" />}
          label="Recently Deleted"
          description="Recover reports deleted within 30 days"
          onClick={() => router.push("/settings/deleted")}
        />

        <SettingsRow
          icon={<Shield className="w-5 h-5" />}
          label="Data & Privacy"
          description="Manage your data and export preferences"
          onClick={() => router.push("/settings/privacy")}
        />

        <SettingsRow
          icon={<Bell className="w-5 h-5" />}
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
