"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";

type SetupType = "personal" | "household" | "business";

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", selected: true, emoji: "🍔" },
  { name: "Transport", selected: true, emoji: "🚗" },
  { name: "Utilities", selected: true, emoji: "⚡" },
  { name: "Health", selected: false, emoji: "❤️" },
  { name: "Entertainment", selected: false, emoji: "🎬" },
  { name: "Shopping", selected: false, emoji: "🛍️" },
  { name: "Other", selected: false, emoji: "📦" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [setupType, setSetupType] = useState<SetupType>("personal");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const toggleCategory = (index: number) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleComplete = () => {
    localStorage.setItem("onboarding_completed", "true");
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-(--card) flex flex-col">
      {step > 1 && (
        <div className="p-4">
          <button
            onClick={() => setStep(step - 1)}
            className="p-1 -ml-1 hover:bg-(--muted)rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-(--foreground)" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Step indicators */}
        <div className="flex gap-1.5 px-4 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${
                s <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 px-4">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="text-6xl mb-6">💰</div>
              <h1 className="text-3xl font-bold text-(--foreground) mb-3">
                Welcome to Finance Tracker
              </h1>
              <p className="text-(--foreground) mb-8 max-w-sm">
                Track your finances simply, together or on your own.
              </p>
              <button
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white py-3 px-10 rounded-xl font-medium text-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-(--foreground) mb-2">
                How will you use this?
              </h2>
              <p className="text-gray-500 mb-6">
                Choose how you want to track your finances
              </p>
              <div className="space-y-3">
                {[
                  {
                    type: "personal" as SetupType,
                    title: "Track my personal spending",
                    desc: "Just for me — income, expenses, budgets",
                    emoji: "👤",
                  },
                  {
                    type: "household" as SetupType,
                    title: "Track household finances together",
                    desc: "Share with partner or family",
                    emoji: "🏠",
                  },
                  {
                    type: "business" as SetupType,
                    title: "Track a project or business budget",
                    desc: "Team expenses, freelance income",
                    emoji: "💼",
                  },
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      setSetupType(option.type);
                      setStep(3);
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      setupType === option.type
                        ? "border-blue-600 bg-blue-50"
                        : "border-(--border) hover:border-(--border)"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.emoji}</span>
                      <div>
                        <div className="font-medium text-(--foreground)">
                          {option.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {option.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-(--foreground) mb-2">
                Quick category setup
              </h2>
              <p className="text-gray-500 mb-6">
                We will set up budgets for these categories
              </p>
              <div className="space-y-2 mb-6">
                {categories.map((cat, i) => (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategory(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      cat.selected
                        ? "border-blue-300 bg-blue-50"
                        : "border-(--border)"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        cat.selected
                          ? "bg-blue-600 border-blue-600"
                          : "border-(--border)"
                      }`}
                    >
                      {cat.selected && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="font-medium text-(--foreground)">{cat.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Set Up Budgets
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 border border-(--border) text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h1 className="text-3xl font-bold text-(--foreground) mb-3">
                You are all set!
              </h1>
              <p className="text-(--foreground) mb-8 max-w-sm">
                Add your first expense now — or scan a receipt to get started.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={() => router.push("/entries/scan")}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  📷 Scan a Receipt
                </button>
                <button
                  onClick={handleComplete}
                  className="flex items-center justify-center gap-2 border border-(--border) text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Add Manually
                </button>
                <button
                  onClick={handleComplete}
                  className="text-sm text-gray-500 py-2 hover:text-gray-700"
                >
                  I will do this later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
