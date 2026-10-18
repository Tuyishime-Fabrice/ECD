/**
 * Draws the ECD Imuhira logo as SVG files in public/brand:
 *   mark.svg      the house, play button and open book (favicon, app icons, small places)
 *   wordmark.svg  the mark with "ECD Imuhira" on one line, readable when small (the app's header)
 *   lockup.svg    the mark with "ECD Imuhira" and "LEARN • PLAY • GROW" (sign-in, footer, docs)
 * Each file follows the phone's theme: teal parts turn cream in dark mode.
 *
 *   node scripts/brand/build-logo.mjs
 *
 * The lettering is Lato (the logo's typeface) turned into outlines, so no font is needed to show
 * it. The outlines are stored in the *.json files next to this script; text2path.py makes them
 * (needs Python with fontTools, e.g. `python3 text2path.py lato-latin-700-normal.woff Imuhira 100 -0.01`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(HERE, "../../public/brand");
const text = (name) => JSON.parse(readFileSync(join(HERE, `${name}.json`), "utf8"));

/** The logo's colors (also in lib/brand.ts). */
const C = { teal: "#124C4A", coral: "#EC775F", mustard: "#F2B83F", cream: "#FCEFD5", sage: "#BDCDCD", white: "#FFFFFF" };
/** In dark mode the teal roof, left page and lettering turn cream so they stay visible. */
const DARK_CSS = `<style>@media (prefers-color-scheme:dark){.tr{stroke:${C.cream}}.tf,.ti{fill:${C.cream}}.ts{stroke:#7FA3A1}}</style>`;

/** The mark, in a 1024 box (the drawing spans x 159–899, y 92–948). */
const mark = () => `
<path d="M185 405 L496 138 Q530 109 564 138 L875 405" fill="none" class="tr" stroke="${C.teal}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="330" y="326" width="402" height="300" rx="72" fill="${C.coral}"/>
<path d="M480 418 L583 474 L480 532 Z" fill="${C.white}" stroke="${C.white}" stroke-width="20" stroke-linejoin="round"/>
<path class="tf" d="M159 693 C262 654 382 666 497 727 L497 948 C382 889 262 877 159 910 Z" fill="${C.teal}"/>
<path d="M512 727 C627 666 747 654 853 693 L853 910 C747 877 627 889 512 948 Z" fill="${C.mustard}"/>
<g fill="none" stroke-width="13" stroke-linecap="round">
<path d="M234 761 Q322 738 418 789 M234 811 Q322 788 418 839" class="ts" stroke="${C.sage}"/>
<path d="M590 789 Q686 738 778 761 M590 839 Q686 788 778 811" stroke="${C.cream}"/>
</g>`;

/** A line of lettering at (x, baseline y), scaled from the stored 26–100px outlines. */
function word(name, x, y, scale, fill) {
  const cls = fill === C.teal ? ` class="ti"` : "";
  return `<path${cls} transform="translate(${x} ${y}) scale(${scale})" fill="${fill}" d="${text(name).d}"/>`;
}

/** Mark on the left; ECD / Imuhira / tagline stacked on the right, in the original's proportions. */
function lockup(tagline) {
  const width = (n) => text(n).width;
  let body = `<g transform="scale(0.44) translate(-159 -92)">${mark()}</g>`;
  const x = 446;
  const imuhira = 1.98;
  body += word("ecd", x + 3, tagline ? 112 : 128, 1.42, C.coral) + word("imuhira", x, tagline ? 282 : 300, imuhira, C.teal);
  let w = x + width("imuhira") * imuhira;
  if (tagline) {
    const s = 1.62;
    const y = 372;
    const gap = 40;
    const learn = width("learn") * s;
    const play = width("play") * s;
    const dot = (cx, fill) => `<circle cx="${cx}" cy="${y - 15}" r="7.5" fill="${fill}"/>`;
    body +=
      word("learn", x + 3, y, s, C.teal) +
      dot(x + 3 + learn + gap, C.mustard) +
      word("play", x + 3 + learn + gap * 2, y, s, C.teal) +
      dot(x + 3 + learn + play + gap * 3, C.coral) +
      word("grow", x + 3 + learn + play + gap * 4, y, s, C.teal);
    w = Math.max(w, x + 3 + learn + play + width("grow") * s + gap * 4);
  }
  return { body, w: Math.ceil(w) + 4, h: 380 };
}

/** Small sizes: the mark, then "ECD" and "Imuhira" on one baseline, so ECD stays readable. */
function inline() {
  const width = (n) => text(n).width;
  const body = `<g transform="scale(0.44) translate(-159 -92)">${mark()}</g>`;
  const x = 410;
  const ecd = 2.7; // cap height about half of Imuhira's
  const imuhira = 1.98;
  const y = 330;
  const ix = x + width("ecd") * ecd + 34;
  return {
    body: body + word("ecd", x, y, ecd, C.coral) + word("imuhira", ix, y, imuhira, C.teal),
    w: Math.ceil(ix + width("imuhira") * imuhira) + 4,
    h: 380,
  };
}

const svg = (viewBox, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img"><title>${title}</title>${DARK_CSS}${body}</svg>\n`;

writeFileSync(join(OUT, "mark.svg"), svg("150 80 760 880", mark(), "ECD Imuhira"));
for (const [file, { body, w, h }, title] of [
  ["wordmark.svg", inline(), "ECD Imuhira"],
  ["lockup.svg", lockup(true), "ECD Imuhira: learn, play, grow"],
]) {
  writeFileSync(join(OUT, file), svg(`-4 -4 ${w + 4} ${h + 8}`, body, title));
}
console.log("public/brand: mark.svg, wordmark.svg, lockup.svg");
