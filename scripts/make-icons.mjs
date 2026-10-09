/**
 * Renders the PNG app icons from public/icons/logo.svg: Izuba rising over a green hill in the
 * sunrise sky (re-run after changing the logo). Needs Playwright, which is not a project
 * dependency:
 *
 *   npm i --no-save playwright && node scripts/make-icons.mjs
 *
 * or, with Playwright installed elsewhere:
 *
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/make-icons.mjs
 *
 * Set CHROMIUM=/path/to/chrome to use an existing browser binary.
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = readFileSync(join(root, "public/icons/logo.svg"), "utf8");
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;

const ICONS = [
  // [file, size, logo size as share of the icon, corner radius as share (0 = full bleed)]
  ["icon-192.png", 192, 0.7, 0.22],
  ["icon-512.png", 512, 0.7, 0.22],
  // Launchers crop maskable icons to a circle or squircle: the logo stays inside the
  // central safe zone (a circle 80% wide), and the sky fills everything to the edges.
  ["icon-maskable-512.png", 512, 0.6, 0],
  // iOS rounds the corners itself and shows transparency as black, so this one is opaque.
  ["apple-touch-icon.png", 180, 0.7, 0],
];

/** The sunrise sky, glow and hills of the app's day scenes (scripts/art/lib.mjs, DAY). */
function iconHtml(size, share, radius) {
  const logoSize = Math.round(size * share);
  const top = Math.round(size * 0.44 - logoSize / 2);
  return `<body style="margin:0;background:transparent">
    <div style="position:relative;width:${size}px;height:${size}px;overflow:hidden;border-radius:${radius * 100}%;
      background:linear-gradient(180deg,#9FD6F0 0%,#D6EEF1 34%,#FFE5C2 64%,#FFD49E 100%)">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 44%,#FFF6D2 0,rgba(255,233,176,.8) 26%,rgba(255,224,166,0) 52%)"></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
        <path d="M0 82C18 76 34 79 50 82C66 85 82 78 100 80V100H0Z" fill="#B9D89A"/>
        <path d="M0 90C20 85 40 86 58 89C74 92 88 88 100 87V100H0Z" fill="#6BB862"/>
        <path d="M6 94C22 90 40 91 56 93" fill="none" stroke="#8FCB7F" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <img src="${dataUrl}" width="${logoSize}" height="${logoSize}" style="position:absolute;left:${Math.round((size - logoSize) / 2)}px;top:${top}px">
    </div></body>`;
}

const pwModule = process.env.PLAYWRIGHT_MODULE;
const pwEntry = pwModule && statSync(pwModule).isDirectory() ? join(pwModule, "index.mjs") : pwModule;
const { chromium } = await import(pwEntry ? pathToFileURL(pwEntry).href : "playwright");
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [file, size, share, radius] of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(iconHtml(size, share, radius));
  await page.screenshot({ path: join(root, "public/icons", file), omitBackground: radius > 0 });
  console.log(`public/icons/${file}`);
}
await browser.close();
