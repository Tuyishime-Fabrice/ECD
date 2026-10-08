/**
 * "Immersive" screens (video playing, a question showing) ask the top bar to
 * step aside on phones held sideways, where every pixel of height counts.
 */
import { useEffect, useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Mark the current screen immersive while `active` is true. */
export function useImmersive(active: boolean) {
  useEffect(() => {
    if (!active) return;
    count += 1;
    emit();
    return () => {
      count -= 1;
      emit();
    };
  }, [active]);
}

export const useIsImmersive = () =>
  useSyncExternalStore(subscribe, () => count > 0, () => false);
