/**
 * React hooks over the device progress store. Client components only.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { brand } from "./brand";
import { t, pick, type MessageKey, type Vars } from "./i18n";
import { createProgressStore, EMPTY_STATE, type ProgressState, type ProgressStore } from "./progress";
import type { LocalizedText } from "@/content/types";

let store: ProgressStore | undefined;

export function getStore(): ProgressStore {
  if (store) return store;
  if (typeof window === "undefined") return createProgressStore(null, brand.storagePrefix);
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    // Blocked storage: progress lives in memory for this visit.
  }
  const created = createProgressStore(storage, brand.storagePrefix);
  window.addEventListener("storage", (e) => {
    if (!e.key || e.key.startsWith(brand.storagePrefix)) created.reload();
  });
  store = created;
  return created;
}

/**
 * Subscribe to part of the progress state. `select` must return a slice of
 * the state or a primitive (never a new object), so React can compare it.
 * During prerender and hydration this returns the default (empty) state.
 */
export function useProgress<T>(select: (s: ProgressState) => T): T {
  const s = getStore();
  return useSyncExternalStore(
    s.subscribe,
    () => select(s.getState()),
    () => select(EMPTY_STATE),
  );
}

export const useSettings = () => useProgress((s) => s.settings);
export const useLang = () => useProgress((s) => s.settings.language);

export function useT() {
  const lang = useLang();
  return useCallback((key: MessageKey, vars?: Vars) => t(lang, key, vars), [lang]);
}

export function usePick() {
  const lang = useLang();
  return useCallback((text: LocalizedText) => pick(text, lang), [lang]);
}

const noopSubscribe = () => () => {};
/** False during prerender/hydration, true once running in the browser. */
export const useHydrated = () =>
  useSyncExternalStore(noopSubscribe, () => true, () => false);

/** The parts of progress that decide badges, locks and recommendations. */
export function useLearningState() {
  const episodes = useProgress((s) => s.episodes);
  const challenges = useProgress((s) => s.challenges);
  const settings = useProgress((s) => s.settings);
  return useMemo(() => ({ episodes, challenges, settings }), [episodes, challenges, settings]);
}
