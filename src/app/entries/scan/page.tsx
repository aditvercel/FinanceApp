"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptScanFlow } from "@/features/finance/entries/scan/ui";
import { ArrowLeft } from "lucide-react";

export default function ScanPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <div className="h-screen bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-lg font-semibold">Scan Receipt</h1>
      </div>
      <ReceiptScanFlow open={open} onOpenChange={(v) => { setOpen(v); if (!v) router.back(); }} />
    </div>
  );
}
