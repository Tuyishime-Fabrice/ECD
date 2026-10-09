/**
 * World scenes, each in a day and a night version (public/images/world/…).
 * Flat environment art without outlines: layered terraced hills, far paler, near more saturated.
 */
import {
  BANANA_RATIO,
  DAY,
  Doc,
  HUT_RATIO,
  NIGHT,
  bananaSymbol,
  bandFill,
  cloudSymbol,
  contours,
  cow,
  f,
  fence,
  fieldBand,
  fireflies,
  footpath,
  hill,
  hutSymbol,
  meadow,
  moon,
  place,
  rng,
  sampler,
  sky,
  stand,
  stars,
  teaRows,
  terraces,
  volcanoes,
} from "./lib.mjs";

const THEMES = [
  ["day", DAY],
  ["night", NIGHT],
];

/** Hill top points from normalized [u, dy] pairs, with a gentle extra roll on wide canvases. */
function ridge(W, y, spec, roll = 0, phase = 0) {
  const base = sampler(spec.map(([u, dy]) => [u * 1000, dy]));
  const n = Math.max(spec.length, Math.round(W / 110));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = -0.04 + (1.08 * i) / n;
    pts.push([u * W, y + base(u * 1000) + roll * Math.sin(u * Math.PI * 4 + phase)]);
  }
  return pts;
}

export const hutsAt = (doc, P, spots) =>
  spots.map(([x, y, w, lit]) => stand(hutSymbol(doc, P, P.night && lit), x, y, w, HUT_RATIO)).join("");
export const bananasAt = (doc, P, spots) =>
  spots.map(([x, y, w, flip]) => stand(bananaSymbol(doc, P), x, y, w, BANANA_RATIO, { flip })).join("");

/* ---------- collection path map: tall, calm in the middle ---------- */

function map(P, W) {
  const doc = new Doc();
  const wide = W > 600;
  const H = 1600;
  const mid = W / 2;
  // x positions measured from the left (L) or right (R) edge; on wide canvases the sides are roomier.
  const L = (x) => x;
  const R = (x) => W - x;
  const side = wide ? 1.35 : 1;
  let out = sky(doc, P, W, 440, { glow: P.night ? null : [mid, 150, wide ? 420 : 240] });

  if (P.night) {
    const mx = wide ? R(230) : R(78);
    out += stars({ x0: 0, y0: 6, x1: W, y1: 270, count: wide ? 90 : 46, seed: wide ? 7 : 3, avoid: [[mx, 96, 52]], twinkles: wide ? 8 : 4 });
    out += moon(doc, mx, 96, 24);
  } else {
    const cl = cloudSymbol(doc, P);
    out += place(cl, L(-18), 112, 92, 46 / 120) + place(cl, R(80), 76, 70, 46 / 120, { extra: ' opacity=".9"' });
    if (wide) out += place(cl, L(240), 60, 110, 46 / 120, { extra: ' opacity=".85"' }) + place(cl, R(330), 150, 84, 46 / 120);
  }
  if (P.night) {
    const cl = cloudSymbol(doc, P);
    out += place(cl, L(-30), 150, 110, 46 / 120, { extra: ' opacity=".55"' });
    if (wide) out += place(cl, R(420), 70, 120, 46 / 120, { extra: ' opacity=".45"' });
  }

  out += volcanoes(P, 270, wide ? [[170, 170, 46], [430, 210, 72], [660, 130, 36], [990, 220, 64], [1160, 120, 34]] : [[64, 110, 40], [242, 130, 60], [380, 80, 30]]);

  // Hill bands, far to near. [top y, shape, terrace lines, roll]
  const bands = [
    [262, [[0, 6], [0.2, -8], [0.42, 6], [0.64, -14], [0.86, -2], [1, 8]]],
    [338, [[0, -10], [0.25, 6], [0.5, 12], [0.75, -4], [1, -16]]],
    [462, [[0, 14], [0.3, -10], [0.55, 4], [0.8, 16], [1, 4]]],
    [606, [[0, -8], [0.22, 8], [0.5, 14], [0.78, -6], [1, -18]]],
    [764, [[0, 16], [0.3, -4], [0.6, 10], [0.85, 0], [1, -10]]],
    [930, [[0, -14], [0.3, 4], [0.55, 14], [0.8, 2], [1, 12]]],
    [1104, [[0, 10], [0.25, -6], [0.5, 8], [0.78, 16], [1, -6]]],
    [1282, [[0, -6], [0.3, 12], [0.6, 4], [0.85, -10], [1, 2]]],
    [1452, [[0, 10], [0.35, -4], [0.65, 6], [1, -10]]],
  ];
  const r = rng(wide ? 11 : 5);
  bands.forEach(([y, spec], i) => {
    const t = i / (bands.length - 1);
    const fill = i === 0 ? P.far : P.hills(t);
    const pts = ridge(W, y, spec, wide ? 10 : 0, i);
    out += hill(pts, H, bandFill(doc, P, `b${i}`, fill, y - 24, y + 170));
    const base = y + 150;
    // Terraced fields: a slightly different band and light contour strokes, mostly at the sides.
    if (i > 0) {
      const a = wide ? 0.62 : 0.5;
      const left = i % 2 === 1;
      const fx = left ? [-10, W * a] : [W * (1 - a), W + 10];
      out += fieldBand(pts, [16 + i, 34 + i * 2], fx, base, P.field(fill), 0.12);
      const lines = [];
      const gap = 14 + i * 2.4;
      for (let k = 0; k < (i < 3 ? 2 : 3); k++) {
        const off = 10 + k * gap;
        const span = (wide ? 0.42 : 0.5) + r() * 0.12;
        lines.push(left ? [off, -10, W * span, 0.08 * k] : [off, W * (1 - span), W + 10, 0.08 * k]);
      }
      // a quieter line on the other side keeps the terracing continuous but calm in the middle
      lines.push(left ? [12 + gap, W * 0.7, W + 10, 0.1] : [12 + gap, -10, W * 0.3, 0.1]);
      out += terraces(pts, lines, base, P.terrace(fill), i < 3 ? 2.5 : 3);
    } else {
      out += terraces(pts, [[10, W * 0.62, W + 10, 0.1]], base, P.terrace(fill), 2.2);
    }
    // Tea rows on alternate bands, on the side away from the terraces.
    if (i === 2 || i === 4 || i === 6) {
      const right = i !== 4;
      const span = wide ? 330 : 110 + i * 4;
      const x0 = right ? W - span : -10;
      const x1 = right ? W + 10 : span;
      const size = 6 + i * 0.6;
      out += teaRows(pts, [18, 18 + size * 2.1, 18 + size * 4.2].map((o) => [o, x0, x1, 0.05]), base, P.tea(fill), size);
    }
    out += decor(doc, P, i, pts, { W, L, R, side, wide });
  });

  if (P.night) {
    const spots = [
      [L(24), 1180], [L(60), 1222, 0.8], [R(34), 1010], [R(70), 1060, 0.7], [L(36), 820, 0.8],
      [R(28), 1360], [L(46), 1500, 1.1], [R(58), 1530], [L(84), 1400, 0.7], [R(22), 690, 0.7],
    ];
    if (wide) spots.push([L(220), 1120], [R(260), 1300], [L(300), 1460, 0.8], [R(190), 880, 0.8], [L(150), 980, 0.7], [R(330), 1540]);
    out += fireflies(doc, spots);
  }
  return { doc, body: out };
}

/** Side decorations per band: huts, banana plants, a cow, meadow flowers. */
function decor(doc, P, i, pts, { W, L, R, side, wide }) {
  const top = sampler(pts);
  const on = (x, d = 6) => top(x) + d;
  let o = "";
  switch (i) {
    case 1:
      o += hutsAt(doc, P, [[L(38), on(L(38), 16), 30], [L(64), on(L(64), 20), 22, true]]);
      o += bananasAt(doc, P, [[R(36), on(R(36), 18), 42]]);
      if (wide) o += hutsAt(doc, P, [[R(250), on(R(250), 18), 26, true]]) + bananasAt(doc, P, [[L(250), on(L(250), 20), 38, true]]);
      break;
    case 2:
      o += hutsAt(doc, P, [[R(52), on(R(52), 10), 36]]);
      if (wide) o += hutsAt(doc, P, [[L(150), on(L(150), 22), 34, true], [L(184), on(L(184), 26), 26]]) + fence(P, L(126), L(208), on(L(170), 34), 9, 4);
      break;
    case 3:
      o += bananasAt(doc, P, [[L(26), on(L(26), 40), 84, true]]);
      o += cow(P, R(70), on(R(70), 26), 0.62, true);
      if (wide) o += bananasAt(doc, P, [[R(240), on(R(240), 36), 70]]) + cow(P, L(260), on(L(260), 30), 0.7);
      o += meadow(doc, P, pts, { x0: R(110), x1: R(10), depth: [30, 80], count: 4, tufts: 1, seed: 31 });
      break;
    case 4:
      o += hutsAt(doc, P, [[R(64), on(R(64), 24), 46, true], [R(28), on(R(28), 30), 34]]);
      o += fence(P, R(98) , R(6), on(R(50), 40), 11 , 4.5);
      if (wide) o += bananasAt(doc, P, [[L(200), on(L(200), 40), 88, true]]) + hutsAt(doc, P, [[R(300), on(R(300), 30), 40]]);
      break;
    case 5:
      o += bananasAt(doc, P, [[R(30), on(R(30), 50), 104]]);
      o += hutsAt(doc, P, [[L(42), on(L(42), 34), 44, true]]);
      if (wide) o += bananasAt(doc, P, [[L(250), on(L(250), 46), 96]]) + hutsAt(doc, P, [[R(240), on(R(240), 40), 46, true], [R(200), on(R(200), 44), 32]]);
      o += meadow(doc, P, pts, { x0: L(0), x1: L(110 * side), depth: [40, 100], count: 5, tufts: 2, seed: 51 });
      break;
    case 6:
      o += bananasAt(doc, P, [[L(20), on(L(20), 56), 112, true]]);
      o += cow(P, R(64), on(R(64), 34), 0.85, true);
      if (wide) o += bananasAt(doc, P, [[R(230), on(R(230), 56), 110]]) + hutsAt(doc, P, [[L(230), on(L(230), 36), 50, true]]);
      o += meadow(doc, P, pts, { x0: R(120 * side), x1: R(0), depth: [50, 120], count: 5, tufts: 2, seed: 61 });
      break;
    case 7:
      o += bananasAt(doc, P, [[R(14), on(R(14), 70), 128]]);
      o += hutsAt(doc, P, [[L(52), on(L(52), 40), 56, true], [L(92), on(L(92), 46), 38]]);
      if (wide) o += bananasAt(doc, P, [[L(270), on(L(270), 66), 120, true]]) + cow(P, R(260), on(R(260), 44), 1);
      o += meadow(doc, P, pts, { x0: L(0), x1: L(130 * side), depth: [70, 150], count: 6, tufts: 2, seed: 71 });
      break;
    case 8:
      o += bananasAt(doc, P, [[L(4), on(L(4), 96), 140, true]]);
      if (wide) o += bananasAt(doc, P, [[R(40), on(R(40), 100), 150]]) + bananasAt(doc, P, [[R(250), on(R(250), 80), 110, true]]);
      o += meadow(doc, P, pts, { x0: L(0), x1: W, depth: [30, 140], count: wide ? 22 : 10, tufts: wide ? 8 : 4, seed: 81, scale: 1.1 });
      break;
  }
  return o;
}

/* ---------- Home panorama strip: transparent above the hills ---------- */

// Phones crop these wide strips from the middle (xMidYMax slice): at 150px tall a phone shows
// about x 280–1320, at 240px about x 475–1125. The best details live there; the outer parts are
// for tablets and desktops.

function homeHills(P) {
  const doc = new Doc();
  const W = 1600;
  const H = 400;
  let o = volcanoes(P, 188, [[250, 150, 40], [560, 170, 54], [740, 220, 84], [1110, 200, 64], [1420, 140, 36]]);
  const layers = [
    [172, [[0, 14], [0.12, -6], [0.3, 10], [0.46, -2], [0.62, 12], [0.8, -10], [1, 6]], 0],
    [226, [[0, -8], [0.18, 12], [0.36, -6], [0.55, 8], [0.72, -10], [0.9, 8], [1, -4]], 0.25],
    [276, [[0, 10], [0.2, -8], [0.42, 10], [0.6, -4], [0.8, 12], [1, -6]], 0.5],
    [330, [[0, -6], [0.25, 8], [0.5, -4], [0.75, 8], [1, -4]], 0.76],
    [374, [[0, 6], [0.3, -4], [0.6, 4], [1, -2]], 1],
  ];
  layers.forEach(([y, spec, t], i) => {
    const pts = ridge(W, y, spec, 0);
    const top = sampler(pts);
    const fill = i === 0 ? P.far : P.hills(t);
    o += hill(pts, H, bandFill(doc, P, `b${i}`, fill, y - 20, y + 90));
    const base = y + 80;
    if (i === 0) o += terraces(pts, [[8, 900, 1500, 0]], base, P.terrace(fill), 2);
    if (i === 1) {
      o += fieldBand(pts, [12, 28], [60, 620], base, P.field(fill), 0.1) + fieldBand(pts, [12, 26], [1000, 1560], base, P.field(fill), 0.1);
      o += terraces(pts, [[8, 40, 680, 0], [22, 100, 560, 0.1], [9, 900, 1580, 0], [24, 1040, 1600, 0.1]], base, P.terrace(fill), 2.4);
      o += hutsAt(doc, P, [[350, top(350) + 12, 28, true], [378, top(378) + 14, 20]]);
      o += hutsAt(doc, P, [[1262, top(1262) + 12, 26], [1288, top(1288) + 14, 19, true]]);
    }
    if (i === 2) {
      o += teaRows(pts, [16, 31, 46, 61].map((off) => [off, 880, 1110, 0.06]), base, P.tea(fill), 8);
      o += fieldBand(pts, [12, 30], [200, 600], base, P.field(fill), 0.1);
      o += terraces(pts, [[8, 160, 640, 0], [22, 120, 560, 0.12], [10, 1160, 1600, 0], [26, 1220, 1600, 0.1]], base, P.terrace(fill), 2.8);
      // the homestead: huts inside a woven fence, banana plants behind
      o += bananasAt(doc, P, [[648, top(648) + 12, 70, true], [826, top(826) + 14, 62]]);
      o += fence(P, 650, 822, top(736) + 44, 13, 5);
      o += hutsAt(doc, P, [[704, top(704) + 38, 72, true], [776, top(776) + 40, 54]]);
      o += cow(P, 1350, top(1350) + 26, 0.8, true);
    }
    if (i === 3) {
      o += footpath(P, [[812, 404, 36], [796, 384, 28], [770, 362, 18], [752, 348, 9], [742, top(742) + 4, 3]]);
      o += terraces(pts, [[12, 0, 560, 0], [26, 60, 440, 0.1], [12, 1000, 1600, 0]], base, P.terrace(fill), 3);
      o += bananasAt(doc, P, [[520, top(520) + 40, 128, true], [1250, top(1250) + 40, 120]]);
      o += hutsAt(doc, P, [[1060, top(1060) + 26, 62, true]]);
      o += cow(P, 1150, top(1150) + 30, 1.05, true);
    }
    if (i === 4) {
      o += meadow(doc, P, pts, { x0: 0, x1: W, depth: [8, 24], count: 30, tufts: 10, seed: 404, scale: 1.1 });
      o += bananasAt(doc, P, [[50, H + 14, 170, true], [1570, H + 10, 160]]);
    }
  });
  if (P.night) o += fireflies(doc, [[600, 300], [560, 342, 0.8], [900, 300, 0.9], [1010, 330], [1200, 296, 0.8], [380, 352], [1450, 344, 0.9], [700, 360, 0.7], [960, 262, 0.7], [860, 352, 0.8]]);
  return { doc, body: o };
}

/* ---------- Question screen: the dome hill Izuba rises behind (transparent sky) ---------- */

// Izuba stands behind the dome: center him at x=195 with his middle about 30px above the dome
// top (y≈96), so the hill hides his lower part.
function quizHill(P) {
  const doc = new Doc();
  const W = 390;
  const H = 420;
  let o = "";
  // a far ridge only peeks out at the edges, where Izuba never reaches
  o += hill([[-20, 108], [24, 98], [64, 112], [120, 150], [270, 150], [326, 110], [362, 98], [410, 106]], H, P.far);
  const dome = [[-20, 150], [40, 126], [110, 104], [195, 96], [280, 102], [350, 120], [410, 140]];
  const fill = P.hills(0.3);
  o += hill(dome, H, bandFill(doc, P, "b0", fill, 90, 230));
  o += fieldBand(dome, [16, 32], [-10, 200], 220, P.field(fill), 0.12);
  o += terraces(dome, [[10, -10, 230, 0], [26, -10, 180, 0.08], [44, 150, 400, 0.1], [62, -10, 120, 0.14]], 220, P.terrace(fill), 2.6);
  o += teaRows(dome, [20, 36, 52].map((off) => [off, 228, 352, 0.04]), 220, P.tea(fill), 7.5);
  const top = sampler(dome);
  o += hutsAt(doc, P, [[46, top(46) + 18, 40, true], [80, top(80) + 16, 28]]);
  o += bananasAt(doc, P, [[340, top(340) + 34, 80]]);
  const meadowPts = [[-20, 228], [80, 216], [200, 210], [300, 216], [410, 208]];
  o += hill(meadowPts, H, bandFill(doc, P, "b1", P.hills(0.72), 204, 330));
  o += terraces(meadowPts, [[18, -10, 250, 0]], 330, P.terrace(P.hills(0.72)), 3);
  o += meadow(doc, P, meadowPts, { x0: 0, x1: W, depth: [6, 40], count: 9, tufts: 2, seed: 77 });
  const front = [[-20, 384], [100, 376], [220, 374], [320, 378], [410, 374]];
  o += hill(front, H, P.near);
  o += meadow(doc, P, front, { x0: 0, x1: W, depth: [6, 26], count: 5, tufts: 3, seed: 78 });
  if (P.night) o += fireflies(doc, [[32, 246], [360, 262, 0.8], [210, 300, 0.7], [120, 350], [300, 336, 0.9], [62, 320, 0.7]]);
  return { doc, body: o };
}

/* ---------- Watch page: landscape along the bottom of the screen ---------- */

// The dock of big buttons sits over the middle; at 220px tall a phone shows about x 480–1120.
function watch(P) {
  const doc = new Doc();
  const W = 1600;
  const H = 360;
  let o = volcanoes(P, 150, [[300, 160, 40], [640, 190, 56], [1180, 200, 60], [1430, 120, 32]]);
  const layers = [
    [130, [[0, 6], [0.2, -8], [0.4, 8], [0.6, -6], [0.8, 10], [1, -4]], 0],
    [186, [[0, -10], [0.22, 8], [0.45, -6], [0.68, 10], [0.88, -8], [1, 4]], 0.3],
    [246, [[0, 8], [0.3, -10], [0.55, 6], [0.8, -8], [1, 6]], 0.62],
    [312, [[0, -4], [0.35, 6], [0.65, -4], [1, 4]], 1],
  ];
  layers.forEach(([y, spec, t], i) => {
    const pts = ridge(W, y, spec, 0);
    const top = sampler(pts);
    const fill = i === 0 ? P.far : P.hills(t);
    o += hill(pts, H, bandFill(doc, P, `b${i}`, fill, y - 20, y + 80));
    const base = y + 70;
    if (i === 0) o += terraces(pts, [[8, 100, 700, 0]], base, P.terrace(fill), 2);
    if (i === 1) {
      o += fieldBand(pts, [12, 28], [80, 640], base, P.field(fill), 0.1);
      o += terraces(pts, [[8, 40, 760, 0], [22, 80, 600, 0.1], [10, 900, 1600, 0], [26, 1000, 1560, 0.1]], base, P.terrace(fill), 2.4);
      o += hutsAt(doc, P, [[330, top(330) + 14, 30, true], [358, top(358) + 16, 22]]);
      o += teaRows(pts, [14, 29, 44].map((off) => [off, 900, 1120, 0.05]), base, P.tea(fill), 8);
    }
    if (i === 2) {
      o += terraces(pts, [[10, 0, 520, 0], [24, 40, 420, 0.1], [12, 1180, 1600, 0]], base, P.terrace(fill), 3);
      o += footpath(P, [[800, 364, 40], [788, 336, 28], [806, 306, 16], [826, 286, 8], [834, top(834) + 4, 3]]);
      o += bananasAt(doc, P, [[492, top(492) + 34, 104, true], [1104, top(1104) + 36, 112]]);
      o += fence(P, 538, 660, top(600) + 40, 13, 5);
      o += hutsAt(doc, P, [[580, top(580) + 34, 62, true], [636, top(636) + 36, 46]]);
      o += cow(P, 1230, top(1230) + 30, 0.9, true);
    }
    if (i === 3) {
      o += meadow(doc, P, pts, { x0: 0, x1: W, depth: [8, 36], count: 24, tufts: 8, seed: 316 });
      o += bananasAt(doc, P, [[70, H + 16, 150, true], [1540, H + 12, 140]]);
    }
  });
  if (P.night) o += fireflies(doc, [[420, 260], [520, 300, 0.8], [700, 236, 0.7], [960, 280], [1040, 240, 0.8], [1320, 290], [230, 300, 0.9], [1460, 250, 0.7], [880, 316, 0.8]]);
  return { doc, body: o };
}

export function buildWorld(write) {
  for (const [name, P] of THEMES) {
    for (const [file, W] of [["map", 390], ["map-wide", 1200]]) {
      const { doc, body } = map(P, W);
      write(`images/world/${file}-${name}.svg`, { w: W, h: 1600, body, doc, kind: "scene", par: "xMidYMin slice" });
    }
    let s = homeHills(P);
    write(`images/world/home-hills-${name}.svg`, { w: 1600, h: 400, ...s, kind: "scene", par: "xMidYMax slice" });
    s = quizHill(P);
    write(`images/world/quiz-hill-${name}.svg`, { w: 390, h: 420, ...s, kind: "scene", par: "xMidYMax slice" });
    s = watch(P);
    write(`images/world/watch-${name}.svg`, { w: 1600, h: 360, ...s, kind: "scene", par: "xMidYMax slice" });
  }
}
