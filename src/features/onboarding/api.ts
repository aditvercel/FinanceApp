export function completeOnboarding() {
  localStorage.setItem("onboarding_completed", "true");
}

export function isOnboardingCompleted(): boolean {
  if (globalThis.window === undefined) return false;
  return localStorage.getItem("onboarding_completed") === "true";
}

export function storeOnboardingPreferences(prefs: {
  setupType: "personal" | "household" | "business";
  categories: string[];
  budgetAmounts: Record<string, number>;
}) {
  localStorage.setItem("onboarding_preferences", JSON.stringify(prefs));
}
