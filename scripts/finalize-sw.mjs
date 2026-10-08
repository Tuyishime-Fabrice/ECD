/**
 * Runs after `next build`: writes the list of files to keep offline and a
 * fresh version into out/sw.js.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out/", import.meta.url));
const swPath = join(out, "sw.js");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Legacy-browser polyfills (loaded with nomodule): phones that can run the service worker never need them.
const legacyOnly = new Set(
  [...readFileSync(join(out, "index.html"), "utf8").matchAll(/<script src="([^"]+)" noModule/gi)].map((m) => m[1]),
);

const urls = [];
const hash = createHash("sha256");
for (const file of walk(out).sort()) {
  const rel = relative(out, file).split(sep).join("/");
  if (rel === "sw.js" || rel === "404.html" || rel.endsWith(".map") || rel.startsWith("audio/")) continue;
  // Navigation data (.txt) is cached as pages are visited; offline, Next falls back to the cached HTML.
  if (rel.endsWith(".txt")) continue;
  if (legacyOnly.has(`/${rel}`)) continue;
  if (rel.startsWith("_not-found") || rel.includes("/.gitkeep") || rel === ".gitkeep") continue;
  // Font subsets for other alphabets load only if such characters ever appear; only preloaded (".p.") ones are kept.
  if (rel.startsWith("_next/static/media/") && rel.endsWith(".woff2") && !rel.includes(".p.")) continue;
  hash.update(rel).update(readFileSync(file));
  if (rel.endsWith(".html")) {
    // Clean URLs, as served by Vercel/Netlify: /season/numbers.html → /season/numbers
    const path = rel === "index.html" ? "/" : `/${rel.replace(/(\/index)?\.html$/, "")}`;
    urls.push(path);
  } else {
    urls.push(`/${rel}`);
  }
}

const version = hash.digest("hex").slice(0, 12);
const template = readFileSync(swPath, "utf8");
const sw = template
  .replace('const VERSION = "__VERSION__";', `const VERSION = "${version}";`)
  .replace("const PRECACHE = __PRECACHE__;", `const PRECACHE = ${JSON.stringify(urls)};`);
if (sw.includes('"__VERSION__";') || sw.includes("= __PRECACHE__;")) throw new Error("out/sw.js placeholders not found");
writeFileSync(swPath, sw);
console.log(`✔ Service worker: ${urls.length} files kept for offline use (version ${version}).`);
