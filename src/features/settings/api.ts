export interface AppSettings {
  defaultCurrency: string;
  defaultReportId?: string;
  theme: "light" | "dark" | "system";
  storeReceipts: boolean;
}

const SETTINGS_KEY = "app_settings";

const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: "IDR",
  theme: "light",
  storeReceipts: false,
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>) {
  const current = getSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}
