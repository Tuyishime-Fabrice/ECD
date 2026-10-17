import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * WCAG contrast for the color pairs the admin dashboard uses (components/admin),
 * in both themes, read from the real tokens in app/globals.css. The app-wide pairs
 * are in lib/contrast.test.ts; these are the dashboard's own.
 */
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function themeTokens(name: "light" | "dark"): Record<string, string> {
  const block = css.match(new RegExp(`/\\* theme:${name} \\*/([\\s\\S]*?)/\\* end \\*/`))?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(theme: Record<string, string>, fg: string, bg: string): number {
  expect(theme[fg], `missing --c-${fg}`).toBeDefined();
  expect(theme[bg], `missing --c-${bg}`).toBeDefined();
  const a = luminance(theme[fg]!);
  const b = luminance(theme[bg]!);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Text (AA 4.5:1).
const text: [string, string][] = [
  ["on-accent", "brand-strong"], // primary buttons, step numbers, the unsaved-changes bar
  ["on-accent", "play-lip"], // the careful "Delete" button in confirm dialogs
  ["brand", "brand-soft"], // active menu item, info badges
  ["brand", "paper"], // links, icons on cards
  ["brand", "paper-2"],
  ["ink", "brand-soft"], // info notices
  ["ink-2", "brand-soft"],
  ["ink-2", "sun-soft"], // warning notices
  ["ink-2", "coral-soft"], // problem notices
  ["ink-2", "leaf-soft"],
  ["leaf-ink", "leaf-soft"], // "Live" badges
  ["play-ink", "paper"], // problems under fields
  ["play-ink", "coral-soft"],
  ["ink-3", "paper"], // "Optional", eyebrows, menu group names
  ["ink-3", "paper-2"],
  ["ink-2", "paper-2"], // neutral and "Coming soon" badges
];
// Focus outline, icons and status dots (AA 3:1 for non-text).
const nonText: [string, string][] = [
  ["brand", "paper"],
  ["brand", "ground"],
  ["brand", "paper-2"],
  ["brand", "brand-soft"],
  ["sun-ink", "sun"], // gift icon on the mustard chip
];

describe.each(["light", "dark"] as const)("dashboard colors, %s theme", (name) => {
  const theme = themeTokens(name);
  it.each(text)("%s text on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(nonText)("%s on %s is at least 3:1", (fg, bg) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

// The white Save button on the teal bar: white by day, cream (ink) at night, with brand-strong text.
describe("Save button on the unsaved-changes bar", () => {
  it("is readable by day", () => {
    expect(ratio(themeTokens("light"), "brand-strong", "paper")).toBeGreaterThanOrEqual(4.5);
  });
  it("is readable at night", () => {
    expect(ratio(themeTokens("dark"), "brand-strong", "ink")).toBeGreaterThanOrEqual(4.5);
  });
});
