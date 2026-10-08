import { describe, expect, it } from "vitest";
import type { PausePoint, Question } from "@/content/types";
import { duePausePoint, effectiveDuration, initialTriggered } from "./playback";

const q = {} as Question;
const points: PausePoint[] = [
  { atSec: 20, question: q },
  { atSec: 90, question: q },
];

describe("pause points", () => {
  it("fires each point once when the time passes it", () => {
    const triggered = new Set<number>();
    expect(duePausePoint(points, 19.5, triggered)).toBeNull();
    expect(duePausePoint(points, 20.1, triggered)).toBe(0);
    triggered.add(0);
    expect(duePausePoint(points, 40, triggered)).toBeNull();
    expect(duePausePoint(points, 91, triggered)).toBe(1);
  });

  it("fires a skipped-over point after seeking forward", () => {
    expect(duePausePoint(points, 120, new Set())).toBe(0);
  });

  it("skips points already passed when resuming", () => {
    expect([...initialTriggered(points, 0)]).toEqual([]);
    expect([...initialTriggered(points, 60)]).toEqual([0]);
    expect([...initialTriggered(points, 200)]).toEqual([0, 1]);
  });

  it("asks again when the child left while the question was showing", () => {
    expect([...initialTriggered(points, 20.4)]).toEqual([]);
  });
});

describe("effectiveDuration", () => {
  it("prefers the player's duration", () => {
    expect(effectiveDuration(185.2, 240)).toBe(185.2);
    expect(effectiveDuration(0, 240)).toBe(240);
  });
});
