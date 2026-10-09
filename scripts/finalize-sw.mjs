/**
 * Runs after `next build`: lists every prerendered page and static file to keep
 * offline, then writes public/sw.js from scripts/sw-template.js with that list
 * and a fresh version. Also writes public/build-info.json ({ sha }), which the
 * admin dashboard polls to tell when a save is live.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const nextDir = join(root, ".next");
const publicDir = join(root, "public");
const swPath = join(publicDir, "sw.js");
const buildInfoPath = join(publicDir, "build-info.json");
const templatePath = join(root, "scripts", "sw-template.js");

function commitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
    return sha.toString().trim() || "dev";
  } catch {
    return "dev";
  }
}
const sha = commitSha();
writeFileSync(buildInfoPath, `${JSON.stringify({ sha })}\n`);
console.log(`✔ Build info: ${sha}`);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const rel = (from, file) => relative(from, file).split(sep).join("/");
// "#", "?" and "%" mean something in a URL: escape them so files named with them still load.
const urlPath = (p) => p.replace(/[%#?]/g, (c) => encodeURIComponent(c));

const urls = [];
const hash = createHash("sha256");
const add = (url, file) => {
  urls.push(urlPath(url));
  hash.update(url).update(readFileSync(file));
};

// 1. Prerendered pages (the kid app, the parent area and the offline page). Never the admin.
const { routes } = JSON.parse(readFileSync(join(nextDir, "prerender-manifest.json"), "utf8"));
const appDir = join(nextDir, "server", "app");
for (const route of Object.keys(routes).sort()) {
  if (/^\/(_|admin|api)/.test(route)) continue;
  const base = route === "/" ? "index" : route.slice(1);
  const file = [`${base}.html`, `${base}.body`].map((f) => join(appDir, f)).find(existsSync);
  if (!file) throw new Error(`finalize-sw: no prerendered file for ${route}`);
  add(route, file);
}

// Legacy-browser polyfills (loaded with nomodule): phones that can run the service worker never need them.
const legacyOnly = new Set(
  [...readFileSync(join(appDir, "index.html"), "utf8").matchAll(/<script src="([^"]+)" noModule/gi)].map((m) => m[1]),
);

// 2. Versioned JS, CSS and fonts.
for (const file of walk(join(nextDir, "static")).sort()) {
  const url = `/_next/static/${rel(join(nextDir, "static"), file)}`;
  if (url.endsWith(".map") || legacyOnly.has(url)) continue;
  // Font subsets for other alphabets load only if such characters ever appear; only preloaded (".p.") ones are kept.
  if (url.startsWith("/_next/static/media/") && url.endsWith(".woff2") && !url.includes(".p.")) continue;
  add(url, file);
}

// 3. Pictures, icons and recordings from public/.
for (const file of walk(publicDir).sort()) {
  const url = `/${rel(publicDir, file)}`;
  // build-info.json changes with every deploy and must always come from the network.
  if (url === "/sw.js" || url === "/build-info.json" || url.endsWith("/.gitkeep") || url.endsWith(".map")) continue;
  add(url, file);
}

const version = hash.digest("hex").slice(0, 12);
const template = readFileSync(templatePath, "utf8");
const sw = template
  .replace('const VERSION = "dev";', `const VERSION = "${version}";`)
  .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(urls)};`);
if (!sw.includes(`const VERSION = "${version}";`) || sw.includes("const PRECACHE = [];")) {
  throw new Error("finalize-sw: could not fill in VERSION / PRECACHE");
}
writeFileSync(swPath, sw);
console.log(`✔ Service worker: ${urls.length} files kept for offline use (version ${version}).`);
