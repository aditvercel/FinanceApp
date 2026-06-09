"use client";

import {
  Bell,
  ChevronRight,
  DollarSign,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { useSettings } from "./hooks";

interface SettingsListProps {
  onNavigate?: (path: string) => void;
}

export function SettingsList({ onNavigate }: SettingsListProps) {
  const { settings, updateSettings } = useSettings();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const sections = [
    {
      title: "General",
      items: [
        {
          icon: DollarSign,
          label: "Default Currency",
          rightText: settings.defaultCurrency,
          onClick: () => setShowCurrencyPicker(true),
        },
        {
          icon: Sun,
          label: "Theme",
          rightText: settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1),
          onClick: () => {
            const themes: Array<"light" | "dark" | "system"> = [
              "light",
              "dark",
              "system",
            ];
            const idx = themes.indexOf(settings.theme);
            updateSettings({ theme: themes[(idx + 1) % themes.length] });
          },
        },
      ],
    },
    {
      title: "Data",
      items: [
        {
          icon: User,
          label: "Account",
          onClick: () => onNavigate?.("/settings/account"),
        },
        {
          icon: Bell,
          label: "Notifications",
          onClick: () => onNavigate?.("/settings/notifications"),
        },
      ],
    },
  ];

  const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "EUR", "JPY"];

  return (
    <div className="divide-y divide-gray-100">
      {sections.map((section) => (
        <div key={section.title} className="py-2">
          <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {section.title}
          </h3>
          {section.items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
                <item.icon className="w-5 h-5 text-gray-400" />
              <div className="flex-1 text-left">
                <span className="text-sm font-medium">{item.label}</span>
                {"subtitle" in item && item.subtitle && (
                  <p className="text-xs text-gray-500">{(item as any).subtitle}</p>
                )}
              </div>
              {"rightText" in item && (item as any).rightText && (
                <span className="text-sm text-gray-500">{(item as any).rightText}</span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      ))}

      {showCurrencyPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-(--card) w-full rounded-t-xl p-4">
            <h3 className="text-lg font-bold mb-4">Default Currency</h3>
            <div className="space-y-1">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  onClick={() => {
                    updateSettings({ defaultCurrency: cur });
                    setShowCurrencyPicker(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    settings.defaultCurrency === cur
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCurrencyPicker(false)}
              className="w-full mt-4 py-3 text-gray-500 font-medium border-t"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
