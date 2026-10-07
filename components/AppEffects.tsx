"use client";

import { useEffect } from "react";
import { setSoundEnabled, unlockAudio } from "@/lib/sounds";
import { useSettings } from "@/lib/store";

/** App-wide side effects: page language, sound setting, audio unlock on first tap. */
export function AppEffects() {
  const { language, soundOn } = useSettings();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", unlock, { capture: true });
  }, []);

  return null;
}
