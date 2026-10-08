import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type DailyUsage } from "./progress";
import { dailyLimitSec, extensionSec, isTimeUp, kigaliDate, msUntilKigaliMidnight, remainingSec } from "./timer";
import { skillStatuses } from "./skills";

describe("kigaliDate", () => {
  it("uses Kigali time (UTC+2), not the device's UTC date", () => {
    expect(kigaliDate(new Date("2026-10-07T21:59:00Z"))).toBe("2026-10-07");
    expect(kigaliDate(new Date("2026-10-07T22:00:00Z"))).toBe("2026-10-08");
    expect(kigaliDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});

describe("daily limit", () => {
  const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, ...patch });
  const usage = (usedSec: number, extraSec = 0, date = "2026-10-07"): DailyUsage => ({ date, usedSec, extraSec });

  it("converts minutes; Off means no limit; demo forces 1 minute", () => {
    expect(dailyLimitSec(settings())).toBe(20 * 60);
    expect(dailyLimitSec(settings({ dailyLimitMin: 45 }))).toBe(45 * 60);
    expect(dailyLimitSec(settings({ dailyLimitMin: 0 }))).toBe(Infinity);
    expect(dailyLimitSec(settings({ dailyLimitMin: 0, oneMinuteLimit: true }))).toBe(60);
  });

  it("is up once today's usage reaches the limit", () => {
    expect(isTimeUp(usage(1199), settings(), "2026-10-07")).toBe(false);
    expect(isTimeUp(usage(1200), settings(), "2026-10-07")).toBe(true);
    expect(isTimeUp(usage(99999), settings({ dailyLimitMin: 0 }), "2026-10-07")).toBe(false);
  });

  it("adds the parent's extra 10 minutes", () => {
    expect(remainingSec(usage(1200, 600), settings(), "2026-10-07")).toBe(600);
    expect(isTimeUp(usage(1200, 600), settings(), "2026-10-07")).toBe(false);
  });

  it("resets on a new Kigali day", () => {
    expect(isTimeUp(usage(5000, 0, "2026-10-06"), settings(), "2026-10-07")).toBe(false);
    expect(remainingSec(usage(5000, 600, "2026-10-06"), settings(), "2026-10-07")).toBe(1200);
  });
});

describe("extensionSec", () => {
  const settings = { ...DEFAULT_SETTINGS }; // 20 min
  it("gives 10 minutes when time is up exactly", () => {
    expect(extensionSec({ date: "d", usedSec: 1200, extraSec: 0 }, settings, "d")).toBe(600);
  });
  it("forgives an episode that ran past the limit, so 10 minutes remain", () => {
    const usage = { date: "d", usedSec: 1200 + 250, extraSec: 0 };
    const extra = extensionSec(usage, settings, "d");
    expect(remainingSec({ ...usage, extraSec: extra }, settings, "d")).toBe(600);
  });
  it("just adds 10 minutes when time remains or there is no limit", () => {
    expect(extensionSec({ date: "d", usedSec: 100, extraSec: 0 }, settings, "d")).toBe(600);
    expect(extensionSec({ date: "d", usedSec: 99999, extraSec: 0 }, { ...settings, dailyLimitMin: 0 }, "d")).toBe(600);
  });
});

describe("msUntilKigaliMidnight", () => {
  it("counts down to 22:00 UTC (midnight in Kigali)", () => {
    expect(msUntilKigaliMidnight(new Date("2026-10-07T21:59:00Z"))).toBe(60 * 1000);
    expect(msUntilKigaliMidnight(new Date("2026-10-07T22:00:00Z"))).toBe(24 * 3600 * 1000);
    expect(msUntilKigaliMidnight(new Date("2026-10-08T10:00:00Z"))).toBe(12 * 3600 * 1000);
  });
});

describe("skillStatuses", () => {
  const attempt = (questions: [string, boolean][]) => ({
    latest: { stars: 1 as const, completedAt: 0, questions: questions.map(([skill, ok], i) => ({ questionId: `q${i}`, skill, firstTryCorrect: ok })) },
    bestStars: 1 as const,
    attempts: 1,
  });

  it("marks mastered, practicing and not started from the latest attempts", () => {
    const statuses = skillStatuses(["count", "numerals", "match", "later"], {
      c1: attempt([["count", true], ["count", true], ["numerals", false], ["match", true], ["match", false]]),
    });
    expect(statuses).toEqual({ count: "mastered", numerals: "practicing", match: "practicing", later: "not_started" });
  });

  it("combines a skill that appears in several challenges", () => {
    expect(skillStatuses(["count"], { a: attempt([["count", true]]), b: attempt([["count", false]]) })).toEqual({ count: "practicing" });
    expect(skillStatuses(["count"], { a: attempt([["count", true]]), b: attempt([["count", true]]) })).toEqual({ count: "mastered" });
  });
});
