"use client";

import { useMutation } from "@tanstack/react-query";
import { scanReceipt } from "./api";

export function useReceiptScan() {
  return useMutation({
    mutationFn: (file: File) => scanReceipt(file),
  });
}
