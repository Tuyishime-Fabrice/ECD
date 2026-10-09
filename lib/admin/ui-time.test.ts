import { describe, expect, it } from "vitest";
import { formatClock, friendlyDate, parseClock, timeAgo } from "./ui-time";

describe("parseClock", () => {
  it("reads minutes:seconds", () => {
    expect(parseClock("4:05")).toBe(245);
    expect(parseClock("0:20")).toBe(20);
    expect(parseClock(" 12:00 ")).toBe(720);
    expect(parseClock("4 : 30")).toBe(270);
  });
  it("reads hours:minutes:seconds", () => {
    expect(parseClock("1:02:03")).toBe(3723);
  });
  it("accepts a dot as the separator", () => {
    expect(parseClock("4.30")).toBe(270);
  });
  it("refuses anything else", () => {
    for (const text of ["", "20", "4:", ":30", "4:60", "1:60:00", "a:bc", "4:05:06:07", "-1:00", "4:5x"]) {
      expect(parseClock(text), text).toBeNull();
    }
  });
});

describe("formatClock", () => {
  it("writes minutes:seconds, and hours when needed", () => {
    expect(formatClock(245)).toBe("4:05");
    expect(formatClock(20)).toBe("0:20");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(251.6)).toBe("4:12");
    expect(formatClock(-3)).toBe("0:00");
  });
  it("round-trips with parseClock", () => {
    for (const s of [0, 59, 60, 245, 3599, 3600, 7322]) expect(parseClock(formatClock(s))).toBe(s);
  });
});

describe("friendly dates", () => {
  const now = new Date(2026, 9, 9, 15, 30);
  it("says today, yesterday, or the date", () => {
    expect(friendlyDate(new Date(2026, 9, 9, 9, 5).toISOString(), now)).toBe("Today at 09:05");
    expect(friendlyDate(new Date(2026, 9, 8, 22, 0).toISOString(), now)).toBe("Yesterday at 22:00");
    expect(friendlyDate(new Date(2026, 9, 3, 10, 0).toISOString(), now)).toBe("3 Oct at 10:00");
    expect(friendlyDate(new Date(2025, 9, 3, 10, 0).toISOString(), now)).toBe("3 Oct 2025 at 10:00");
    expect(friendlyDate("not a date", now)).toBe("");
  });
  it("counts recent minutes and hours", () => {
    expect(timeAgo(new Date(2026, 9, 9, 15, 29, 40).toISOString(), now)).toBe("just now");
    expect(timeAgo(new Date(2026, 9, 9, 15, 29).toISOString(), now)).toBe("1 minute ago");
    expect(timeAgo(new Date(2026, 9, 9, 15, 10).toISOString(), now)).toBe("20 minutes ago");
    expect(timeAgo(new Date(2026, 9, 9, 13, 30).toISOString(), now)).toBe("2 hours ago");
    expect(timeAgo(new Date(2026, 9, 8, 10, 0).toISOString(), now)).toBe("Yesterday at 10:00");
  });
});
