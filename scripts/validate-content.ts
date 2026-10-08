/**
 * Checks content/seasons.json before every build (`npm run validate`).
 * Stops the build with a numbered, plain-language list of problems.
 */
import { existsSync, readFileSync } from "node:fs";
import { validateContent } from "../content/validate.ts";

const root = new URL("../", import.meta.url);
const FILE = "content/seasons.json";
const color = process.stdout.isTTY;
const red = (s: string) => (color ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s: string) => (color ? `\x1b[33m${s}\x1b[0m` : s);
const green = (s: string) => (color ? `\x1b[32m${s}\x1b[0m` : s);

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(new URL(FILE, root), "utf8"));
} catch (err) {
  console.error(red(`\n✖ ${FILE} is not valid JSON.`));
  console.error(`  ${(err as Error).message}`);
  console.error("  Common causes: a missing comma, a comma after the last item, or a missing quote.\n");
  process.exit(1);
}

const result = validateContent(raw, (publicPath) => existsSync(new URL(`public${publicPath}`, root)));

for (const w of result.warnings) console.warn(yellow(`⚠ ${w}`));

if (result.missingAudio.length) {
  console.warn(
    yellow(
      `⚠ ${result.missingAudio.length} audio file(s) are not recorded yet. ` +
        "The app reads the English text aloud instead (demo mode). Missing files:",
    ),
  );
  for (const f of result.missingAudio) console.warn(yellow(`   - public${f}`));
}

if (!result.ok) {
  console.error(red(`\n✖ Found ${result.errors.length} problem(s) in ${FILE}:\n`));
  result.errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  console.error(red("\nFix these and run the build again.\n"));
  process.exit(1);
}

const seasons = result.content.seasons;
const episodes = seasons.flatMap((s) => s.items.filter((i) => i.type === "episode")).length;
const challenges = seasons.flatMap((s) => s.items.filter((i) => i.type === "challenge")).length;
console.log(green(`✔ ${FILE} is valid: ${seasons.length} seasons, ${episodes} episodes, ${challenges} challenges.`));
