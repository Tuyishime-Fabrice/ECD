/**
 * Generates the placeholder artwork in public/images (all original, flat SVG).
 *
 *   node scripts/make-images.mjs
 *
 * Numerals use digit outlines from Baloo 2 ExtraBold (SIL Open Font License 1.1),
 * stored in scripts/art/digits.json so this script needs no extra packages.
 * Re-running overwrites the generated files; hand-made images elsewhere are untouched.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "public", "images");
const DIGITS = JSON.parse(readFileSync(join(root, "scripts/art/digits.json"), "utf8")).digits;

const INK = "#263238";
const P = {
  white: "#FFFFFF",
  cream: "#FFF9EE",
  sky100: "#E1F3FB",
  sky500: "#29A9E0",
  sky700: "#1572A8",
  sun: "#FFD23F",
  leaf100: "#E2F4E8",
  leaf300: "#6CC18A",
  leaf500: "#3DAE6B",
  leaf700: "#23794A",
  coral100: "#FFE8DF",
  coral: "#FF8A65",
  grape100: "#EEEAF7",
  grape: "#8E7CC3",
  brown: "#8D5A34",
  skinA: "#8A5530",
  skinB: "#6B3E22",
  hair: "#2B1B12",
};

let written = 0;
const r = (v) => +v.toFixed(2);
function write(rel, w, h, body) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n${body.trim()}\n</svg>\n`;
  writeFileSync(file, svg.replace(/\n\s+/g, "\n"));
  written++;
}

/* ---------- Numerals ---------- */

/** Draws a number centered on cx, sitting on `baseline`, `height` px tall, outlined in ink. */
function numeral(text, { cx, baseline, height, fill, sw = 7 }) {
  const scale = height / 62; // Baloo digits are ~62 units tall at 100 units/em
  let x = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  const parts = [];
  for (const ch of String(text)) {
    if (ch === " ") {
      x += 22;
      continue;
    }
    const g = DIGITS[ch];
    parts.push(`<path transform="translate(${r(x)} 0)" d="${g.d}"/>`);
    minX = Math.min(minX, x + g.bbox[0]);
    maxX = Math.max(maxX, x + g.bbox[2]);
    x += g.advance - 3;
  }
  const tx = cx - ((maxX - minX) * scale) / 2 - minX * scale;
  return `<g transform="translate(${r(tx)} ${r(baseline)}) scale(${r(scale)})" fill="${fill}" stroke="${INK}" stroke-width="${r((sw * 2) / scale)}" stroke-linejoin="round" paint-order="stroke">${parts.join("")}</g>`;
}

/* ---------- Fruits (each drawn in a 100×100 box) ---------- */

const FRUITS = {
  mango: `
    <linearGradient id="mangoSkin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0.12" stop-color="#8DC63F"/><stop offset="0.5" stop-color="#FFC93C"/><stop offset="1" stop-color="#FF9F43"/>
    </linearGradient>
    <g id="mango" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <g transform="rotate(-28 50 52)">
        <path d="M10 54C9 36 28 25 50 25C74 25 92 37 91 55C90 69 79 77 66 79C56 81 48 84 38 82C22 79 11 69 10 54Z" fill="url(#mangoSkin)" stroke-width="4"/>
        <path d="M24 44C31 36 41 33 52 33" fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="5"/>
        <path d="M11 50C7 48 4 45 3 41" fill="none" stroke-width="4"/>
      </g>
    </g>`,
  banana: `
    <g id="banana" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <path d="M18 30C22 64 50 86 85 77C91 75 90 66 84 67C56 71 37 53 33 28C32 21 18 22 18 30Z" fill="${P.sun}" stroke-width="4"/>
      <path d="M29 37C35 57 52 69 74 71" fill="none" stroke="#E9B800" stroke-width="3"/>
      <path d="M19 27L16 15L27 13L32 25" fill="${P.brown}" stroke-width="3.5"/>
      <circle cx="87" cy="72" r="3.5" fill="${P.brown}" stroke-width="2.5"/>
    </g>`,
  orange: `
    <g id="orange" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <circle cx="50" cy="57" r="34" fill="#FF9F43" stroke-width="4"/>
      <circle cx="37" cy="45" r="7" fill="#FFC88A" stroke="none"/>
      <g fill="#E8822A" stroke="none"><circle cx="62" cy="50" r="2"/><circle cx="56" cy="70" r="2"/><circle cx="70" cy="64" r="2"/><circle cx="42" cy="68" r="2"/></g>
      <path d="M50 23C50 17 52 13 55 11" fill="none" stroke-width="4"/>
      <path d="M54 18C62 8 76 10 81 16C71 23 61 23 54 18Z" fill="${P.leaf500}" stroke-width="3.5"/>
    </g>`,
  avocado: `
    <g id="avocado" stroke="${INK}" stroke-linejoin="round">
      <path d="M50 9C64 9 70 25 74 39C83 56 82 91 50 93C18 91 17 56 26 39C30 25 36 9 50 9Z" fill="#3E7B3A" stroke-width="4"/>
      <path d="M50 18C60 18 64 30 67 42C74 56 74 84 50 85C26 84 26 56 33 42C36 30 40 18 50 18Z" fill="#D9F0A3" stroke="none"/>
      <circle cx="50" cy="62" r="14" fill="#9C6B3F" stroke-width="3.5"/>
      <circle cx="45" cy="57" r="4" fill="#C49064" stroke="none"/>
    </g>`,
};
const defs = (...ids) => `<defs>${ids.map((id) => FRUITS[id]).join("")}</defs>`;

// Rows per amount: small groups stay big, larger ones form tidy rows for counting.
const ROWS = { 1: [1], 2: [2], 3: [2, 1], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3], 10: [4, 3, 3] };
const TILT = [-8, 6, -4, 8, -6, 4];

function group(fruit, n, { x = 0, y = 0, w = 240, h = 240, maxCell = 130 } = {}) {
  const rows = ROWS[n];
  const cols = Math.max(...rows);
  const cell = Math.min(w / cols, h / rows.length, maxCell);
  const gridH = cell * rows.length;
  let out = "";
  let i = 0;
  rows.forEach((count, ri) => {
    const x0 = x + (w - cell * count) / 2;
    const y0 = y + (h - gridH) / 2 + ri * cell;
    for (let c = 0; c < count; c++) {
      const s = (cell / 100) * 0.92;
      const px = x0 + c * cell + cell * 0.04;
      const py = y0 + cell * 0.04;
      out += `<use href="#${fruit}" transform="translate(${r(px)} ${r(py)}) scale(${r(s)}) rotate(${TILT[i % TILT.length]} 50 50)"/>`;
      i++;
    }
  });
  return out;
}

/* ---------- Shared scenery ---------- */

const hills = (w, h, top = 0.72) => {
  const y1 = h * top;
  const y2 = h * (top + 0.1);
  return `
    <path d="M0 ${r(y1)}C${r(w * 0.2)} ${r(y1 - h * 0.14)} ${r(w * 0.42)} ${r(y1 - h * 0.08)} ${r(w * 0.6)} ${r(y1 + h * 0.02)}C${r(w * 0.75)} ${r(y1 + h * 0.08)} ${r(w * 0.88)} ${r(y1 - h * 0.06)} ${w} ${r(y1 - h * 0.1)}V${h}H0Z" fill="${P.leaf300}"/>
    <path d="M0 ${r(y2)}C${r(w * 0.22)} ${r(y2 - h * 0.06)} ${r(w * 0.45)} ${r(y2 - h * 0.02)} ${r(w * 0.62)} ${r(y2 + h * 0.03)}C${r(w * 0.8)} ${r(y2 + h * 0.07)} ${r(w * 0.9)} ${r(y2 - h * 0.02)} ${w} ${r(y2 - h * 0.04)}V${h}H0Z" fill="${P.leaf500}"/>`;
};

const sun = (cx, cy, rad) => {
  let rays = "";
  for (let a = 0; a < 360; a += 45) {
    rays += `<rect x="${r(cx - rad * 0.14)}" y="${r(cy - rad * 1.62)}" width="${r(rad * 0.28)}" height="${r(rad * 0.42)}" rx="${r(rad * 0.14)}" transform="rotate(${a} ${cx} ${cy})"/>`;
  }
  return `<g fill="${P.sun}" stroke="${INK}" stroke-width="3" stroke-linejoin="round">${rays}<circle cx="${cx}" cy="${cy}" r="${rad}"/></g>`;
};

const cloud = (x, y, s) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M10 30C0 30 0 14 12 14C14 4 30 2 34 12C40 4 56 8 54 20C64 20 64 30 56 30Z" fill="${P.white}"/>`;

/* ---------- Counting pictures: 1–10 of each fruit ---------- */

for (const fruit of Object.keys(FRUITS)) {
  for (let n = 1; n <= 10; n++) {
    write(`counting/${fruit}-${n}.svg`, 240, 240, defs(fruit) + group(fruit, n));
  }
}

/* ---------- Numerals 1–10 ---------- */

const NUMERAL_FILLS = [P.sky500, P.coral, P.leaf500, P.grape, P.sun];
for (let n = 1; n <= 10; n++) {
  write(
    `numbers/${n}.svg`,
    240,
    240,
    numeral(n, { cx: 120, baseline: 195, height: 150, fill: NUMERAL_FILLS[(n - 1) % NUMERAL_FILLS.length], sw: 8 }),
  );
}

/* ---------- Episode thumbnails (16:9) ---------- */

const THUMBS = [
  ["s1e1", "1", "mango", 1],
  ["s1e2", "2", "banana", 2],
  ["s1e3", "3", "orange", 3],
  ["s1e4", "4 5", "avocado", 5],
  ["s1e5", "6", "mango", 6],
  ["s1e6", "7", "banana", 7],
  ["s1e7", "8", "orange", 8],
  ["s1e8", "9 10", "avocado", 10],
];
for (const [id, label, fruit, n] of THUMBS) {
  const height = label.length > 3 ? 50 : label.length > 1 ? 70 : 96;
  write(
    `thumbs/${id}.svg`,
    320,
    180,
    `${defs(fruit)}
    <rect width="320" height="180" fill="${P.sky100}"/>
    ${cloud(18, 14, 0.9)}
    ${hills(320, 180, 0.78)}
    ${numeral(label, { cx: label.length > 3 ? 92 : 100, baseline: 132, height, fill: P.white, sw: 6 })}
    ${group(fruit, n, { x: 178, y: 16, w: 136, h: 140, maxCell: 78 })}`,
  );
}

/* ---------- Season posters (4:3) ---------- */

write(
  "seasons/numbers.svg",
  400,
  300,
  `<rect width="400" height="300" rx="28" fill="${P.sky100}"/>
  ${sun(330, 72, 32)}
  ${cloud(40, 40, 1.4)}
  ${hills(400, 300, 0.68)}
  ${numeral("1", { cx: 100, baseline: 220, height: 96, fill: P.coral })}
  ${numeral("2", { cx: 196, baseline: 196, height: 110, fill: P.sun })}
  ${numeral("3", { cx: 296, baseline: 232, height: 96, fill: P.grape })}`,
);

write(
  "seasons/colors-shapes.svg",
  400,
  300,
  `<rect width="400" height="300" rx="28" fill="${P.coral100}"/>
  <g stroke="${INK}" stroke-width="6" stroke-linejoin="round">
    <circle cx="110" cy="110" r="58" fill="${P.sky500}"/>
    <path d="M250 50L320 170H180Z" fill="${P.sun}"/>
    <rect x="62" y="178" width="96" height="96" rx="14" fill="${P.leaf500}"/>
    <path d="M290 186l15 30 33 5-24 23 6 33-30-16-30 16 6-33-24-23 33-5z" fill="${P.grape}"/>
  </g>
  <g fill="${P.white}"><circle cx="92" cy="92" r="12" opacity=".5"/><circle cx="196" cy="246" r="8"/><circle cx="356" cy="64" r="10"/></g>`,
);

write(
  "seasons/body-hygiene.svg",
  400,
  300,
  `<rect width="400" height="300" rx="28" fill="${P.leaf100}"/>
  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M128 70C104 70 92 94 98 124C104 154 108 214 128 220C142 223 144 186 156 186C168 186 170 223 184 220C204 214 208 154 214 124C220 94 208 70 184 70C172 70 166 78 156 78C146 78 140 70 128 70Z" fill="${P.white}"/>
    <circle cx="136" cy="128" r="6" fill="${INK}" stroke="none"/>
    <circle cx="176" cy="128" r="6" fill="${INK}" stroke="none"/>
    <path d="M140 152Q156 166 172 152" fill="none"/>
    <g transform="rotate(-35 300 170)">
      <rect x="236" y="160" width="140" height="24" rx="12" fill="${P.sky500}"/>
      <rect x="236" y="128" width="46" height="32" rx="6" fill="${P.white}"/>
      <path d="M248 130V158M259 130V158M270 130V158" fill="none" stroke-width="3"/>
    </g>
  </g>
  <g fill="${P.white}" stroke="${P.sky500}" stroke-width="4">
    <circle cx="250" cy="70" r="20"/><circle cx="292" cy="52" r="12"/><circle cx="86" cy="240" r="16"/><circle cx="330" cy="250" r="22"/>
  </g>`,
);

/* ---------- Stickers ---------- */

const stickerBase = (bg) => `
  <circle cx="100" cy="106" r="90" fill="#000" opacity=".12"/>
  <circle cx="100" cy="98" r="90" fill="${P.white}"/>
  <circle cx="100" cy="98" r="76" fill="${bg}" stroke="${INK}" stroke-width="4"/>`;
const sparkle = (x, y, s) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-10Q2-2 10 0Q2 2 0 10Q-2 2-10 0Q-2-2 0-10Z" fill="${P.white}"/>`;

write(
  "stickers/s1c1.svg",
  200,
  200,
  `${defs("mango")}
  ${stickerBase(P.coral)}
  <use href="#mango" transform="translate(42 36) scale(1.18)"/>
  <circle cx="90" cy="98" r="5" fill="${INK}"/>
  <circle cx="115" cy="95" r="5" fill="${INK}"/>
  <path d="M89 112Q103 124 118 109" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  ${sparkle(46, 60, 1.1)}${sparkle(158, 140, 0.9)}${sparkle(150, 56, 0.7)}`,
);

write(
  "stickers/s1c2.svg",
  200,
  200,
  `${stickerBase(P.sky500)}
  <g stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M66 36L94 74M134 36L106 74" stroke="${P.brown}" stroke-width="7"/>
    <circle cx="64" cy="34" r="7" fill="${P.cream}"/><circle cx="136" cy="34" r="7" fill="${P.cream}"/>
    <path d="M56 84H144L132 164H68Z" fill="#B0703A"/>
    <ellipse cx="100" cy="84" rx="44" ry="14" fill="${P.cream}"/>
    <path d="M72 146L82 136L92 146L102 136L112 146L122 136L130 146" fill="none" stroke="${P.white}" stroke-width="5"/>
    <circle cx="88" cy="112" r="4.5" fill="${INK}" stroke="none"/>
    <circle cx="112" cy="112" r="4.5" fill="${INK}" stroke="none"/>
    <path d="M90 124Q100 132 110 124" fill="none"/>
  </g>
  ${sparkle(44, 120, 1)}${sparkle(160, 108, 0.8)}`,
);

/* ---------- Scene: children playing outside (Time's Up) ---------- */

const limb = (d, skin) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${skin}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
const face = (cx, cy, skin) => `
  <circle cx="${cx}" cy="${cy}" r="24" fill="${skin}" stroke="${INK}" stroke-width="4"/>
  <circle cx="${cx - 8}" cy="${cy - 2}" r="3.2" fill="${INK}"/>
  <circle cx="${cx + 8}" cy="${cy - 2}" r="3.2" fill="${INK}"/>
  <path d="M${cx - 9} ${cy + 8}Q${cx} ${cy + 16} ${cx + 9} ${cy + 8}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

write(
  "scenes/play-outside.svg",
  400,
  260,
  `<rect width="400" height="260" rx="28" fill="${P.sky100}"/>
  ${cloud(36, 30, 1.1)}
  ${cloud(170, 18, 0.8)}
  ${hills(400, 260, 0.64)}
  <!-- jumping child -->
  ${limb("M140 196L128 232", P.skinA)}${limb("M164 196L176 232", P.skinA)}
  ${limb("M134 156L108 122", P.skinA)}${limb("M170 156L196 122", P.skinA)}
  <rect x="126" y="146" width="52" height="60" rx="20" fill="${P.sun}" stroke="${INK}" stroke-width="4"/>
  ${face(152, 120, P.skinA)}
  <path d="M130 108C130 92 146 88 154 92C164 88 176 96 174 108C168 100 140 100 130 108Z" fill="${P.hair}"/>
  <!-- kicking child -->
  ${limb("M270 200L262 236", P.skinB)}${limb("M286 198L314 222", P.skinB)}
  ${limb("M262 160L238 186", P.skinB)}${limb("M296 160L318 140", P.skinB)}
  <path d="M258 150H300L312 206H246Z" fill="${P.coral}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  ${face(278, 124, P.skinB)}
  <g fill="${P.hair}"><circle cx="262" cy="104" r="9"/><circle cx="278" cy="98" r="10"/><circle cx="294" cy="104" r="9"/></g>
  <!-- ball -->
  <circle cx="338" cy="226" r="16" fill="${P.white}" stroke="${INK}" stroke-width="4"/>
  <path d="M326 216Q338 226 350 216M330 238Q338 230 346 238" fill="none" stroke="${P.grape}" stroke-width="4" stroke-linecap="round"/>`,
);

console.log(`Wrote ${written} SVG files to public/images`);
