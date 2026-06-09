"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, Upload } from "lucide-react";
import { completeOnboarding, storeOnboardingPreferences } from "./api";

type SetupType = "personal" | "household" | "business";

const ALL_CATEGORIES = [
  { key: "Food & Dining", defaultBudget: 2000000 },
  { key: "Transport", defaultBudget: 1000000 },
  { key: "Utilities", defaultBudget: 800000 },
  { key: "Health", defaultBudget: 500000 },
  { key: "Entertainment", defaultBudget: 500000 },
  { key: "Shopping", defaultBudget: 1000000 },
  { key: "Other", defaultBudget: 500000 },
];

export function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [setupType, setSetupType] = useState<SetupType>("personal");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    ALL_CATEGORIES.slice(0, 3).map((c) => c.key)
  );
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, number>>(
    Object.fromEntries(ALL_CATEGORIES.map((c) => [c.key, c.defaultBudget]))
  );
  const [budgetStep, setBudgetStep] = useState(0);
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);

  const handleFinish = () => {
    storeOnboardingPreferences({
      setupType,
      categories: selectedCategories,
      budgetAmounts: showBudgetSetup ? budgetAmounts : {},
    });
    completeOnboarding();
    if (onComplete) onComplete();
  };

  return (
    <div className="min-h-screen bg-(--card) flex flex-col">
      {step > 1 && step < 4 && (
        <button
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 p-4 text-(--foreground) hover:text-(--foreground)"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
      )}

      {step === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to Finance Tracker</h1>
          <p className="text-(--foreground) mb-8 max-w-sm">
            Track your finances simply, together or on your own.
          </p>
          <button
            onClick={() => setStep(2)}
            className="w-full max-w-xs bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 px-6 py-8">
          <h2 className="text-2xl font-bold mb-6">How will you use this?</h2>
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
                    <div className="font-semibold">{option.title}</div>
                    <div className="text-sm text-(--foreground)">{option.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 px-6 py-8">
          <h2 className="text-2xl font-bold mb-2">What do you usually spend on?</h2>
          <p className="text-(--foreground) mb-6">
            We&apos;ll set up budgets for these categories.
          </p>

          {!showBudgetSetup ? (
            <>
              <div className="space-y-2 mb-8">
                {ALL_CATEGORIES.map((cat) => (
                  <label
                    key={cat.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCategories.includes(cat.key)
                        ? "border-blue-300 bg-blue-50"
                        : "border-(--border) hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat.key]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== cat.key)
                          );
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-medium">{cat.key}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBudgetSetup(true);
                    setBudgetStep(0);
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Set Up Budgets
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 border border-(--border) py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-sm text-gray-500">
                Category {budgetStep + 1} of{" "}
                {selectedCategories.length}
              </div>
              {(() => {
                const cat = selectedCategories[budgetStep];
                if (!cat) {
                  setShowBudgetSetup(false);
                  return null;
                }
                return (
                  <div className="space-y-6">
                    <div className="text-center py-6">
                      <p className="text-lg font-semibold mb-4">{cat}</p>
                      <p className="text-sm text-(--foreground) mb-2">
                        Monthly budget
                      </p>
                      <div className="relative inline-block">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                          Rp
                        </span>
                        <input
                          type="number"
                          value={budgetAmounts[cat] || ""}
                          onChange={(e) =>
                            setBudgetAmounts({
                              ...budgetAmounts,
                              [cat]: Number(e.target.value),
                            })
                          }
                          className="text-center text-2xl font-bold w-48 pl-10 pr-4 py-3 border border-(--border) rounded-xl focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {budgetStep > 0 && (
                        <button
                          onClick={() => setBudgetStep(budgetStep - 1)}
                          className="flex-1 border border-(--border) py-3 rounded-xl font-medium hover:bg-gray-50"
                        >
                          Previous
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (budgetStep < selectedCategories.length - 1) {
                            setBudgetStep(budgetStep + 1);
                          } else {
                            setStep(4);
                          }
                        }}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                      >
                        {budgetStep < selectedCategories.length - 1
                          ? "Next"
                          : "Done"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">You&apos;re all set!</h1>
          <p className="text-(--foreground) mb-8 max-w-sm">
            Add your first expense now — or scan a receipt to get started.
          </p>
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => {
                handleFinish();
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Scan a Receipt
            </button>
            <button
              onClick={() => {
                handleFinish();
              }}
              className="w-full border border-(--border) py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Add Manually
            </button>
            <button
              onClick={() => {
                handleFinish();
              }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              I&apos;ll do this later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
