/**
 * Runs after `next build`: lists every prerendered page and static file to keep
 * offline, then writes public/sw.js from scripts/sw-template.js with that list
 * and a fresh version. Also writes public/build-info.json ({ sha }), which the
 * admin dashboard polls to tell when a save is live.
 *
 * Each entry is [url, revision]. Files whose name already changes with their
 * content (/_next/static) have no revision; everything else gets a short content
 * hash, so after a deploy phones download only the files that really changed.
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

const entries = [];
const hash = createHash("sha256");
const add = (url, file) => {
  const bytes = readFileSync(file);
  const rev = url.startsWith("/_next/static/") ? "" : createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  entries.push([urlPath(url), rev]);
  hash.update(url).update(bytes);
};
const source = (file) => readFileSync(file, "utf8");

// 1. Prerendered pages (the kid app, the parent area and the offline page). Never the admin.
// Locally Next.js leaves each page's HTML in .next/server/app. Vercel's build machines may move
// those files elsewhere; then each page still goes in the list, with this build's id as its
// revision, so phones fetch it again after each deploy (a few small files) instead of the build failing.
const { routes } = JSON.parse(readFileSync(join(nextDir, "prerender-manifest.json"), "utf8"));
const appDir = join(nextDir, "server", "app");
const buildId = existsSync(join(nextDir, "BUILD_ID")) ? source(join(nextDir, "BUILD_ID")).trim() : sha;
const buildRev = createHash("sha256").update(buildId).digest("hex").slice(0, 10);
const missingPages = [];
for (const route of Object.keys(routes).sort()) {
  if (/^\/(_|admin|api)/.test(route)) continue;
  const base = route === "/" ? "index" : route.slice(1);
  const file = [`${base}.html`, `${base}.body`].map((f) => join(appDir, f)).find(existsSync);
  if (file) add(route, file);
  else {
    entries.push([urlPath(route), buildRev]);
    hash.update(route).update(buildRev);
    missingPages.push(route);
  }
}
if (missingPages.length) {
  console.log(`ℹ Service worker: ${missingPages.length} pages have no HTML file in .next; they refresh after every deploy.`);
}
const pageHtml = walk(appDir).filter((f) => f.endsWith(".html"));

// Legacy-browser polyfills (loaded with nomodule): phones that can run the service worker never need them.
const buildManifestPath = join(nextDir, "build-manifest.json");
const polyfills = existsSync(buildManifestPath) ? (JSON.parse(source(buildManifestPath)).polyfillFiles ?? []) : [];
const legacyOnly = new Set([
  ...polyfills.map((f) => `/_next/${f}`),
  ...pageHtml.flatMap((f) => [...source(f).matchAll(/<script src="([^"]+)" noModule/gi)].map((m) => m[1])),
]);

// Chunks that only the admin dashboard uses: children's phones never need them. This needs every
// page's HTML to see what the kid pages load; without it, nothing is left out (safe, just bigger).
const staticRefs = (text) => new Set([...text.matchAll(/\/_next\/static\/[^"'\\\s)]+/g)].map((m) => m[0]));
const manifests = walk(appDir).filter((f) => f.endsWith("_client-reference-manifest.js"));
const isAdmin = (f) => /[\\/]app[\\/]admin([\\/]|$)/.test(f);
const kidRefs = new Set(
  [...manifests.filter((f) => !isAdmin(f)), ...pageHtml].flatMap((f) => [...staticRefs(source(f))]),
);
const adminOnly = new Set(
  missingPages.length
    ? []
    : manifests.filter(isAdmin).flatMap((f) => [...staticRefs(source(f))]).filter((url) => !kidRefs.has(url)),
);

// 2. Versioned JS, CSS and fonts.
for (const file of walk(join(nextDir, "static")).sort()) {
  const url = `/_next/static/${rel(join(nextDir, "static"), file)}`;
  if (url.endsWith(".map") || legacyOnly.has(url) || adminOnly.has(url)) continue;
  // Font subsets for other alphabets load only if such characters ever appear; only preloaded (".p.") ones are kept.
  if (url.startsWith("/_next/static/media/") && url.endsWith(".woff2") && !url.includes(".p.")) continue;
  add(url, file);
}

// Pictures uploaded in the dashboard stay in the repo even when a story stops using them
// (undo, replaced pictures): keep only the ones the content uses now.
const contentText = ["seasons.json", "site.json"].map((f) => source(join(root, "content", f))).join("\n");
const usedUploads = new Set([...contentText.matchAll(/"(\/images\/uploads\/[^"]+)"/g)].map((m) => m[1]));

// 3. Pictures, icons and recordings from public/.
for (const file of walk(publicDir).sort()) {
  const url = `/${rel(publicDir, file)}`;
  if (url.startsWith("/images/uploads/") && !usedUploads.has(url)) continue;
  // build-info.json changes with every deploy and must always come from the network.
  if (url === "/sw.js" || url === "/build-info.json" || url.endsWith("/.gitkeep") || url.endsWith(".map")) continue;
  // The PNG app icons are fetched by the browser when the app is installed, never by a page.
  if (/^\/icons\/.+\.png$/.test(url)) continue;
  add(url, file);
}

const version = hash.digest("hex").slice(0, 12);
const template = readFileSync(templatePath, "utf8");
const sw = template
  .replace('const VERSION = "dev";', `const VERSION = "${version}";`)
  .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(entries)};`);
if (!sw.includes(`const VERSION = "${version}";`) || sw.includes("const PRECACHE = [];")) {
  throw new Error("finalize-sw: could not fill in VERSION / PRECACHE");
}
writeFileSync(swPath, sw);
console.log(
  `✔ Service worker: ${entries.length} files kept for offline use (version ${version}); ${adminOnly.size} admin-only files left out.`,
);
