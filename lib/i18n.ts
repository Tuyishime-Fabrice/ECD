// NEEDS NATIVE REVIEW: the Kinyarwanda (rw) strings are a first draft and must be
// checked by a native speaker before launch. English is the fallback.
// Strings live in lib/messages/, one file per area of the app.
import type { LocalizedText } from "@/content/types";
import * as challenge from "./messages/challenge";
import * as core from "./messages/core";
import * as home from "./messages/home";
import * as parents from "./messages/parents";
import * as watch from "./messages/watch";
import type { Lang } from "./progress";

/** Every message module. Keys must be unique across modules (checked by lib/i18n.test.ts). */
export const MODULES = { core, home, watch, challenge, parents };

const en = { ...core.en, ...home.en, ...watch.en, ...challenge.en, ...parents.en };

export type MessageKey = keyof typeof en;

const rw: Record<MessageKey, string> = { ...core.rw, ...home.rw, ...watch.rw, ...challenge.rw, ...parents.rw };

const messages: Record<Lang, Record<MessageKey, string>> = { rw, en };

export type Vars = Record<string, string | number>;

export function t(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = messages[lang][key] || en[key];
  return vars ? template.replace(/\{(\w+)\}/g, (m, name: string) => String(vars[name] ?? m)) : template;
}

/** Content text in the chosen language, falling back to English when a translation is empty. */
export function pick(text: LocalizedText, lang: Lang): string {
  return lang === "rw" && text.rw.trim() ? text.rw : text.en;
}

export const LANGUAGE_NAMES: Record<Lang, string> = { rw: "Kinyarwanda", en: "English" };
