/**
 * Screen-time hooks for client components.
 */
import { useEffect, useSyncExternalStore } from "react";
import { getStore, useHydrated, useProgress } from "./store";
import { extensionSec, isTimeUp, kigaliDate, msUntilKigaliMidnight } from "./timer";

/** Count seconds while `active` and the tab is visible. */
export function useUsageTicker(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") getStore().addUsage(kigaliDate(), 1);
    }, 1000);
    return () => clearInterval(id);
  }, [active]);
}

// Today's date in Kigali, re-checked at Kigali midnight and whenever the app comes back to the screen.
function subscribeToDate(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onChange();
      arm();
    }, msUntilKigaliMidnight() + 1000);
  };
  const wake = () => {
    onChange();
    arm();
  };
  arm();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("focus", wake);
  };
}

export const useKigaliDate = () => useSyncExternalStore(subscribeToDate, () => kigaliDate(), () => "");

/** True when today's limit is used up. Always false before saved data is read. */
export function useTimeUp(): boolean {
  const hydrated = useHydrated();
  const today = useKigaliDate();
  const usage = useProgress((s) => s.usage);
  const settings = useProgress((s) => s.settings);
  return hydrated && isTimeUp(usage, settings, today);
}

/** A parent's "+10 minutes" for today (see extensionSec). */
export function grantExtension() {
  const { usage, settings } = getStore().getState();
  const today = kigaliDate();
  getStore().addExtraTime(today, extensionSec(usage, settings, today));
}

/** Read the current state right now (for decisions in event handlers). */
export function timeUpNow(): boolean {
  const { usage, settings } = getStore().getState();
  return isTimeUp(usage, settings, kigaliDate());
}
