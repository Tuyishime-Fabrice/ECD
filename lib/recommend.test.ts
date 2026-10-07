import { describe, expect, it } from "vitest";
import type { ChallengeCard, EpisodeCard, SeasonCard } from "@/content/types";
import { DEFAULT_SETTINGS, EMPTY_STATE, type ProgressState } from "./progress";
import { hasStarted, itemStatus, nextAfter, nextRecommended } from "./recommend";
import { isChallengeUnlocked, missingForChallenge } from "./unlock";

const t = { rw: "", en: "" };
const ep = (id: string, number: number): EpisodeCard => ({
  type: "episode", id, number, title: t, thumbnail: "", durationSec: 240, seasonSlug: "s",
});
const ch = (id: string, requires: string[]): ChallengeCard => ({
  type: "challenge", id, number: 1, title: t, sticker: "", seasonSlug: "s", requires,
});

const s1: SeasonCard = {
  id: "s1", slug: "numbers", order: 1, title: t, color: "sky", posterImage: "", status: "published",
  items: [
    ep("e1", 1), ep("e2", 2), ep("e3", 3), ep("e4", 4), ch("c1", ["e1", "e2", "e3", "e4"]),
    ep("e5", 5), ep("e6", 6), ep("e7", 7), ep("e8", 8), ch("c2", ["e5", "e6", "e7", "e8"]),
  ],
};
const soon: SeasonCard = { ...s1, id: "s2", slug: "soon", status: "coming_soon", items: [ep("x1", 1)] };
const seasons = [s1, soon];

function state(watched: string[], extra: Partial<ProgressState> = {}): ProgressState {
  return {
    ...EMPTY_STATE,
    episodes: Object.fromEntries(watched.map((id) => [id, { positionSec: 0, percent: 100, watched: true, updatedAt: 0 }])),
    ...extra,
  };
}
const done = (stars: 1 | 2 | 3) => ({ latest: { stars, completedAt: 0, questions: [] }, bestStars: stars, attempts: 1 });

describe("unlock", () => {
  it("locks a challenge until its 4 episodes are watched", () => {
    expect(isChallengeUnlocked(ch("c1", ["e1", "e2", "e3", "e4"]), state(["e1", "e2", "e3"]))).toBe(false);
    expect(isChallengeUnlocked(ch("c1", ["e1", "e2", "e3", "e4"]), state(["e1", "e2", "e3", "e4"]))).toBe(true);
    expect(missingForChallenge(ch("c1", ["e1", "e2", "e3", "e4"]), state(["e1", "e3"]))).toEqual(["e2", "e4"]);
  });

  it("opens everything with Unlock all", () => {
    const s = state([], { settings: { ...DEFAULT_SETTINGS, unlockAll: true } });
    expect(isChallengeUnlocked(ch("c1", ["e1"]), s)).toBe(true);
  });

  it("does not count a partly watched episode", () => {
    const s = { ...EMPTY_STATE, episodes: { e1: { positionSec: 100, percent: 50, watched: false, updatedAt: 0 } } };
    expect(isChallengeUnlocked(ch("c1", ["e1"]), s)).toBe(false);
  });
});

describe("itemStatus", () => {
  it("describes episodes and challenges", () => {
    const s = state(["e1", "e2", "e3", "e4"], { challenges: { c1: done(2) } });
    s.episodes.e5 = { positionSec: 30, percent: 12, watched: false, updatedAt: 0 };
    expect(itemStatus(ep("e1", 1), s)).toEqual({ type: "episode", watched: true, percent: 100 });
    expect(itemStatus(ep("e5", 5), s)).toEqual({ type: "episode", watched: false, percent: 12 });
    expect(itemStatus(s1.items[4]!, s)).toEqual({ type: "challenge", locked: false, done: true, stars: 2 });
    expect(itemStatus(s1.items[9]!, s)).toEqual({ type: "challenge", locked: true, done: false, stars: 0 });
  });
});

describe("nextRecommended", () => {
  it("starts with episode 1 and knows when the child has started", () => {
    expect(nextRecommended(seasons, EMPTY_STATE)?.id).toBe("e1");
    expect(hasStarted(EMPTY_STATE)).toBe(false);
    expect(hasStarted(state(["e1"]))).toBe(true);
  });

  it("follows the order, offering the challenge once unlocked", () => {
    expect(nextRecommended(seasons, state(["e1", "e2"]))?.id).toBe("e3");
    expect(nextRecommended(seasons, state(["e1", "e2", "e3", "e4"]))?.id).toBe("c1");
    expect(nextRecommended(seasons, state(["e1", "e2", "e3", "e4"], { challenges: { c1: done(1) } }))?.id).toBe("e5");
  });

  it("returns to the first unwatched episode when one was skipped", () => {
    expect(nextRecommended(seasons, state(["e1", "e3", "e4", "e5"]))?.id).toBe("e2");
  });

  it("returns null when everything is done and ignores coming-soon seasons", () => {
    const all = state(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"], { challenges: { c1: done(3), c2: done(3) } });
    expect(nextRecommended(seasons, all)).toBeNull();
  });
});

describe("nextAfter", () => {
  it("gives the next item in order", () => {
    expect(nextAfter(seasons, "e1", state(["e1"]))?.id).toBe("e2");
    expect(nextAfter(seasons, "e4", state(["e1", "e2", "e3", "e4"]))?.id).toBe("c1");
    expect(nextAfter(seasons, "c1", state([]))?.id).toBe("e5");
  });

  it("points to the missing episode instead of a locked challenge", () => {
    expect(nextAfter(seasons, "e4", state(["e1", "e3", "e4"]))?.id).toBe("e2");
  });

  it("has nothing after the last item of the last published season", () => {
    expect(nextAfter(seasons, "c2", state([]))).toBeNull();
  });
});
