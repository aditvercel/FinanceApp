"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function DeletedPage() {
  const router = useRouter();

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-(--muted) rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-(--foreground)" />
        </button>
        <h1 className="text-2xl font-bold">Deleted Items</h1>
      </header>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Trash2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-gray-500 max-w-sm">
          We&apos;re building a comprehensive Deleted Items section where you can manage your deleted data,
          control restoration preferences, and review your deletion settings.
        </p>
        <p className="text-gray-400 text-sm mt-4">
          This feature is currently in development.
        </p>
      </div>
    </div>
  );
}
