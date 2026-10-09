/**
 * Answer pictures for questions and challenges, 240×240 on a transparent background (they sit
 * on the woven answer plate): 1–10 of each fruit (images/counting/…) and toy-block numerals
 * 1–10 (images/numbers/…).
 */
import { Doc, toyNumeral } from "./lib.mjs";
import { fruit } from "./props.mjs";

const S = 240;
const KINDS = ["mango", "banana", "orange", "avocado"];
// Rows per amount: small groups stay big, larger ones form tidy rows that are easy to count.
const ROWS = { 1: [1], 2: [2], 3: [2, 1], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3], 10: [4, 3, 3] };
const TILT = [-8, 6, -4, 8, -6, 4];
const COLORS = [
  ["#4FB3EA", "#1E73A6"],
  ["#FF8A66", "#C4532F"],
  ["#3CC2B4", "#1A7A72"],
  ["#B08AF0", "#6E40B0"],
  ["#FFC93F", "#C97A00"],
];

function counting(kind, n) {
  const doc = new Doc();
  const rows = ROWS[n];
  const cell = Math.min(S / Math.max(...rows), S / rows.length, 130);
  const top = (S - cell * rows.length) / 2;
  let body = "";
  let i = 0;
  rows.forEach((count, r) => {
    const left = (S - cell * count) / 2;
    for (let c = 0; c < count; c++) body += fruit(doc, kind, left + (c + 0.5) * cell, top + (r + 0.5) * cell, cell * 0.92, TILT[i++ % TILT.length]);
  });
  return { doc, body };
}

function numeral(n) {
  const doc = new Doc();
  const [color, deep] = COLORS[(n - 1) % COLORS.length];
  const size = n < 10 ? 150 : 124;
  // The extrusion hangs below the baseline, so the baseline sits a little above the middle.
  const body = toyNumeral(doc, String(n), { x: S / 2, y: (S + size) / 2 - size * 0.04, size, color, deep, id: "n" });
  return { doc, body };
}

export function buildAnswers(write) {
  for (const kind of KINDS) {
    for (let n = 1; n <= 10; n++) write(`images/counting/${kind}-${n}.svg`, { w: S, h: S, ...counting(kind, n) });
  }
  for (let n = 1; n <= 10; n++) write(`images/numbers/${n}.svg`, { w: S, h: S, ...numeral(n) });
}
