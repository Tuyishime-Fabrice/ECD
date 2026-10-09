/**
 * Shared helpers for the Storybook World artwork (see docs/DESIGN.md, "Illustration rules").
 * Plain Node, no dependencies. Every generator in scripts/art builds SVG strings with these
 * and writes them through `write()`, which minifies and checks each file.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "../..");

/* ---------- numbers, colors, randomness ---------- */

/** Rounds to one decimal and drops "-0", which keeps path data short. */
export const f = (n, d = 1) => {
  const v = +(+n).toFixed(d);
  return Object.is(v, -0) ? 0 : v;
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Linear mix of two #rrggbb colors. */
export const mix = (a, b, t) =>
  "#" +
  rgb(a)
    .map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, "0"))
    .join("");

/** Deterministic random numbers, so re-running a generator gives the same picture. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- curves ---------- */

const pt = (p) => `${f(p[0])} ${f(p[1])}`;

/** Bezier segments of a Catmull-Rom spline through `pts`. */
function segments(pts, closed = false, tension = 1) {
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const k = tension / 6;
    segs.push([p1, [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k], p2]);
  }
  return segs;
}

/** A smooth path through points ("M…C…", plus "Z" when closed). */
export function curve(pts, { closed = false, tension = 1 } = {}) {
  let [cx, cy] = [f(pts[0][0]), f(pts[0][1])];
  let d = `M${nums([cx, cy])}`;
  // Relative commands with compact numbers keep the big scenes small.
  for (const [, ...ps] of segments(pts, closed, tension)) {
    const q = ps.map(([x, y]) => [f(x), f(y)]);
    d += "c" + nums(q.flatMap(([x, y]) => [f(x - cx), f(y - cy)]));
    [cx, cy] = q[2];
  }
  return d + (closed ? "Z" : "");
}

/** Joins numbers the way SVG path data allows: "1.5-2 .5" → "1.5-2.5" style, no leading zeros. */
export function nums(list) {
  let s = "";
  for (const v of list) {
    const t = String(v).replace(/^(-?)0\./, "$1.");
    if (s && !(t[0] === "-" || (t[0] === "." && /\.\d*$/.test(s.split(/[\s-]/).pop())))) s += " ";
    s += t;
  }
  return s;
}

const bez = (s, t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * s[0][i] + 3 * u * u * t * s[1][i] + 3 * u * t * t * s[2][i] + t * t * t * s[3][i]);
};

/** y of the smooth curve through `pts` at any x (the curve must run left to right). */
export function sampler(pts) {
  const table = [];
  for (const s of segments(pts)) for (let k = 0; k < 24; k++) table.push(bez(s, k / 24));
  table.push(pts[pts.length - 1]);
  return (x) => {
    if (x <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      const [x1, y1] = table[i];
      if (x <= x1) {
        const [x0, y0] = table[i - 1];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
      }
    }
    return table[table.length - 1][1];
  };
}

/* ---------- documents ---------- */

/** Collects the <defs> a picture needs, so each file only carries what it uses. */
export class Doc {
  constructor() {
    this.defs = new Map();
  }
  /** Adds a definition once and returns its id. */
  def(id, make) {
    if (!this.defs.has(id)) this.defs.set(id, typeof make === "function" ? make(id) : make);
    return id;
  }
  get defsMarkup() {
    return this.defs.size ? `<defs>${[...this.defs.values()].join("")}</defs>` : "";
  }
}

export const linear = (id, stops, [x1, y1, x2, y2] = [0, 0, 0, 1], extra = "") =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stopsMarkup(stops)}</linearGradient>`;
export const radial = (id, stops, [cx, cy, r] = [0.5, 0.5, 0.5], extra = "") =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${extra}>${stopsMarkup(stops)}</radialGradient>`;
function stopsMarkup(stops) {
  return stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined || a === 1 ? "" : ` stop-opacity="${a}"`}/>`)
    .join("");
}

const written = [];
const LIMITS = { scene: 45 * 1024, object: 15 * 1024 };

/**
 * Writes public/<rel> as a minified SVG and checks the house rules: no <text>, no embedded
 * raster, no duplicate ids, and the size budget (scenes ~45 KB, objects ~15 KB).
 */
export function write(rel, { w, h, body, doc, par, kind = "object", root = "" }) {
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${par ? ` preserveAspectRatio="${par}"` : ""}${root}>`;
  const svg = (head + (doc ? doc.defsMarkup : "") + body + "</svg>\n").replace(/\n\s*/g, "").replace(/>\s+</g, "><") + "\n";
  const problems = [];
  if (/<text[\s>]/.test(svg)) problems.push("contains <text>");
  if (/<image[\s>]|data:image/.test(svg)) problems.push("embeds a raster image");
  // A repeated attribute makes the whole file invalid XML, and browsers then show nothing.
  for (const [tag] of svg.matchAll(/<[a-zA-Z][^>]*>/g)) {
    const names = [...tag.matchAll(/\s([\w:-]+)=/g)].map((m) => m[1]);
    const twice = names.filter((n, i) => names.indexOf(n) !== i);
    if (twice.length) problems.push(`repeated attribute ${twice[0]} in ${tag.slice(0, 40)}…`);
  }
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate ids: ${[...new Set(dupes)].join(", ")}`);
  for (const [, ref] of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) if (!ids.includes(ref)) problems.push(`missing #${ref}`);
  const size = Buffer.byteLength(svg);
  if (size > LIMITS[kind] && !process.env.ART_NO_LIMIT) problems.push(`${(size / 1024).toFixed(1)} KB is over the ${kind} budget`);
  if (problems.length) throw new Error(`${rel}: ${[...new Set(problems)].join("; ")}`);
  const file = join(ROOT, "public", rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg);
  written.push([relative(ROOT, file), size]);
  return svg;
}

export function report() {
  for (const [file, size] of written) console.log(`${(size / 1024).toFixed(1).padStart(5)} KB  ${file}`);
  console.log(`${written.length} files`);
}

/* ---------- glyphs (Baloo 2 ExtraBold outlines; fonts don't load inside <img> SVGs) ---------- */

const DIGITS = JSON.parse(readFileSync(join(HERE, "digits.json"), "utf8")).digits;
export const GLYPHS = { ...DIGITS, ...JSON.parse(readFileSync(join(HERE, "glyphs.json"), "utf8")).glyphs };

/** Glyph outlines for `text`, centered on x=0 with the baseline at y=0, in font units (100/em). */
export function glyphRun(text, gap = -3) {
  let x = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  const parts = [];
  for (const ch of String(text)) {
    const g = GLYPHS[ch];
    parts.push([x, g.d]);
    minX = Math.min(minX, x + g.bbox[0]);
    maxX = Math.max(maxX, x + g.bbox[2]);
    x += g.advance + gap;
  }
  const dx = -(minX + maxX) / 2;
  return { width: maxX - minX, paths: parts.map(([px, d]) => ({ x: px + dx, d })) };
}

/** Text as one filled path group (transform-positioned) at `size` px cap height. */
export function glyphs(text, { x, y, size, fill, extra = "", gap }) {
  const run = glyphRun(text, gap);
  const s = size / 62;
  const inner = run.paths.map((p) => `<path transform="translate(${f(p.x)} 0)" d="${p.d}"/>`).join("");
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s, 3)})" fill="${fill}"${extra}>${inner}</g>`;
}

/**
 * A "toy-block" numeral: Baloo 800 with a darker offset extrusion, a thin warm outline
 * and one highlight stroke (DESIGN.md, "Numerals").
 */
export function toyNumeral(doc, text, { x, y, size, color, deep, ink = OUTLINE, id }) {
  const run = glyphRun(text);
  const s = size / 62;
  const shape = run.paths.map((p) => `<path transform="translate(${f(p.x)} 0)" d="${p.d}"/>`).join("");
  doc.def(id, `<g id="${id}">${shape}</g>`);
  const depth = size * 0.075;
  const sw = 3.2 / s;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s, 3)})" stroke-linejoin="round">
    <use href="#${id}" y="${f(depth / s)}" fill="${deep}" stroke="${ink}" stroke-width="${f(sw, 2)}"/>
    <use href="#${id}" y="${f(depth / s / 2)}" fill="${deep}"/>
    <use href="#${id}" fill="${color}" stroke="${ink}" stroke-width="${f(sw, 2)}" paint-order="stroke"/>
  </g>`;
}

/* ---------- palettes ---------- */

export const OUTLINE = "#5A3112";
export const INK = "#3A1F0E";

export const DAY = {
  night: false,
  sky: [
    [0, "#9FD6F0"],
    [0.3, "#D6EEF1"],
    [0.56, "#FFE5C2"],
    [0.78, "#FFD49E"],
  ],
  glow: [
    [0, "#FFF6D2"],
    [0.45, "#FFE9B0", 0.8],
    [1, "#FFE0A6", 0],
  ],
  far: "#D5DDB6",
  volcano: "#DCDCE8",
  near: "#58AB5D",
  /** far → near hill fills */
  hills: (t) => mix(mix("#D3DDB4", "#58AB5D", t), "#6BBF5E", Math.sin(Math.PI * t) * 0.18),
  terrace: (c) => mix(c, "#F4FBE6", 0.3),
  field: (c) => mix(c, "#E9F3C8", 0.22),
  tea: (c) => mix(c, "#3E9A4E", 0.22),
  tuft: "#479C51",
  flowers: ["#FFF6E2", "#FFB39C", "#FFE08A"],
  flowerEye: "#FFC23A",
  road: ["#D6B178", "#F4E2BB"],
  hut: { body: "#D9A156", shade: "#C2873E", band: "#B57A35", door: "#6E4122", tip: "#8A5A2B" },
  fence: "#B98A4E",
  banana: {
    trunk: "#7FA24A",
    trunkLight: "#96BA5C",
    leaves: ["#2E8443", "#3F9B52", "#43A457", "#5CBE6C"],
    ribs: ["#5DAF68", "#7CC67F", "#86CC87", "#A6DB98"],
    stalk: "#6F8F3C",
    hands: "#CBD458",
    bud: "#9A3C62",
    budLine: "#C5648A",
  },
  cloud: ["#FFFFFF", "#FFE6D2"],
  cow: { body: "#9A5A33", light: "#C98B5C", horn: "#F3E6CC", dark: "#5E3418" },
};

export const NIGHT = {
  night: true,
  sky: [
    [0, "#0B1533"],
    [0.55, "#1B2150"],
    [1, "#2B2F63"],
  ],
  glow: [
    [0, "#FFF4C8", 0.32],
    [0.4, "#BFC7FF", 0.12],
    [1, "#8D96E8", 0],
  ],
  far: "#2F4B70",
  volcano: "#29366A",
  near: "#123D30",
  hills: (t) => mix(mix("#2E4C6F", "#123D30", t), "#18574B", Math.sin(Math.PI * t) * 0.35),
  terrace: (c) => mix(c, "#9CC6D8", 0.16),
  field: (c) => mix(c, "#5E8FA6", 0.1),
  tea: (c) => mix(c, "#071F1A", 0.3),
  tuft: "#0E3328",
  flowers: ["#8F8AC4", "#7468B0", "#B9B08A"],
  flowerEye: "#E9C25A",
  road: ["#264A4C", "#34605E"],
  hut: { body: "#6B5552", shade: "#55423F", band: "#4B3A39", door: "#2A1D1C", tip: "#3F302E" },
  fence: "#4A3E43",
  banana: {
    trunk: "#2F5A49",
    trunkLight: "#3B6C55",
    leaves: ["#123F35", "#195042", "#1C5847", "#24684F"],
    ribs: ["#2A5F4F", "#33705C", "#387A62", "#46896B"],
    stalk: "#2C4A3A",
    hands: "#6E7A45",
    bud: "#5A2648",
    budLine: "#7E4466",
  },
  cloud: ["#323C78", "#262E62"],
  cow: { body: "#4A3A44", light: "#5E4C55", horn: "#B9B2B8", dark: "#2A2028" },
};

/* ---------- environment symbols (flat, no outlines) ---------- */

/** Banana plant: paddle leaves with midribs and wind tears, a hand of bananas and a purple bud. */
export function bananaSymbol(doc, P) {
  const id = P.night ? "bpn" : "bp";
  return doc.def(id, () => {
    const B = P.banana;
    const leaf = (spine, W, tears, fill, rib) => {
      const N = 22;
      const L = [];
      const R = [];
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const p = bez(spine, t);
        const q = bez(spine, Math.min(1, t + 0.01));
        const q0 = bez(spine, Math.max(0, t - 0.01));
        let dx = q[0] - q0[0];
        let dy = q[1] - q0[1];
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        let w = t < 0.12 ? W * 0.12 * (t / 0.12) + 1.2 : W * Math.pow(Math.sin(Math.PI * Math.min(1, t - 0.04)), 0.55);
        if (t > 0.9) w *= 1 - (t - 0.9) * 6;
        let wl = w;
        let wr = w;
        for (const [tt, side, depth] of tears) {
          const d = Math.abs(t - tt);
          if (d < 0.035) {
            const cut = (1 - d / 0.035) * depth;
            if (side < 0) wl *= 1 - cut;
            else wr *= 1 - cut;
          }
        }
        L.push([p[0] - dy * wl, p[1] + dx * wl]);
        R.push([p[0] + dy * wr, p[1] - dx * wr]);
      }
      const d = "M" + [...L, ...R.reverse()].map(pt).join("L") + "Z";
      const tip = bez(spine, 0.86);
      return `<path d="${d}" fill="${fill}"/><path d="M${pt(spine[0])}C${pt(spine[1])} ${pt(spine[2])} ${pt(tip)}" fill="none" stroke="${rib}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
    };
    const C = [72, 92];
    const leaves = [
      leaf([C, [50, 64], [22, 56], [8, 98]], 9, [[0.55, 1, 0.8], [0.72, -1, 0.7]], B.leaves[0], B.ribs[0]),
      leaf([C, [96, 62], [120, 58], [132, 100]], 9, [[0.6, -1, 0.8]], B.leaves[0], B.ribs[0]),
      leaf([C, [60, 50], [34, 22], [12, 26]], 10, [[0.5, 1, 0.85], [0.7, 1, 0.6]], B.leaves[1], B.ribs[1]),
      leaf([C, [86, 48], [112, 22], [132, 30]], 10, [[0.58, -1, 0.85]], B.leaves[2], B.ribs[2]),
      leaf([C, [74, 60], [80, 28], [92, 4]], 7.5, [[0.62, 1, 0.6]], B.leaves[3], B.ribs[3]),
    ];
    return `<symbol id="${id}" viewBox="0 0 140 190">
      <path d="M62 190C61 156 63 124 67 90H79C82 124 84 156 84 190Z" fill="${B.trunk}"/>
      <path d="M69 190C68 158 70 126 72 92H76C77 126 76 158 77 190Z" fill="${B.trunkLight}"/>
      ${leaves.join("")}
      <path d="M74 94C79 102 81 110 81 122" fill="none" stroke="${B.stalk}" stroke-width="3" stroke-linecap="round"/>
      <g fill="${B.hands}"><path d="M76 103C70 101 66 106 67 113C70 110 73 108 78 108Z"/><path d="M78 108C72 107 69 112 70 119C73 116 76 114 81 113Z"/><path d="M80 113C75 113 72 118 74 124C76 121 79 119 84 118Z"/><path d="M84 104C90 101 94 106 93 113C90 110 87 108 82 108Z"/><path d="M85 109C91 107 94 112 93 119C90 116 87 114 83 114Z"/></g>
      <path d="M81 121C87 124 88 136 81 141C74 136 75 124 81 121Z" fill="${B.bud}"/>
      <path d="M79 126C78 130 78 133 79 136" fill="none" stroke="${B.budLine}" stroke-width="1.6" stroke-linecap="round"/>
    </symbol>`;
  });
}
export const BANANA_RATIO = 190 / 140;

/** Beehive "inzu" hut. At night `lit` gives it a warm glowing doorway. */
export function hutSymbol(doc, P, lit = false) {
  const id = P.night ? (lit ? "hutl" : "hutn") : "hut";
  if (lit) doc.def("doorglow", radial("doorglow", [[0, "#FFD27A", 0.75], [0.5, "#FFB547", 0.25], [1, "#FFB547", 0]]));
  return doc.def(id, () => {
    const H = P.hut;
    const door = lit
      ? `<ellipse cx="50" cy="80" rx="30" ry="22" fill="url(#doorglow)"/><path d="M40 90V72C40 62 60 62 60 72V90Z" fill="#FFC861"/><path d="M43 90V73C43 66 57 66 57 73V90Z" fill="#FFE3A0"/>`
      : `<path d="M40 90V72C40 62 60 62 60 72V90Z" fill="${H.door}"/>`;
    return `<symbol id="${id}" viewBox="0 0 100 92" overflow="visible">
      <path d="M6 90C6 50 28 18 50 8C72 18 94 50 94 90Z" fill="${H.body}"/>
      <path d="M50 8C72 18 94 50 94 90H74C76 54 66 26 50 8Z" fill="${H.shade}"/>
      <path d="M14 64C30 58 70 58 86 64M20 46C34 40 66 40 80 46M30 30C40 26 60 26 70 30" fill="none" stroke="${H.band}" stroke-width="3" stroke-linecap="round" opacity=".75"/>
      ${door}
      <path d="M50 0L54 11H46Z" fill="${H.tip}"/>
    </symbol>`;
  });
}
export const HUT_RATIO = 92 / 100;

export function cloudSymbol(doc, P) {
  const id = P.night ? "cln" : "cl";
  return doc.def(
    id,
    `<symbol id="${id}" viewBox="0 0 120 46"><path d="M14 44C2 44 0 28 12 25C12 12 28 6 38 14C44 2 66 0 74 12C84 4 102 10 100 24C114 24 118 44 104 44Z" fill="${P.cloud[0]}"/><path d="M14 44C8 44 5 40 6 36C20 40 90 40 114 36C114 40 110 44 104 44Z" fill="${P.cloud[1]}" opacity=".8"/></symbol>`,
  );
}

export function flowerSymbol(doc, P) {
  return doc.def(
    "fl",
    `<symbol id="fl" viewBox="0 0 20 20"><g fill="currentColor"><circle cx="10" cy="5" r="4.2"/><circle cx="15" cy="10" r="4.2"/><circle cx="10" cy="15" r="4.2"/><circle cx="5" cy="10" r="4.2"/></g><circle cx="10" cy="10" r="3.2" fill="${P.flowerEye}"/></symbol>`,
  );
}

export function tuftSymbol(doc) {
  return doc.def(
    "tf",
    `<symbol id="tf" viewBox="0 0 30 16"><path d="M2 16C4 10 6 6 9 4C9 9 10 12 12 16ZM10 16C12 8 15 3 19 0C18 7 18 11 19 16ZM17 16C20 10 24 7 28 6C26 10 24 13 24 16Z" fill="currentColor"/></symbol>`,
  );
}

export function fireflySymbol(doc) {
  doc.def("ffg", radial("ffg", [[0, "#FFE38A", 0.85], [0.35, "#FFD45E", 0.35], [1, "#FFD45E", 0]]));
  return doc.def("ff", `<symbol id="ff" viewBox="-8 -8 16 16" overflow="visible"><circle r="8" fill="url(#ffg)"/><circle r="1.7" fill="#FFF1B0"/></symbol>`);
}

/** <use> of a symbol; `w` sets the width and the height follows the symbol's ratio. */
export function place(id, x, y, w, ratio, { flip = false, extra = "" } = {}) {
  const h = w * ratio;
  if (!flip) return `<use href="#${id}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${extra}/>`;
  return `<use href="#${id}" transform="matrix(-1 0 0 1 ${f(2 * x + w)} 0)" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${extra}/>`;
}
/** Places a symbol by the middle of its bottom edge (handy for things that stand on hills). */
export const stand = (id, cx, by, w, ratio, opts) => place(id, cx - w / 2, by - w * ratio, w, ratio, opts);

/* ---------- landscape ---------- */

/** A filled hill: smooth top through `pts`, straight down to `bottom`. */
export const hill = (pts, bottom, fill, extra = "") =>
  `<path d="${curve(pts)}V${f(bottom)}H${f(pts[0][0])}Z" fill="${fill}"${extra}/>`;

/**
 * Contour lines that follow a hill's top (terraces and tea rows). Each line is
 * [offset below the top, x from, x to, flatten 0..1 toward the flat level `base`].
 */
export function contours(pts, lines, base) {
  const top = sampler(pts);
  return lines
    .map(([off, x0, x1, k = 0]) => {
      const n = Math.max(3, Math.round(Math.abs(x1 - x0) / 80));
      const p = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = top(x) + off;
        p.push([x, y + (base - y) * k]);
      }
      return curve(p);
    })
    .join("");
}

/** Light terrace strokes on a hill. */
export const terraces = (pts, lines, base, color, width = 3) =>
  `<path d="${contours(pts, lines, base)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

/** Tea hedgerows: rows of round bushes along contours. */
export const teaRows = (pts, lines, base, color, size = 8) =>
  `<path d="${contours(pts, lines, base)}" fill="none" stroke="${color}" stroke-width="${size}" stroke-linecap="round" stroke-dasharray="0.1 ${f(size * 0.82)}"/>`;

/** A band between two contours, for terraced fields of a slightly different green. */
export function fieldBand(pts, [off1, off2], [x0, x1], base, color, k = 0) {
  const top = sampler(pts);
  // The lower edge eases into the upper one at both ends, so a field tapers like a terrace.
  const line = (lower) => {
    const n = Math.max(4, Math.round(Math.abs(x1 - x0) / 70));
    const p = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = x0 + (x1 - x0) * u;
      const off = lower ? off1 + (off2 - off1) * Math.pow(Math.sin(Math.PI * u), 0.6) : off1;
      const y = top(x) + off;
      p.push([x, y + (base - y) * k]);
    }
    return lower ? p.reverse() : p;
  };
  return `<path d="${curve(line(false))}L${curve(line(true)).slice(1)}Z" fill="${color}"/>`;
}

/** Vertical gradient for a hill band: lit at the crest, deeper toward its foot. */
export function bandFill(doc, P, id, color, y0, y1) {
  const crest = P.night ? mix(color, "#86AFCF", 0.16) : mix(color, "#FBF6CF", 0.2);
  const foot = P.night ? mix(color, "#04121A", 0.22) : mix(color, "#2E7A43", 0.12);
  doc.def(id, linear(id, [[0, crest], [1, foot]], [0, f(y0), 0, f(y1)], ' gradientUnits="userSpaceOnUse"'));
  return `url(#${id})`;
}

/** Meadow flowers and grass tufts scattered on a hill, seeded. */
export function meadow(doc, P, pts, { x0, x1, depth = [8, 60], count = 8, tufts = 4, seed = 1, scale = 1 }) {
  const fl = flowerSymbol(doc, P);
  const tf = tuftSymbol(doc);
  const top = sampler(pts);
  const r = rng(seed);
  const byColor = new Map();
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * r();
    const y = top(x) + depth[0] + (depth[1] - depth[0]) * r();
    const s = (8 + r() * 5) * scale;
    const c = P.flowers[Math.floor(r() * P.flowers.length)];
    if (!byColor.has(c)) byColor.set(c, []);
    byColor.get(c).push(place(fl, x - s / 2, y - s / 2, s, 1, { extra: P.night ? ` opacity="${f(0.5 + r() * 0.3, 2)}"` : "" }));
  }
  let out = [...byColor].map(([c, uses]) => `<g color="${c}">${uses.join("")}</g>`).join("");
  const t = [];
  for (let i = 0; i < tufts; i++) {
    const x = x0 + (x1 - x0) * r();
    const y = top(x) + depth[0] + (depth[1] - depth[0]) * r();
    const w = (24 + r() * 8) * scale;
    t.push(place(tf, x - w / 2, y - w * 0.53, w, 16 / 30));
  }
  out += `<g color="${P.tuft}">${t.join("")}</g>`;
  return out;
}

/** Fireflies: tiny gold dots with a soft glow. */
export function fireflies(doc, spots) {
  const ff = fireflySymbol(doc);
  return spots
    .map(([x, y, s = 1]) => `<use href="#${ff}" x="${f(x - 8 * s)}" y="${f(y - 8 * s)}" width="${f(16 * s)}" height="${f(16 * s)}"/>`)
    .join("");
}

/** Stars over a night sky: many small dots, a few twinkles. */
export function stars({ x0, y0, x1, y1, count, seed, avoid = [], twinkles = 4 }) {
  const r = rng(seed);
  const groups = [[], [], []];
  const tw = [];
  let tries = 0;
  while (groups.flat().length < count && tries++ < count * 20) {
    const x = x0 + (x1 - x0) * r();
    const y = y0 + (y1 - y0) * Math.pow(r(), 1.4);
    if (avoid.some(([ax, ay, ar]) => Math.hypot(x - ax, y - ay) < ar)) continue;
    const g = Math.floor(r() * 3);
    const rad = [0.9, 1.3, 1.8][g] * (0.85 + r() * 0.3);
    groups[g].push(`M${nums([f(x - rad), f(y)])}a${nums([f(rad), f(rad)])} 0 1 0 ${nums([f(rad * 2)])} 0a${nums([f(rad), f(rad)])} 0 1 0 ${nums([f(-rad * 2)])} 0`);
  }
  for (let i = 0; i < twinkles; i++) {
    let x;
    let y;
    let n = 0;
    do {
      x = x0 + (x1 - x0) * r();
      y = y0 + (y1 - y0) * r() * 0.8;
    } while (avoid.some(([ax, ay, ar]) => Math.hypot(x - ax, y - ay) < ar + 10) && n++ < 50);
    const s = 5 + r() * 3;
    tw.push(`M${f(x)} ${f(y - s)}C${f(x + s * 0.12)} ${f(y - s * 0.12)} ${f(x + s * 0.12)} ${f(y - s * 0.12)} ${f(x + s)} ${f(y)}C${f(x + s * 0.12)} ${f(y + s * 0.12)} ${f(x + s * 0.12)} ${f(y + s * 0.12)} ${f(x)} ${f(y + s)}C${f(x - s * 0.12)} ${f(y + s * 0.12)} ${f(x - s * 0.12)} ${f(y + s * 0.12)} ${f(x - s)} ${f(y)}C${f(x - s * 0.12)} ${f(y - s * 0.12)} ${f(x - s * 0.12)} ${f(y - s * 0.12)} ${f(x)} ${f(y - s)}Z`);
  }
  return (
    `<path d="${groups[0].join("")}" fill="#E9E6FF" opacity=".55"/>` +
    `<path d="${groups[1].join("")}" fill="#FFF6DD" opacity=".75"/>` +
    `<path d="${groups[2].join("")}" fill="#FFF8E6"/>` +
    (tw.length ? `<path d="${tw.join("")}" fill="#FFF1C2"/>` : "")
  );
}

/** A crescent moon with a soft halo, lit from the left. */
export function moon(doc, cx, cy, R) {
  doc.def("moonhalo", radial("moonhalo", [[0, "#FFF6CF", 0.42], [0.3, "#E7E4FF", 0.16], [1, "#C9C8FF", 0]]));
  doc.def("moonfill", linear("moonfill", [[0, "#FFFBE6"], [1, "#FFE9A6"]], [0, 0, 1, 1]));
  // Inner circle shifted right and up carves the crescent.
  const ix = cx + R * 0.52;
  const iy = cy - R * 0.28;
  const r2 = R * 0.9;
  const d = Math.hypot(ix - cx, iy - cy);
  const a = (R * R - r2 * r2 + d * d) / (2 * d);
  const hgt = Math.sqrt(R * R - a * a);
  const mx = cx + (a * (ix - cx)) / d;
  const my = cy + (a * (iy - cy)) / d;
  const p1 = [mx + (hgt * (iy - cy)) / d, my - (hgt * (ix - cx)) / d];
  const p2 = [mx - (hgt * (iy - cy)) / d, my + (hgt * (ix - cx)) / d];
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 3.4)}" fill="url(#moonhalo)"/>` +
    `<path d="M${pt(p1)}A${f(R)} ${f(R)} 0 1 0 ${pt(p2)}A${f(r2)} ${f(r2)} 0 0 1 ${pt(p1)}Z" fill="url(#moonfill)"/>` +
    `<circle cx="${f(cx - R * 0.55)}" cy="${f(cy + R * 0.12)}" r="${f(R * 0.12)}" fill="#F2DC94" opacity=".7"/>` +
    `<circle cx="${f(cx - R * 0.3)}" cy="${f(cy + R * 0.55)}" r="${f(R * 0.08)}" fill="#F2DC94" opacity=".6"/>`
  );
}

/** A sky rectangle with the theme's gradient (and the sunrise glow by day). */
export function sky(doc, P, w, h, { glow } = {}) {
  doc.def("sky", linear("sky", P.sky));
  let out = `<rect width="${w}" height="${f(h)}" fill="url(#sky)"/>`;
  if (glow) {
    doc.def("glow", radial("glow", P.glow));
    out += `<circle cx="${f(glow[0])}" cy="${f(glow[1])}" r="${f(glow[2])}" fill="url(#glow)"/>`;
  }
  return out;
}

/** Distant Virunga volcano cones on the horizon: concave flanks, a small crater, a shaded right side. */
export function volcanoes(P, base, cones) {
  let lit = "";
  let shade = "";
  for (const [cx, wd, ht] of cones) {
    const top = base - ht;
    const c = wd * 0.09;
    lit += `M${nums([f(cx - wd), f(base)])}C${nums([f(cx - wd * 0.45), f(base - ht * 0.14), f(cx - wd * 0.2), f(top + ht * 0.2), f(cx - c), f(top)])}Q${nums([f(cx), f(top + 2.5), f(cx + c), f(top)])}C${nums([f(cx + wd * 0.2), f(top + ht * 0.2), f(cx + wd * 0.45), f(base - ht * 0.14), f(cx + wd), f(base)])}Z`;
    shade += `M${nums([f(cx + c * 0.4), f(top + 1)])}C${nums([f(cx + wd * 0.2), f(top + ht * 0.2), f(cx + wd * 0.45), f(base - ht * 0.14), f(cx + wd), f(base)])}H${nums([f(cx + wd * 0.12)])}C${nums([f(cx + wd * 0.1), f(base - ht * 0.4), f(cx + c), f(top + ht * 0.3), f(cx + c * 0.4), f(top + 1)])}Z`;
  }
  return `<path d="${lit}" fill="${P.volcano}"/><path d="${shade}" fill="${P.night ? "#22305F" : "#CACDDF"}"/>`;
}

/** A short woven-stick fence (urugo) around a homestead, flat style. */
export function fence(P, x0, x1, groundY, h = 16, step = 5) {
  let d = "";
  for (let x = x0; x <= x1; x += step) {
    const hh = h * (0.85 + 0.15 * Math.sin(x * 1.7));
    d += `M${f(x)} ${f(groundY)}V${f(groundY - hh)}`;
  }
  return `<path d="${d}" stroke="${P.fence}" stroke-width="2.6" stroke-linecap="round"/><path d="M${f(x0 - 2)} ${f(groundY - h * 0.55)}H${f(x1 + 2)}M${f(x0 - 2)} ${f(groundY - h * 0.25)}H${f(x1 + 2)}" stroke="${P.fence}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
}

/** Inyambo cow, the long-horned cattle of Rwanda, flat side view facing right (about 70×60, feet at 0). */
export function cow(P, x, y, s = 1, flip = false) {
  const C = P.cow;
  const t = `translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s, 2)} ${f(s, 2)})`;
  return `<g transform="${t}">
    <path d="M-17-12V0M-10-11V0M11-11V0M17-12V0" stroke="${C.dark}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M-24-17C-27-12-27-6-25-2" fill="none" stroke="${C.dark}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M-23-14C-25-24-19-29-8-29H8C12-33 18-33 21-29C25-26 25-18 22-13C18-9 12-9 4-9H-14C-19-9-22-10-23-14Z" fill="${C.body}"/>
    <path d="M-15-11C-6-14 8-14 16-11C8-9-6-9-15-11Z" fill="${C.light}" opacity=".7"/>
    <path d="M19-28C22-32 28-33 31-30L35-21C36-18 34-16 31-16C27-16 24-19 21-22Z" fill="${C.body}"/>
    <ellipse cx="32.5" cy="-18.5" rx="3.6" ry="3" fill="${C.light}"/>
    <path d="M20-29C17-31 15-31 14-29C16-28 18-27 20-27Z" fill="${C.dark}"/>
    <path d="M24-31C21-38 21-46 27-52M26-31C32-37 38-39 44-36" fill="none" stroke="${C.horn}" stroke-width="2.6" stroke-linecap="round"/>
  </g>`;
}

/** A tapering ribbon (a footpath going into the distance) along [x, y, width] points. */
export function ribbon(points, fill) {
  const left = [];
  const right = [];
  points.forEach(([x, y, w], i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    left.push([x - dy * w * 0.5, y + dx * w * 0.5]);
    right.push([x + dy * w * 0.5, y - dx * w * 0.5]);
  });
  return `<path d="${curve(left)}L${curve(right.reverse()).slice(1)}Z" fill="${fill}"/>`;
}

/** A footpath: sandy ribbon with a darker edge. */
export const footpath = (P, points) =>
  ribbon(points.map(([x, y, w]) => [x, y, w + 5]), P.road[0]) + ribbon(points, P.road[1]);
