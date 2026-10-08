/**
 * Everything the app remembers, stored only on this device.
 *
 * Components talk to the `ProgressStore` interface, never to localStorage
 * directly, so the storage can later be swapped (e.g. for Supabase)
 * without touching any component.
 */

export type Lang = "rw" | "en";
export const DAILY_LIMITS = [0, 15, 20, 30, 45] as const;
/** Minutes per day; 0 means no limit. */
export type DailyLimit = (typeof DAILY_LIMITS)[number];
export type Stars = 1 | 2 | 3;

export type EpisodeProgress = {
  /** Where to resume, in seconds. */
  positionSec: number;
  /** Furthest point reached, 0–100. */
  percent: number;
  watched: boolean;
  updatedAt: number;
};

export type QuestionResult = { questionId: string; skill: string; firstTryCorrect: boolean };
export type ChallengeAttempt = { stars: Stars; completedAt: number; questions: QuestionResult[] };
export type ChallengeResult = { latest: ChallengeAttempt; bestStars: Stars; attempts: number };

export type Settings = {
  language: Lang;
  soundOn: boolean;
  dailyLimitMin: DailyLimit;
  /** Demo mode: open every challenge without watching first. */
  unlockAll: boolean;
  /** Demo mode: a 1-minute daily limit, to show the Time's Up screen. */
  oneMinuteLimit: boolean;
  /** Demo mode: read prompts aloud with the browser voice when no recording exists. */
  placeholderVoice: boolean;
};

export type DailyUsage = {
  /** Local date in Kigali, "YYYY-MM-DD". */
  date: string;
  usedSec: number;
  /** Extra time a parent added for this date. */
  extraSec: number;
};

export type ProgressState = {
  episodes: Record<string, EpisodeProgress>;
  challenges: Record<string, ChallengeResult>;
  /** Challenge ids whose sticker was earned, in the order earned. */
  stickers: string[];
  settings: Settings;
  usage: DailyUsage;
};

export const WATCHED_PERCENT = 80;

export const DEFAULT_SETTINGS: Settings = {
  language: "rw",
  soundOn: true,
  dailyLimitMin: 20,
  unlockAll: false,
  oneMinuteLimit: false,
  placeholderVoice: true,
};

export const EMPTY_STATE: ProgressState = {
  episodes: {},
  challenges: {},
  stickers: [],
  settings: DEFAULT_SETTINGS,
  usage: { date: "", usedSec: 0, extraSec: 0 },
};

export interface ProgressStore {
  /** Current snapshot. Unchanged parts keep the same object identity. */
  getState(): ProgressState;
  subscribe(listener: () => void): () => void;

  getEpisodeProgress(episodeId: string): EpisodeProgress | undefined;
  /** Save the playback position; marks the episode watched at ≥ 80%. */
  saveEpisodePosition(episodeId: string, positionSec: number, durationSec: number): void;
  /** The video reached its end: watched, and the next viewing starts from the beginning. */
  markEpisodeEnded(episodeId: string): void;

  getChallengeResult(challengeId: string): ChallengeResult | undefined;
  /** Save a finished challenge and award its sticker. */
  recordChallenge(challengeId: string, attempt: ChallengeAttempt): void;

  getStickers(): string[];

  getSettings(): Settings;
  updateSettings(patch: Partial<Settings>): void;

  getDailyUsage(date: string): DailyUsage;
  addUsage(date: string, seconds: number): void;
  addExtraTime(date: string, seconds: number): void;

  /** Forget all progress, stickers and usage. Settings are kept. */
  resetProgress(): void;
  /** Re-read storage (e.g. after another tab changed it). */
  reload(): void;
}

/* ---------- Pure helpers (unit tested) ---------- */

export function nextEpisodeProgress(
  prev: EpisodeProgress | undefined,
  positionSec: number,
  durationSec: number,
  now: number,
): EpisodeProgress {
  const pos = Math.max(0, positionSec);
  // Floor, so "watched" means a true 80% (79.6% is not enough).
  const percent = durationSec > 0 ? Math.min(100, Math.floor((pos / durationSec) * 100)) : 0;
  const best = Math.max(prev?.percent ?? 0, percent);
  return {
    positionSec: pos,
    percent: best,
    watched: (prev?.watched ?? false) || best >= WATCHED_PERCENT,
    updatedAt: now,
  };
}

/** Where to start playing: the saved spot, unless it's too close to either end. */
export function resumePosition(progress: EpisodeProgress | undefined, durationSec: number): number {
  const pos = progress?.positionSec ?? 0;
  if (pos < 3) return 0;
  if (durationSec > 0 && pos > durationSec - 5) return 0;
  return pos;
}

export function starsFor(firstTryCorrect: number): Stars {
  if (firstTryCorrect >= 5) return 3;
  if (firstTryCorrect >= 3) return 2;
  return 1;
}

/* ---------- localStorage implementation ---------- */

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Slice = keyof ProgressState;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function sanitizeSettings(v: unknown): Settings {
  if (!isObject(v)) return DEFAULT_SETTINGS;
  const s = { ...DEFAULT_SETTINGS };
  if (v.language === "rw" || v.language === "en") s.language = v.language;
  if (typeof v.soundOn === "boolean") s.soundOn = v.soundOn;
  if ((DAILY_LIMITS as readonly unknown[]).includes(v.dailyLimitMin)) s.dailyLimitMin = v.dailyLimitMin as DailyLimit;
  if (typeof v.unlockAll === "boolean") s.unlockAll = v.unlockAll;
  if (typeof v.oneMinuteLimit === "boolean") s.oneMinuteLimit = v.oneMinuteLimit;
  if (typeof v.placeholderVoice === "boolean") s.placeholderVoice = v.placeholderVoice;
  return s;
}

function sanitizeUsage(v: unknown): DailyUsage {
  if (!isObject(v) || typeof v.date !== "string") return EMPTY_STATE.usage;
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : 0);
  return { date: v.date, usedSec: n(v.usedSec), extraSec: n(v.extraSec) };
}

export function createProgressStore(
  storage: KeyValueStorage | null,
  prefix: string,
  now: () => number = Date.now,
): ProgressStore {
  const listeners = new Set<() => void>();

  const read = (key: Slice): unknown => {
    try {
      const text = storage?.getItem(prefix + key);
      return text ? JSON.parse(text) : undefined;
    } catch {
      return undefined;
    }
  };

  const load = (): ProgressState => {
    const episodes = read("episodes");
    const challenges = read("challenges");
    const stickers = read("stickers");
    return {
      episodes: isObject(episodes) ? (episodes as ProgressState["episodes"]) : {},
      challenges: isObject(challenges) ? (challenges as ProgressState["challenges"]) : {},
      stickers: Array.isArray(stickers) ? stickers.filter((s): s is string => typeof s === "string") : [],
      settings: sanitizeSettings(read("settings")),
      usage: sanitizeUsage(read("usage")),
    };
  };

  let state = load();

  const emit = () => listeners.forEach((l) => l());

  function update<K extends Slice>(key: K, value: ProgressState[K]) {
    state = { ...state, [key]: value };
    try {
      storage?.setItem(prefix + key, JSON.stringify(value));
    } catch {
      // Storage full or blocked (private mode): keep working in memory.
    }
    emit();
  }

  const usageFor = (date: string): DailyUsage =>
    state.usage.date === date ? state.usage : { date, usedSec: 0, extraSec: 0 };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getEpisodeProgress: (id) => state.episodes[id],
    saveEpisodePosition(id, positionSec, durationSec) {
      const next = nextEpisodeProgress(state.episodes[id], positionSec, durationSec, now());
      update("episodes", { ...state.episodes, [id]: next });
    },
    markEpisodeEnded(id) {
      update("episodes", {
        ...state.episodes,
        [id]: { positionSec: 0, percent: 100, watched: true, updatedAt: now() },
      });
    },

    getChallengeResult: (id) => state.challenges[id],
    recordChallenge(id, attempt) {
      const prev = state.challenges[id];
      const result: ChallengeResult = {
        latest: attempt,
        bestStars: Math.max(prev?.bestStars ?? 1, attempt.stars) as Stars,
        attempts: (prev?.attempts ?? 0) + 1,
      };
      update("challenges", { ...state.challenges, [id]: result });
      if (!state.stickers.includes(id)) update("stickers", [...state.stickers, id]);
    },

    getStickers: () => state.stickers,

    getSettings: () => state.settings,
    updateSettings(patch) {
      update("settings", sanitizeSettings({ ...state.settings, ...patch }));
    },

    getDailyUsage: usageFor,
    addUsage(date, seconds) {
      const u = usageFor(date);
      update("usage", { ...u, usedSec: u.usedSec + seconds });
    },
    addExtraTime(date, seconds) {
      const u = usageFor(date);
      update("usage", { ...u, extraSec: u.extraSec + seconds });
    },

    resetProgress() {
      for (const key of ["episodes", "challenges", "stickers", "usage"] as const) {
        try {
          storage?.removeItem(prefix + key);
        } catch {
          // ignore
        }
      }
      state = { ...EMPTY_STATE, settings: state.settings };
      emit();
    },
    reload() {
      state = load();
      emit();
    },
  };
}
