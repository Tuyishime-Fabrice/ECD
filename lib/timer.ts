/**
 * Daily screen-time limit. Usage is counted per local date in Kigali and
 * starts fresh every day.
 */
import type { DailyUsage, Settings } from "./progress";

export const KIGALI_TZ = "Africa/Kigali";
/** What a parent adds through the parent gate. */
export const EXTENSION_SEC = 10 * 60;
export const DEMO_LIMIT_SEC = 60;

/** "YYYY-MM-DD" for the given moment in Kigali (UTC+2, no daylight saving). */
export function kigaliDate(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: KIGALI_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    // Very old browsers without time-zone data: Kigali is always UTC+2.
    return new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
  }
}

/** Seconds allowed per day; Infinity when the limit is off. */
export function dailyLimitSec(settings: Pick<Settings, "dailyLimitMin" | "oneMinuteLimit">): number {
  if (settings.oneMinuteLimit) return DEMO_LIMIT_SEC;
  return settings.dailyLimitMin === 0 ? Infinity : settings.dailyLimitMin * 60;
}

export function usageToday(usage: DailyUsage, today: string): DailyUsage {
  return usage.date === today ? usage : { date: today, usedSec: 0, extraSec: 0 };
}

export function remainingSec(
  usage: DailyUsage,
  settings: Pick<Settings, "dailyLimitMin" | "oneMinuteLimit">,
  today: string,
): number {
  const u = usageToday(usage, today);
  return dailyLimitSec(settings) + u.extraSec - u.usedSec;
}

export function isTimeUp(
  usage: DailyUsage,
  settings: Pick<Settings, "dailyLimitMin" | "oneMinuteLimit">,
  today: string,
): boolean {
  return remainingSec(usage, settings, today) <= 0;
}

/**
 * Seconds to add so the child really gets EXTENSION_SEC more: any time already
 * used past the limit (an episode that finished late) is forgiven first.
 */
export function extensionSec(
  usage: DailyUsage,
  settings: Pick<Settings, "dailyLimitMin" | "oneMinuteLimit">,
  today: string,
): number {
  const remaining = remainingSec(usage, settings, today);
  const overrun = Number.isFinite(remaining) && remaining < 0 ? -remaining : 0;
  return EXTENSION_SEC + overrun;
}

/** Milliseconds until the next midnight in Kigali (UTC+2, no daylight saving). */
export function msUntilKigaliMidnight(now: Date = new Date()): number {
  const day = 24 * 3600 * 1000;
  const kigaliMs = now.getTime() + 2 * 3600 * 1000;
  return day - (((kigaliMs % day) + day) % day);
}
