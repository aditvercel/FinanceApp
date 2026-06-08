"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "./api";
import { getSettings, saveSettings } from "./api";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const merged = saveSettings(patch);
    setSettings(merged);
  }, []);

  return { settings, updateSettings: update };
}
