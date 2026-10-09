import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * WCAG AA contrast check for every text/background pair the app uses.
 * Reads the real tokens from app/globals.css, so changing a color there
 * re-runs this check.
 */
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z]+-?\d*):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
) as Record<string, string>;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string): number {
  const a = luminance(tokens[fg] ?? fg);
  const b = luminance(tokens[bg] ?? bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// [text, background] pairs used for normal-size text (AA: 4.5:1).
const normalText: [string, string][] = [
  ["ink-900", "cream-50"],
  ["ink-900", "white"],
  ["ink-900", "sun-400"],
  ["ink-900", "sun-100"],
  ["ink-900", "sky-100"],
  ["ink-900", "sky-500"],
  ["ink-900", "coral-400"],
  ["ink-900", "coral-100"],
  ["ink-900", "leaf-100"],
  ["ink-900", "leaf-500"],
  ["ink-900", "grape-100"],
  ["ink-900", "mist-100"],
  ["ink-900", "mist-300"],
  ["ink-600", "cream-50"],
  ["ink-600", "white"],
  ["white", "sky-700"],
  ["white", "leaf-700"],
  ["white", "grape-700"],
  ["white", "ink-900"],
  ["sky-700", "white"],
  ["sky-700", "cream-50"],
  ["leaf-700", "white"],
  ["leaf-700", "leaf-100"],
  ["grape-700", "white"],
  ["grape-700", "grape-100"],
];

describe("color contrast (WCAG AA)", () => {
  it("found the design tokens", () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(15);
  });

  it.each(normalText)("%s text on %s is at least 4.5:1", (fg, bg) => {
    expect(tokens[fg], `missing token ${fg}`).toBeDefined();
    expect(tokens[bg], `missing token ${bg}`).toBeDefined();
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * Storybook World tokens: every text pair is checked in BOTH themes
 * (day = light, night = dark), read from the theme:light / theme:dark blocks.
 */
function themeTokens(name: "light" | "dark"): Record<string, string> {
  const block = css.match(new RegExp(`/\\* theme:${name} \\*/([\\s\\S]*?)/\\* end \\*/`))?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

function pairRatio(theme: Record<string, string>, fg: string, bg: string): number {
  const a = luminance(theme[fg]!);
  const b = luminance(theme[bg]!);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Normal-size text (AA 4.5:1).
const themedText: [string, string][] = [
  ["ink", "paper"],
  ["ink", "paper-2"],
  ["ink", "ground"],
  ["ink", "sun-soft"],
  ["ink", "coral-soft"],
  ["ink-2", "paper"],
  ["ink-2", "paper-2"],
  ["ink-2", "ground"],
  ["ink-3", "paper"],
  ["ink-3", "paper-2"],
  ["sun-ink", "sun"],
  ["play-ink", "paper"],
  ["play-ink", "paper-2"],
  ["listen-ink", "paper"],
  ["leaf-ink", "leaf-soft"],
  ["leaf-ink", "paper"],
  ["berry-ink", "berry-soft"],
  ["berry-ink", "paper"],
  ["coral-ink", "coral"],
];
// Icons and large bold text on solid accent buttons (AA 3:1).
const themedLarge: [string, string][] = [
  ["on-accent", "play"],
  ["on-accent", "listen"],
  ["on-accent", "leaf"],
  ["on-accent", "berry"],
];

describe.each(["light", "dark"] as const)("Storybook tokens, %s theme", (name) => {
  const theme = themeTokens(name);
  it("found the theme block", () => {
    expect(Object.keys(theme).length).toBeGreaterThan(25);
  });
  it.each(themedText)("%s text on %s is at least 4.5:1", (fg, bg) => {
    expect(theme[fg], `missing --c-${fg}`).toBeDefined();
    expect(theme[bg], `missing --c-${bg}`).toBeDefined();
    expect(pairRatio(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(themedLarge)("%s icons on %s are at least 3:1", (fg, bg) => {
    expect(pairRatio(theme, fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
