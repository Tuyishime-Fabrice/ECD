import { describe, expect, it } from "vitest";
import {
  createProgressStore,
  DEFAULT_SETTINGS,
  nextEpisodeProgress,
  resumePosition,
  starsFor,
  type KeyValueStorage,
} from "./progress";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("nextEpisodeProgress", () => {
  it("tracks percent and marks watched at 80%", () => {
    expect(nextEpisodeProgress(undefined, 60, 240, 1)).toEqual({ positionSec: 60, percent: 25, watched: false, updatedAt: 1 });
    expect(nextEpisodeProgress(undefined, 191, 240, 1)).toMatchObject({ percent: 79, watched: false }); // 79.6%
    expect(nextEpisodeProgress(undefined, 192, 240, 1)).toMatchObject({ percent: 80, watched: true });
  });

  it("keeps the furthest percent and stays watched when rewatching", () => {
    const watched = nextEpisodeProgress(undefined, 230, 240, 1);
    const rewatch = nextEpisodeProgress(watched, 10, 240, 2);
    expect(rewatch).toMatchObject({ positionSec: 10, percent: 95, watched: true });
  });

  it("copes with unknown duration", () => {
    expect(nextEpisodeProgress(undefined, 10, 0, 1)).toMatchObject({ percent: 0, watched: false });
  });
});

describe("resumePosition", () => {
  it("resumes from the saved spot", () => {
    expect(resumePosition({ positionSec: 42, percent: 17, watched: false, updatedAt: 0 }, 240)).toBe(42);
  });
  it("starts over near the beginning or the end", () => {
    expect(resumePosition(undefined, 240)).toBe(0);
    expect(resumePosition({ positionSec: 2, percent: 1, watched: false, updatedAt: 0 }, 240)).toBe(0);
    expect(resumePosition({ positionSec: 237, percent: 99, watched: true, updatedAt: 0 }, 240)).toBe(0);
  });
});

describe("starsFor", () => {
  it.each([
    [5, 3],
    [4, 2],
    [3, 2],
    [2, 1],
    [0, 1],
  ])("%i first-try answers → %i stars", (correct, stars) => {
    expect(starsFor(correct)).toBe(stars);
  });
});

describe("localStorage progress store", () => {
  it("starts with defaults (Kinyarwanda, sound on, 20 min)", () => {
    const store = createProgressStore(memoryStorage(), "t:");
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(store.getSettings()).toMatchObject({ language: "rw", soundOn: true, dailyLimitMin: 20 });
  });

  it("persists under the prefix and reloads", () => {
    const storage = memoryStorage();
    const store = createProgressStore(storage, "t:", () => 5);
    store.saveEpisodePosition("s1e1", 120, 240);
    store.updateSettings({ language: "en" });
    expect(Object.keys(storage.data).sort()).toEqual(["t:episodes", "t:settings"]);

    const again = createProgressStore(storage, "t:");
    expect(again.getEpisodeProgress("s1e1")).toEqual({ positionSec: 120, percent: 50, watched: false, updatedAt: 5 });
    expect(again.getSettings().language).toBe("en");
  });

  it("marks an ended episode watched and resets its position", () => {
    const store = createProgressStore(memoryStorage(), "t:");
    store.saveEpisodePosition("s1e1", 100, 240);
    store.markEpisodeEnded("s1e1");
    expect(store.getEpisodeProgress("s1e1")).toMatchObject({ positionSec: 0, percent: 100, watched: true });
  });

  it("records challenges, best stars and awards the sticker once", () => {
    const store = createProgressStore(memoryStorage(), "t:");
    const attempt = (stars: 1 | 2 | 3) => ({ stars, completedAt: 1, questions: [] });
    store.recordChallenge("s1c1", attempt(3));
    store.recordChallenge("s1c1", attempt(1));
    expect(store.getChallengeResult("s1c1")).toMatchObject({ bestStars: 3, attempts: 2, latest: { stars: 1 } });
    expect(store.getStickers()).toEqual(["s1c1"]);
  });

  it("tracks daily usage per date and starts fresh on a new day", () => {
    const store = createProgressStore(memoryStorage(), "t:");
    store.addUsage("2026-10-07", 30);
    store.addUsage("2026-10-07", 30);
    store.addExtraTime("2026-10-07", 600);
    expect(store.getDailyUsage("2026-10-07")).toEqual({ date: "2026-10-07", usedSec: 60, extraSec: 600 });
    expect(store.getDailyUsage("2026-10-08")).toEqual({ date: "2026-10-08", usedSec: 0, extraSec: 0 });
    store.addUsage("2026-10-08", 1);
    expect(store.getDailyUsage("2026-10-08").usedSec).toBe(1);
  });

  it("reset clears progress but keeps settings", () => {
    const storage = memoryStorage();
    const store = createProgressStore(storage, "t:");
    store.updateSettings({ language: "en", unlockAll: true });
    store.saveEpisodePosition("s1e1", 200, 240);
    store.recordChallenge("s1c1", { stars: 2, completedAt: 1, questions: [] });
    store.addUsage("2026-10-07", 10);
    store.resetProgress();
    expect(store.getState()).toMatchObject({ episodes: {}, challenges: {}, stickers: [] });
    expect(store.getSettings()).toMatchObject({ language: "en", unlockAll: true });
    expect(Object.keys(storage.data)).toEqual(["t:settings"]);
  });

  it("notifies subscribers and keeps untouched slices identical", () => {
    const store = createProgressStore(memoryStorage(), "t:");
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    const before = store.getState();
    store.addUsage("2026-10-07", 1);
    expect(calls).toBe(1);
    expect(store.getState().episodes).toBe(before.episodes);
    expect(store.getState().usage).not.toBe(before.usage);
    unsubscribe();
    store.addUsage("2026-10-07", 1);
    expect(calls).toBe(1);
  });

  it("survives corrupt or blocked storage", () => {
    const corrupt = memoryStorage({ "t:episodes": "{not json", "t:settings": '{"language":"fr","dailyLimitMin":99}' });
    const store = createProgressStore(corrupt, "t:");
    expect(store.getState().episodes).toEqual({});
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS);

    const blocked: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {},
    };
    const memoryOnly = createProgressStore(blocked, "t:");
    memoryOnly.saveEpisodePosition("s1e1", 10, 100);
    expect(memoryOnly.getEpisodeProgress("s1e1")?.positionSec).toBe(10);
  });
});
