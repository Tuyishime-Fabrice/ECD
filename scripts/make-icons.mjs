/**
 * Renders the PNG app icons from public/icons/logo.svg (one-off; re-run after
 * changing the logo). Needs Playwright, which is not a project dependency:
 *
 *   npm i --no-save playwright && node scripts/make-icons.mjs
 *
 * Set CHROMIUM=/path/to/chrome to use an existing browser binary.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = readFileSync(join(root, "public/icons/logo.svg"), "utf8");
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;

const ICONS = [
  // [file, size, background, logo size as share of the icon]
  ["icon-192.png", 192, "#FFF9EE", 0.82],
  ["icon-512.png", 512, "#FFF9EE", 0.82],
  // Maskable icons get cropped to a circle/squircle: keep the logo inside the safe zone.
  ["icon-maskable-512.png", 512, "#E1F3FB", 0.6],
  ["apple-touch-icon.png", 180, "#FFF9EE", 0.8],
];

const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [file, size, bg, share] of ICONS) {
  const logoSize = Math.round(size * share);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg}">` +
      `<img src="${dataUrl}" width="${logoSize}" height="${logoSize}"></body>`,
  );
  await page.screenshot({ path: join(root, "public/icons", file), omitBackground: false });
  console.log(`public/icons/${file}`);
}
await browser.close();
