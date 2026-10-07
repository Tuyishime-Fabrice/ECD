/**
 * Screen-time hooks for client components.
 */
import { useEffect } from "react";
import { getStore, useHydrated, useProgress } from "./store";
import { isTimeUp, kigaliDate } from "./timer";

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

/** True when today's limit is used up. Always false before saved data is read. */
export function useTimeUp(): boolean {
  const hydrated = useHydrated();
  const usage = useProgress((s) => s.usage);
  const settings = useProgress((s) => s.settings);
  return hydrated && isTimeUp(usage, settings, kigaliDate());
}

/** Read the current state right now (for decisions in event handlers). */
export function timeUpNow(): boolean {
  const { usage, settings } = getStore().getState();
  return isTimeUp(usage, settings, kigaliDate());
}
