"use client";

import { useMutation } from "@tanstack/react-query";
import { exportFullBackup, exportReport } from "./api";

export function useExport() {
  return useMutation({
    mutationFn: exportReport,
  });
}

export function useExportBackup() {
  return useMutation({
    mutationFn: exportFullBackup,
  });
}
