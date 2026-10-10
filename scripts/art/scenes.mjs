/**
 * The time's-up scenes (400×260, public/images/scenes/…). Day: children playing outside on the
 * hills while Izuba waves. Night: a moonlit yard with warm huts, and Izuba asleep behind the hill.
 * Cards show them with rounded corners, so nothing important sits near a corner.
 */
import {
  DAY,
  Doc,
  NIGHT,
  OUTLINE,
  bandFill,
  cloudSymbol,
  f,
  fence,
  fieldBand,
  fireflies,
  hill,
  meadow,
  mix,
  moon,
  place,
  sampler,
  sky,
  stars,
  teaRows,
  terraces,
  volcanoes,
  cow,
} from "./lib.mjs";
import { mascot } from "./mascot.mjs";
import { friend, keza } from "./people.mjs";
import { ball, shadow } from "./props.mjs";
import { bananasAt, hutsAt } from "./world.mjs";

const W = 400;
const H = 260;

const izuba = (doc, pose, x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">${mascot(doc, pose, "m")}</g>`;

/** A skipping rope swinging over the head, with wooden handles in both hands. */
const rope = ([lx, ly], [rx, ry]) => {
  const d = `M${lx} ${ly}C${lx - 30} ${ly - 70} ${lx - 6} -214 0 -214C${rx + 6} -214 ${rx + 30} ${ry - 70} ${rx} ${ry}`;
  const handles = `M${lx} ${ly}l-4 -14M${rx} ${ry}l4 -14`;
  return (
    `<path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#E0457B" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${handles}" stroke="${OUTLINE}" stroke-width="14" stroke-linecap="round"/><path d="${handles}" stroke="#C98B4E" stroke-width="7" stroke-linecap="round"/>`
  );
};

function playDay() {
  const P = DAY;
  const doc = new Doc();
  let o = sky(doc, P, W, H, { glow: [338, 66, 150] });
  const cl = cloudSymbol(doc, P);
  o += place(cl, 26, 34, 70, 46 / 120) + place(cl, 160, 18, 48, 46 / 120, { extra: ' opacity=".85"' });
  o += volcanoes(P, 124, [[64, 70, 22], [176, 96, 36], [262, 64, 18]]);

  const far = [[-10, 122], [60, 114], [150, 124], [240, 110], [330, 120], [410, 112]];
  o += hill(far, H, P.far) + terraces(far, [[8, 170, 410, 0]], 160, P.terrace(P.far), 1.8);

  const mid = [[-10, 148], [70, 140], [160, 150], [260, 142], [340, 150], [410, 142]];
  const midFill = P.hills(0.3);
  const midTop = sampler(mid);
  o += hill(mid, H, bandFill(doc, P, "b0", midFill, 136, 200));
  o += fieldBand(mid, [10, 22], [150, 300], 190, P.field(midFill), 0.1);
  o += terraces(mid, [[8, 140, 320, 0], [20, 170, 290, 0.08]], 190, P.terrace(midFill), 2);
  o += teaRows(mid, [12, 22, 32].map((off) => [off, 300, 410, 0.04]), 190, P.tea(midFill), 5.5);
  // the homestead on the left: banana plants behind a woven fence and two huts
  o += bananasAt(doc, P, [[24, midTop(24) + 22, 44, true], [124, midTop(124) + 20, 36]]);
  o += fence(P, 44, 112, midTop(78) + 22, 8, 3.5);
  o += hutsAt(doc, P, [[64, midTop(64) + 20, 40], [98, midTop(98) + 20, 28]]);
  o += cow(P, 150, midTop(150) + 16, 0.36, true);

  const low = [[-10, 178], [100, 172], [220, 180], [330, 170], [410, 176]];
  const lowFill = P.hills(0.62);
  o += hill(low, H, bandFill(doc, P, "b1", lowFill, 166, 220));
  o += terraces(low, [[9, -10, 150, 0], [10, 250, 410, 0]], 220, P.terrace(lowFill), 2.4);

  const near = [[-10, 206], [120, 200], [260, 206], [410, 198]];
  o += hill(near, H, bandFill(doc, P, "b2", P.hills(1), 196, 260));
  o += meadow(doc, P, near, { x0: 10, x1: 390, depth: [10, 50], count: 12, tufts: 5, seed: 260 });
  o += bananasAt(doc, P, [[388, H + 10, 64]]);

  o += izuba(doc, "wave", 292, 18, 0.78);

  // Mugisha kicks the ball, Keza jumps for joy, Ineza skips.
  o += shadow(98, 246, 26, 4, 0.2) + shadow(140, 246, 9, 2.2, 0.14) + shadow(206, 248, 20, 3.5, 0.16) + shadow(306, 247, 22, 3.5, 0.16);
  o += friend(doc, "mugisha", { x: 92, y: 244, s: 0.5, pose: "balance", legs: "kick", look: 0.5, mouth: "open" });
  // the ball flies off the foot: two curved speed lines behind it
  o += `<path d="M124 210c-4 1-8 3-11 6M125 220c-4 0-8 2-11 4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`;
  o += ball(doc, 138, 214, 9);
  o += keza(doc, { x: 206, y: 236, s: 0.52, pose: "cheer", legs: "jump", mouth: "open" });
  o += friend(doc, "ineza", { x: 306, y: 236, s: 0.5, pose: "rope", legs: "jump", look: -0.3, mouth: "open", hold: rope });
  return { doc, body: o };
}

function playNight() {
  const P = NIGHT;
  const doc = new Doc();
  let o = sky(doc, P, W, H);
  o += stars({ x0: 0, y0: 4, x1: W, y1: 118, count: 44, seed: 26, avoid: [[58, 46, 34], [316, 104, 66]], twinkles: 4 });
  o += moon(doc, 58, 46, 18);
  o += volcanoes(P, 126, [[150, 84, 28], [222, 60, 18]]);

  const far = [[-10, 126], [80, 118], [170, 128], [260, 116], [340, 124], [410, 118]];
  o += hill(far, H, P.far) + terraces(far, [[8, -10, 200, 0]], 160, P.terrace(P.far), 1.8);

  // Izuba sleeps tucked in behind the hill, nightcap on.
  o += izuba(doc, "sleep", 270, 62, 0.8);

  const mid = [[-10, 156], [80, 148], [180, 156], [270, 140], [330, 136], [410, 146]];
  const midFill = P.hills(0.3);
  const midTop = sampler(mid);
  o += hill(mid, H, bandFill(doc, P, "b0", midFill, 130, 200));
  o += terraces(mid, [[9, 220, 410, 0], [22, 250, 410, 0.06]], 196, P.terrace(midFill), 2.2);
  o += hutsAt(doc, P, [[36, midTop(36) + 14, 26, true], [58, midTop(58) + 15, 18]]);

  const yard = [[-10, 192], [120, 186], [250, 192], [410, 184]];
  const yardFill = P.hills(0.68);
  const yardTop = sampler(yard);
  o += hill(yard, H, bandFill(doc, P, "b1", yardFill, 180, 250));
  o += bananasAt(doc, P, [[86, yardTop(86) + 26, 64, true], [314, yardTop(314) + 28, 60]]);
  o += fence(P, 100, 290, yardTop(195) + 24, 12, 4.5);
  o += hutsAt(doc, P, [[156, yardTop(156) + 34, 96, true], [244, yardTop(244) + 34, 68, true]]);

  // the swept yard (imbuga) in front of the huts, where the ball was left for tomorrow
  const front = [[-10, 230], [140, 226], [300, 232], [410, 224]];
  o += hill(front, H, bandFill(doc, P, "b2", P.hills(1), 222, 260));
  o += `<ellipse cx="200" cy="240" rx="128" ry="14" fill="${mix(P.road[1], "#0E2E2A", 0.25)}"/>`;
  o += meadow(doc, P, front, { x0: 10, x1: 390, depth: [8, 30], count: 7, tufts: 4, seed: 261 });
  o += shadow(296, 246, 12, 3, 0.3) + ball(doc, 296, 238, 8.5);

  o += fireflies(doc, [[30, 210], [70, 178, 0.8], [118, 226, 0.9], [206, 168, 0.7], [272, 214], [350, 196, 0.8], [376, 238, 0.9], [236, 150, 0.6], [24, 150, 0.6]]);
  return { doc, body: o };
}

export function buildScenes(write) {
  const day = playDay();
  write("images/scenes/play-outside-day.svg", { w: W, h: H, ...day, kind: "scene" });
  write("images/scenes/play-outside-night.svg", { w: W, h: H, ...playNight(), kind: "scene" });
  // Older screens still ask for play-outside.svg: it stays a copy of the day picture.
  write("images/scenes/play-outside.svg", { w: W, h: H, ...day, kind: "scene" });
}
