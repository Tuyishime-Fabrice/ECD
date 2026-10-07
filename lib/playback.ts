import type { PausePoint } from "@/content/types";

/**
 * Pause points already behind the starting position count as done, so a
 * child resuming at 1:30 isn't asked the 0:20 question again. A question
 * left unanswered (position saved right at it) is asked again.
 */
export function initialTriggered(points: PausePoint[], startSec: number): Set<number> {
  const done = new Set<number>();
  points.forEach((p, i) => {
    if (p.atSec < startSec - 1) done.add(i);
  });
  return done;
}

/** Index of the pause point to show now, or null. Each one fires once per viewing. */
export function duePausePoint(points: PausePoint[], currentSec: number, triggered: Set<number>): number | null {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p && !triggered.has(i) && currentSec >= p.atSec) return i;
  }
  return null;
}

/** YouTube reports 0 until the video's metadata loads; fall back to the content's duration. */
export function effectiveDuration(playerDuration: number, contentDuration: number): number {
  return playerDuration > 0 ? playerDuration : contentDuration;
}
