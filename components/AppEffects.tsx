"use client";

import { useEffect } from "react";
import { setSoundEnabled, unlockAudio } from "@/lib/sounds";
import { primeVoice } from "@/lib/speech";
import { useSettings } from "@/lib/store";

/** App-wide side effects: page language, sound setting, audio unlock on first tap, offline support. */
export function AppEffects() {
  const { language, soundOn } = useSettings();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      // Offline support.
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else {
      // The dev server changes files constantly; drop a worker left over from previewing a build.
      navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => r.unregister()));
    }
  }, []);

  useEffect(() => {
    // The first tap anywhere unlocks sound effects and the voice (needed on iPhone).
    const unlock = () => {
      unlockAudio();
      primeVoice();
    };
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", unlock, { capture: true });
  }, []);

  return null;
}
