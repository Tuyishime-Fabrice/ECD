"use client";

import type { LocalizedText } from "@/content/types";
import type { MessageKey, Vars } from "@/lib/i18n";
import { usePick, useT } from "@/lib/store";

/** A UI string in the current language, for use inside Server Components. */
export function T({ k, vars }: { k: MessageKey; vars?: Vars }) {
  const t = useT();
  return <>{t(k, vars)}</>;
}

/** Content text (LocalizedText) in the current language. */
export function L({ text }: { text: LocalizedText }) {
  const pick = usePick();
  return <>{pick(text)}</>;
}
