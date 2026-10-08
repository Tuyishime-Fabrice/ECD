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

// "#", "?" and "%" mean something in a URL: escape them so files named with them still load.
const urlPath = (p) => p.replace(/[%#?]/g, (c) => encodeURIComponent(c));

const urls = [];
const hash = createHash("sha256");
for (const file of walk(out).sort()) {
  const rel = relative(out, file).split(sep).join("/");
  if (rel === "sw.js" || rel === "404.html" || rel.endsWith(".map")) continue;
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
    urls.push(urlPath(path));
  } else {
    urls.push(urlPath(`/${rel}`));
  }
}

const version = hash.digest("hex").slice(0, 12);
const template = readFileSync(swPath, "utf8");
const sw = template
  .replace('const VERSION = "dev";', `const VERSION = "${version}";`)
  .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(urls)};`);
if (!sw.includes(`const VERSION = "${version}";`) || sw.includes("const PRECACHE = [];")) {
  throw new Error("out/sw.js: could not fill in VERSION / PRECACHE");
}
writeFileSync(swPath, sw);
console.log(`✔ Service worker: ${urls.length} files kept for offline use (version ${version}).`);
