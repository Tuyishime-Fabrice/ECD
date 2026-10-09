/**
 * Story objects: fruit, baskets, animals, a mango tree, a mat and a market stall.
 * Objects carry the warm-brown outline; trees are environment (flat, no outline).
 */
import { OUTLINE, f, linear, mix, radial } from "./lib.mjs";

const OW = 4;

/* ---------- fruit: drawn once per file in a 100×100 box, placed with a constant outline ---------- */

const FRUIT = {
  mango: (doc) => {
    doc.def("g-mango", linear("g-mango", [[0.1, "#9BCB45"], [0.5, "#FFC93C"], [1, "#FF9234"]], [0, 0, 1, 1]));
    return `<g transform="rotate(-28 50 52)"><path d="M10 54C9 36 28 25 50 25C74 25 92 37 91 55C90 69 79 77 66 79C56 81 48 84 38 82C22 79 11 69 10 54Z" fill="url(#g-mango)"/><path d="M24 44C31 36 41 33 52 33" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5.5" stroke-linecap="round"/><path d="M11 50C7 48 4 45 3 41" fill="none" stroke-linecap="round"/></g>`;
  },
  orange: (doc) => {
    doc.def("g-orange", radial("g-orange", [[0, "#FFC46E"], [0.6, "#FF9A2E"], [1, "#F07A12"]], [0.38, 0.35, 0.75]));
    return `<circle cx="50" cy="57" r="34" fill="url(#g-orange)"/><path d="M30 48C32 40 38 34 46 32" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5.5" stroke-linecap="round"/><g fill="#E0711A" stroke="none"><circle cx="62" cy="50" r="2"/><circle cx="56" cy="72" r="2"/><circle cx="71" cy="64" r="2"/><circle cx="42" cy="70" r="2"/></g><path d="M50 23C50 17 52 13 55 11" fill="none" stroke-linecap="round"/><path d="M54 18C62 8 76 10 81 16C71 23 61 23 54 18Z" fill="#3DAE6B"/>`;
  },
  banana: (doc) => {
    doc.def("g-banana", linear("g-banana", [[0, "#FFE26A"], [1, "#F8B91E"]], [0, 0, 1, 1]));
    return `<path d="M18 30C16 62 40 84 76 80C84 79 86 72 80 70C54 72 34 56 30 30C29 24 19 24 18 30Z" fill="url(#g-banana)"/><path d="M28 42C34 58 46 66 62 70" fill="none" stroke="#E2A21A" stroke-width="3.5" stroke-linecap="round"/><path d="M22 36C22 48 26 56 32 64" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4.5" stroke-linecap="round"/><path d="M21 28L20 18H27L28 28Z" fill="#8A6A2E"/>`;
  },
  avocado: (doc) => {
    doc.def("g-avo", linear("g-avo", [[0, "#5C9E44"], [1, "#3B7631"]], [0, 0, 1, 1]));
    return `<path d="M50 8C64 8 66 30 76 46C88 66 78 92 50 92C22 92 12 66 24 46C34 30 36 8 50 8Z" fill="url(#g-avo)"/><path d="M50 18C60 18 61 36 69 49C78 64 71 84 50 84C29 84 22 64 31 49C39 36 40 18 50 18Z" fill="#DCEE93" stroke="none"/><circle cx="50" cy="62" r="14" fill="#9A5B2E"/><circle cx="45" cy="57" r="4" fill="#C98552" stroke="none"/>`;
  },
};

/** One piece of fruit centered at (x, y), `size` across, with the same outline at any size. */
export function fruit(doc, kind, x, y, size, rot = 0) {
  const id = `fr-${kind}`;
  doc.def(id, () => `<g id="${id}" stroke="${OUTLINE}" stroke-linejoin="round">${FRUIT[kind](doc)}</g>`);
  const k = size / 100;
  return `<use href="#${id}" transform="translate(${f(x - size / 2)} ${f(y - size / 2)}) scale(${f(k, 3)})${rot ? ` rotate(${rot} 50 50)` : ""}" stroke-width="${f(OW / k, 2)}"/>`;
}

/* ---------- baskets ---------- */

/**
 * An open woven bowl basket (igiseke) with imigongo bands. `inside` is drawn between the back
 * rim and the front, so fruit sits in the basket.
 */
export function basket(doc, cx, cy, w, h, inside = "", id = "bk", bands = [0.42, 0.64]) {
  doc.def("g-basket", linear("g-basket", [[0, "#F0BE6E"], [1, "#C98B40"]], [0, 0, 0, 1]));
  const rx = w / 2;
  const ry = h * 0.16;
  const body = `M${f(cx - rx)} ${f(cy)}C${f(cx - rx)} ${f(cy + h * 0.62)} ${f(cx - rx * 0.5)} ${f(cy + h)} ${f(cx)} ${f(cy + h)}C${f(cx + rx * 0.5)} ${f(cy + h)} ${f(cx + rx)} ${f(cy + h * 0.62)} ${f(cx + rx)} ${f(cy)}C${f(cx + rx * 0.8)} ${f(cy + ry * 1.2)} ${f(cx - rx * 0.8)} ${f(cy + ry * 1.2)} ${f(cx - rx)} ${f(cy)}Z`;
  doc.def(id, `<clipPath id="${id}"><path d="${body}"/></clipPath>`);
  const zig = (yy, amp, color, sw) => {
    let d = `M${f(cx - rx - 10)} ${f(yy)}`;
    const n = Math.round(w / (amp * 2.2));
    const step = (w + 20) / n;
    for (let i = 1; i <= n; i++) d += `L${f(cx - rx - 10 + i * step - step / 2)} ${f(yy - amp)}L${f(cx - rx - 10 + i * step)} ${f(yy)}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="miter"/>`;
  };
  return (
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#8E5A22" stroke="${OUTLINE}" stroke-width="${OW}"/>` +
    inside +
    `<path d="${body}" fill="url(#g-basket)"/>` +
    `<g clip-path="url(#${id})">${zig(cy + h * bands[0], h * 0.1, "#8A3E22", 4)}${zig(cy + h * bands[1], h * 0.1, "#D2693C", 3.4)}<path d="M${f(cx + rx * 0.35)} ${f(cy)}C${f(cx + rx * 0.9)} ${f(cy + h * 0.3)} ${f(cx + rx * 0.7)} ${f(cy + h * 0.8)} ${f(cx + rx * 0.3)} ${f(cy + h + 6)}H${f(cx + rx + 8)}V${f(cy)}Z" fill="#9C6420" opacity=".22"/></g>` +
    `<path d="${body}" fill="none" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>` +
    `<path d="M${f(cx - rx)} ${f(cy)}C${f(cx - rx * 0.8)} ${f(cy + ry * 1.2)} ${f(cx + rx * 0.8)} ${f(cy + ry * 1.2)} ${f(cx + rx)} ${f(cy)}" fill="none" stroke="#D9A055" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M${f(cx - rx)} ${f(cy)}C${f(cx - rx * 0.8)} ${f(cy + ry * 1.2)} ${f(cx + rx * 0.8)} ${f(cy + ry * 1.2)} ${f(cx + rx)} ${f(cy)}" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M${f(cx - rx * 0.8)} ${f(cy + h * 0.25)}C${f(cx - rx * 0.76)} ${f(cy + h * 0.5)} ${f(cx - rx * 0.6)} ${f(cy + h * 0.7)} ${f(cx - rx * 0.45)} ${f(cy + h * 0.8)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>`
  );
}

/* ---------- animals ---------- */

const GOATS = [
  ["#FFF7EC", "#B0764A"],
  ["#C98C5A", "#6E4122"],
  ["#F3E3C8", "#4B3A33"],
  ["#8C5A3C", "#F3E3C8"],
];

/** A goat in side view facing right, about 90 wide, hooves at y=0. `v` picks a coat. */
export function goat(x, y, s = 1, flip = false, v = 0, head = 0) {
  const [coat, patch] = GOATS[v % GOATS.length];
  const shade = mix(coat, "#6E4122", 0.18);
  const t = `translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s, 3)} ${f(s, 3)})`;
  const sw = f(OW / s, 2);
  return `<g transform="${t}" stroke="${OUTLINE}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">
    <path d="M-26 -30V-2M-14 -28V-1M18 -28V-1M28 -30V-2" fill="none" stroke-width="${f(8 + OW * 2 / s, 2)}"/>
    <path d="M-26 -30V-2M-14 -28V-1M18 -28V-1M28 -30V-2" fill="none" stroke="${shade}" stroke-width="8"/>
    <path d="M-38 -50C-46 -58-46 -66-40 -68C-38 -62-34 -58-30 -56" fill="${coat}"/>
    <path d="M-36 -48C-38 -62-28 -70-10 -70H16C30 -70 38 -62 38 -50C38 -34 30 -26 16 -26H-18C-30 -26-36 -34-36 -48Z" fill="${coat}"/>
    <path d="M-20 -66C-14 -70 0 -70 6 -66C4 -56-8 -50-18 -54C-24 -56-24 -62-20 -66Z" fill="${patch}" stroke="none"/>
    <path d="M30 -40C42 -52 44 -66 46 -74" fill="none" stroke-width="${f(14 + OW * 2 / s, 2)}"/>
    <path d="M30 -40C42 -52 44 -66 46 -74" fill="none" stroke="${coat}" stroke-width="14"/>
    <g transform="rotate(${head} 46 -76)">
      <path d="M44 -88C46 -98 52 -104 58 -104" fill="none" stroke-width="${f(4.4 + OW * 2 / s, 2)}"/>
      <path d="M44 -88C46 -98 52 -104 58 -104" fill="none" stroke="#E8D9C0" stroke-width="4.4"/>
      <path d="M36 -84C30 -86 24 -84 22 -80C26 -78 32 -78 38 -80Z" fill="${patch}"/>
      <path d="M40 -90C50 -96 62 -92 66 -80C68 -72 64 -66 58 -66C52 -66 48 -70 44 -72C38 -74 36 -84 40 -90Z" fill="${coat}"/>
      <path d="M58 -66C58 -60 56 -56 54 -54C52 -58 52 -62 53 -66Z" fill="${patch}"/>
      <circle cx="54" cy="-82" r="2.6" fill="${OUTLINE}" stroke="none"/>
      <circle cx="54.9" cy="-83" r=".9" fill="#fff" stroke="none"/>
      <path d="M62 -73q2 1 3 0" fill="none" stroke-width="1.8"/>
    </g>
    <path d="M-28 -60C-22 -66-10 -68 2 -68" fill="none" stroke="#fff" stroke-width="3.4" opacity=".55"/>
  </g>`;
}

const HENS = [
  ["#D9772F", "#A84E1C"],
  ["#FFF3DE", "#E3C79C"],
  ["#B5582A", "#7A3416"],
  ["#F2B45C", "#C47B2A"],
  ["#6F4A3A", "#3E2A22"],
];

/** A plump hen facing right, about 48 wide, feet at y=0. */
export function hen(x, y, s = 1, flip = false, v = 0, peck = false) {
  const [body, wing] = HENS[v % HENS.length];
  const t = `translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s, 3)} ${f(s, 3)})`;
  const sw = f(3.6 / s, 2);
  const head = peck ? ' transform="rotate(38 8 -26)"' : "";
  return `<g transform="${t}" stroke="${OUTLINE}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">
    <path d="M-4 -8V0H-9M5 -8V0H10" fill="none" stroke="#E9A53A" stroke-width="${f(2.6 / s + 1, 2)}"/>
    <path d="M-20 -30C-28 -38-30 -46-26 -50C-22 -44-18 -40-14 -38Z" fill="${wing}"/>
    <path d="M-22 -26C-24 -14-14 -6 0 -6C14 -6 22 -14 20 -24C18 -32 12 -34 6 -32L-6 -30C-12 -30-18 -32-22 -26Z" fill="${body}"/>
    <path d="M-12 -22C-6 -26 4 -24 8 -18C2 -12-8 -12-12 -22Z" fill="${wing}"/>
    <g${head}>
      <path d="M6 -26C4 -36 8 -42 14 -42C20 -42 23 -37 22 -31C21 -26 17 -24 12 -24Z" fill="${body}"/>
      <path d="M10 -42C10 -47 13 -48 15 -45C16 -49 19 -49 20 -45C22 -46 23 -43 21 -40Z" fill="#FF6F5B"/>
      <path d="M22 -36L28 -33L22 -31Z" fill="#FFC23A"/>
      <path d="M20 -30C21 -27 20 -25 18 -25C17 -27 17 -29 18 -30Z" fill="#FF6F5B" stroke-width="${f(2 / s, 2)}"/>
      <circle cx="16.5" cy="-36" r="1.7" fill="${OUTLINE}" stroke="none"/>
    </g>
    <path d="M-16 -24C-16 -18-12 -14-6 -12" fill="none" stroke="#fff" stroke-width="2.6" opacity=".55"/>
  </g>`;
}

/* ---------- environment props (flat) ---------- */

/** A mango tree: flat rounded canopy over a trunk; returns the canopy box for hanging fruit. */
export function mangoTree(doc, cx, groundY, w, { night = false, tone = 0 } = {}) {
  const leaves = night ? ["#14453A", "#1B5646", "#24684F"] : [mix("#2E8443", "#3C7A52", tone), mix("#3F9B52", "#4F8A60", tone), mix("#5CBE6C", "#6AAE78", tone)];
  const trunk = night ? "#3A2E2A" : "#8A5A3A";
  const h = w * 1.05;
  const top = groundY - h;
  const r = w * 0.22;
  const blobs = [
    [-0.3, 0.42, 1], [0.3, 0.42, 1], [0, 0.3, 1.15], [-0.42, 0.62, 0.9], [0.42, 0.62, 0.9], [-0.16, 0.6, 1], [0.18, 0.6, 1],
  ].map(([u, v, k]) => [cx + u * w, top + v * h * 0.8, r * k]);
  const disc = (list, c, dy = 0, kk = 1) => `<path d="${list.map(([x, y, rr]) => `M${f(x - rr * kk)} ${f(y + dy)}a${f(rr * kk)} ${f(rr * kk)} 0 1 0 ${f(2 * rr * kk)} 0a${f(rr * kk)} ${f(rr * kk)} 0 1 0 ${f(-2 * rr * kk)} 0`).join("")}" fill="${c}"/>`;
  let o = `<path d="M${f(cx - w * 0.07)} ${f(groundY)}C${f(cx - w * 0.05)} ${f(groundY - h * 0.3)} ${f(cx - w * 0.06)} ${f(groundY - h * 0.45)} ${f(cx - w * 0.16)} ${f(groundY - h * 0.6)}L${f(cx - w * 0.1)} ${f(groundY - h * 0.64)}C${f(cx - w * 0.02)} ${f(groundY - h * 0.52)} ${f(cx + w * 0.02)} ${f(groundY - h * 0.52)} ${f(cx + w * 0.1)} ${f(groundY - h * 0.66)}L${f(cx + w * 0.16)} ${f(groundY - h * 0.62)}C${f(cx + w * 0.07)} ${f(groundY - h * 0.45)} ${f(cx + w * 0.06)} ${f(groundY - h * 0.3)} ${f(cx + w * 0.08)} ${f(groundY)}Z" fill="${trunk}"/>`;
  o += `<path d="M${f(cx + w * 0.02)} ${f(groundY)}C${f(cx + w * 0.03)} ${f(groundY - h * 0.3)} ${f(cx + w * 0.04)} ${f(groundY - h * 0.42)} ${f(cx + w * 0.1)} ${f(groundY - h * 0.6)}L${f(cx + w * 0.14)} ${f(groundY - h * 0.6)}C${f(cx + w * 0.07)} ${f(groundY - h * 0.45)} ${f(cx + w * 0.06)} ${f(groundY - h * 0.3)} ${f(cx + w * 0.08)} ${f(groundY)}Z" fill="#000" opacity=".14"/>`;
  o += disc(blobs, leaves[0]);
  o += disc(blobs.map(([x, y, rr]) => [x - rr * 0.12, y - rr * 0.16, rr * 0.82]), leaves[1]);
  o += disc(blobs.filter((_, i) => i < 3 || i === 5).map(([x, y, rr]) => [x - rr * 0.3, y - rr * 0.36, rr * 0.42]), leaves[2]);
  return { svg: o, top, h, r };
}

/** A woven grass mat seen from the front, in perspective. */
export function mat(cx, cy, w, h) {
  const d = `M${f(cx - w * 0.42)} ${f(cy - h / 2)}H${f(cx + w * 0.42)}L${f(cx + w / 2)} ${f(cy + h / 2)}H${f(cx - w / 2)}Z`;
  let stripes = "";
  for (let i = 1; i < 6; i++) {
    const u = i / 6;
    const y = cy - h / 2 + h * u;
    const half = w * (0.42 + 0.08 * u);
    stripes += `M${f(cx - half)} ${f(y)}H${f(cx + half)}`;
  }
  return `<path d="${d}" fill="#E9C27E" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/><path d="${stripes}" stroke="#C9934A" stroke-width="3"/><path d="M${f(cx - w * 0.46)} ${f(cy)}H${f(cx + w * 0.46)}" stroke="#2BA6A0" stroke-width="5"/><path d="M${f(cx - w * 0.47)} ${f(cy + h * 0.25)}H${f(cx + w * 0.47)}" stroke="#E0457B" stroke-width="4"/>`;
}

/** Market stall: a wooden table under a striped awning. Returns the table top y. */
export function stall(doc, x0, x1, topY, groundY, colors = ["#2BA6A0", "#FFF3DE"]) {
  const w = x1 - x0;
  const tableY = groundY - 70;
  let o = "";
  o += `<path d="M${f(x0 + 10)} ${f(groundY)}V${f(topY + 30)}M${f(x1 - 10)} ${f(groundY)}V${f(topY + 30)}" stroke="${OUTLINE}" stroke-width="${8 + OW * 2}" stroke-linecap="round"/><path d="M${f(x0 + 10)} ${f(groundY)}V${f(topY + 30)}M${f(x1 - 10)} ${f(groundY)}V${f(topY + 30)}" stroke="#A86E3A" stroke-width="8" stroke-linecap="round"/>`;
  // awning: scalloped stripes
  const n = 7;
  const sw = (w + 20) / n;
  let stripes = "";
  for (let i = 0; i < n; i++) {
    const a = x0 - 10 + i * sw;
    stripes += `<path d="M${f(a)} ${f(topY)}H${f(a + sw)}V${f(topY + 34)}C${f(a + sw)} ${f(topY + 50)} ${f(a)} ${f(topY + 50)} ${f(a)} ${f(topY + 34)}Z" fill="${colors[i % 2]}"/>`;
  }
  o += `<g stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round">${stripes}</g>`;
  o += `<path d="M${f(x0 - 16)} ${f(topY)}H${f(x1 + 16)}L${f(x1 + 6)} ${f(topY - 14)}H${f(x0 - 6)}Z" fill="${colors[0]}" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  o += `<path d="M${f(x0 + 4)} ${f(topY + 12)}H${f(x0 + sw * 1.4)}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>`;
  return { svg: o, tableY, table: `<path d="M${f(x0)} ${f(tableY)}H${f(x1)}V${f(tableY + 18)}H${f(x0)}Z" fill="#C98B4E" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/><path d="M${f(x0 + 6)} ${f(tableY + 6)}H${f(x1 - 6)}" stroke="#E2AE72" stroke-width="3" stroke-linecap="round"/><path d="M${f(x0 + 14)} ${f(tableY + 18)}V${f(groundY)}M${f(x1 - 14)} ${f(tableY + 18)}V${f(groundY)}" stroke="${OUTLINE}" stroke-width="${6 + OW * 2}"/><path d="M${f(x0 + 14)} ${f(tableY + 18)}V${f(groundY)}M${f(x1 - 14)} ${f(tableY + 18)}V${f(groundY)}" stroke="#A86E3A" stroke-width="6"/>` };
}

/** A ground shadow under a figure. */
export const shadow = (cx, cy, rx, ry = rx * 0.18, o = 0.18) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2E4A1E" opacity="${o}"/>`;

