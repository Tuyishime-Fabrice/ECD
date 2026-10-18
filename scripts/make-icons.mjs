/**
 * Renders the PNG app icons from public/brand/mark.png: the official CED Imuhira mark on a cream tile
 * (re-run after changing the logo). Needs Playwright, which is not a project
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
// The mark cut from the official logo (scripts/brand/prepare-logo.py), placed as is.
const logo = readFileSync(join(root, "public/brand/mark.png"));
const dataUrl = `data:image/png;base64,${logo.toString("base64")}`;

const ICONS = [
  // [file, size, logo size as share of the icon, corner radius as share (0 = full bleed)]
  ["icon-192.png", 192, 0.72, 0.22],
  ["icon-512.png", 512, 0.72, 0.22],
  // Launchers crop maskable icons to a circle or squircle: the logo stays inside the
  // central safe zone (a circle 80% wide), and the cream fills everything to the edges.
  ["icon-maskable-512.png", 512, 0.6, 0],
  // iOS rounds the corners itself and shows transparency as black, so this one is opaque.
  ["apple-touch-icon.png", 180, 0.72, 0],
];

/** The mark centred on the logo's cream, slightly above the middle like the original artwork. */
function iconHtml(size, share, radius) {
  const logoSize = Math.round(size * share);
  const top = Math.round(size * 0.49 - logoSize / 2);
  return `<body style="margin:0;background:transparent">
    <div style="position:relative;width:${size}px;height:${size}px;overflow:hidden;border-radius:${radius * 100}%;background:#FCEFD5">
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
