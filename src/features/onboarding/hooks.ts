"use client";

import { useEffect, useState } from "react";
import { isOnboardingCompleted } from "./api";

export function useOnboarding() {
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    setCompleted(isOnboardingCompleted());
  }, []);

  return { completed, setCompleted };
}
