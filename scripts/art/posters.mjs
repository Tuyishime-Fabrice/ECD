/**
 * Collection posters (400×300; cards crop them to 16:9 from the middle, so key content stays
 * inside y 40–260) and the round die-cut challenge stickers (200×200).
 */
import { BANANA_RATIO, DAY, Doc, HUT_RATIO, OUTLINE, bananaSymbol, f, hill, hutSymbol, linear, mix, radial, sampler, stand, terraces, toyNumeral } from "./lib.mjs";
import { keza } from "./people.mjs";
import { basket, fruit, shadow } from "./props.mjs";

const W = 400;
const H = 300;

function backdrop(doc, { sky, glow, glowAt, tint, far, near, behind = "", k = 1 }) {
  doc.def("psky", linear("psky", sky.map((c, i) => [i / (sky.length - 1), c])));
  doc.def("pglow", radial("pglow", [[0, glow, 0.95], [0.5, glow, 0.4], [1, glow, 0]]));
  const farC = mix("#CFE0B4", tint, 0.4 * k);
  const nearC = mix("#7CC270", tint, 0.14 * k);
  doc.def("pnear", linear("pnear", [[0, mix(nearC, "#FFFBE0", 0.2)], [1, mix(nearC, "#2E7A43", 0.12)]], [0, 230, 0, 300], ' gradientUnits="userSpaceOnUse"'));
  let o = `<rect width="${W}" height="${H}" fill="url(#psky)"/><circle cx="${glowAt[0]}" cy="${glowAt[1]}" r="${glowAt[2]}" fill="url(#pglow)"/>${behind}`;
  o += hill(far, H, farC) + terraces(far, [[10, -10, 160, 0], [10, 250, 410, 0]], 260, mix(farC, "#FFFFFF", 0.3), 2.4);
  return { o, near: hill(near, H, "url(#pnear)"), farTop: sampler(far), nearTop: sampler(near) };
}

/* Counting Stories: Keza between toy blocks 1, 2, 3, each with its fruit. */
function numbers() {
  const doc = new Doc();
  const far = [[-20, 196], [90, 182], [210, 196], [320, 178], [420, 190]];
  const near = [[-20, 246], [110, 238], [250, 244], [420, 236]];
  const b = backdrop(doc, { sky: ["#9FD6F0", "#DDF0F0", "#FFE5C2"], glow: "#FFF6D6", glowAt: [200, 150, 210], tint: "#B9DDE8", far, near });
  let o = b.o;
  o += stand(hutSymbol(doc, DAY), 236, b.farTop(236) + 12, 34, HUT_RATIO) + stand(hutSymbol(doc, DAY), 262, b.farTop(262) + 14, 24, HUT_RATIO);
  o += stand(bananaSymbol(doc, DAY), 40, b.farTop(40) + 40, 70, BANANA_RATIO, { flip: true });
  o += b.near;
  o += shadow(190, 262, 40, 6, 0.2);
  o += keza(doc, { x: 190, y: 260, s: 0.8, pose: "cheer", mouth: "open" });
  o += shadow(72, 248, 34, 5, 0.18) + toyNumeral(doc, "1", { x: 66, y: 236, size: 74, color: "#4FB3EA", deep: "#1E73A6", id: "n1" });
  o += fruit(doc, "mango", 102, 236, 42, 20);
  o += shadow(300, 226, 30, 5, 0.16) + toyNumeral(doc, "2", { x: 296, y: 216, size: 60, color: "#FF8A66", deep: "#C4532F", id: "n2" });
  o += fruit(doc, "banana", 330, 196, 38, -10) + fruit(doc, "banana", 350, 206, 38, 14);
  o += shadow(342, 268, 40, 6, 0.18) + toyNumeral(doc, "3", { x: 312, y: 262, size: 54, color: "#FFC93F", deep: "#C97A00", id: "n3" });
  o += fruit(doc, "orange", 352, 252, 30) + fruit(doc, "orange", 378, 256, 30) + fruit(doc, "orange", 366, 232, 30);
  return { doc, body: o };
}

/* Colors & Shapes Stories: a rainbow, and Keza with shape balloons. */
function colorsShapes() {
  const doc = new Doc();
  const far = [[-20, 210], [100, 198], [220, 208], [330, 194], [420, 204]];
  const near = [[-20, 250], [120, 242], [260, 248], [420, 240]];
  // a rainbow behind the far hill
  const arcs = ["#FF9A7A", "#FFCF52", "#7FCB8E", "#5BB6E8", "#A98BE3"];
  const behind = arcs.map((c, i) => `<path d="M${f(60 + i * 12)} 230A${f(140 - i * 12)} ${f(140 - i * 12)} 0 0 1 ${f(340 - i * 12)} 230" fill="none" stroke="${c}" stroke-width="12.5"/>`).join("");
  const b = backdrop(doc, { sky: ["#DCCBFA", "#F4EEFF", "#FFE8DA"], glow: "#FFF8EE", glowAt: [200, 170, 200], tint: "#C9B4F0", far, near, behind, k: 0.4 });
  let o = b.o;
  o += b.near;
  const strings = (hx, hy) =>
    `<path d="M${hx} ${hy}C${hx - 30} ${hy - 30} 100 136 92 116M${hx} ${hy}C${hx - 6} ${hy - 40} 150 104 154 90M${hx} ${hy}C${hx + 20} ${hy - 40} 290 120 300 106M${hx} ${hy}C${hx + 30} ${hy - 20} 330 176 332 160" fill="none" stroke="${OUTLINE}" stroke-width="2" stroke-linecap="round"/>`;
  o += shadow(214, 262, 36, 6, 0.2);
  // Keza's raised hand is at about (214+32*0.76, 262-152*0.76)
  const hx = f(214 + 32 * 0.76);
  const hy = f(262 - 152 * 0.76);
  o += strings(hx, hy);
  o += `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round">
    <circle cx="92" cy="90" r="26" fill="#FF8C6B"/>
    <rect x="132" y="48" width="44" height="44" rx="8" fill="#4FB0E6" transform="rotate(-10 154 70)"/>
    <path d="M300 56L326 104H274Z" fill="#FFC93C"/>
    <path d="M332 122l7.6 14.4 16 2.6-11.4 11.4 2.6 16-14.8-7.4-14.8 7.4 2.6-16-11.4-11.4 16-2.6Z" fill="#A98BE3"/>
  </g>
  <g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"><path d="M76 80a18 18 0 0 1 10-10"/><path d="M142 60l10-2"/><path d="M294 76l6-10"/></g>`;
  o += keza(doc, { x: 214, y: 262, s: 0.76, pose: "holdUp", look: -0.3, mouth: "open" });
  return { doc, body: o };
}

/* Healthy Habits Stories: Keza washes her hands at a kandagira ukarabe (a tippy-tap). */
function bodyHygiene() {
  const doc = new Doc();
  const far = [[-20, 204], [110, 192], [230, 202], [340, 188], [420, 198]];
  const near = [[-20, 248], [120, 240], [260, 246], [420, 238]];
  const b = backdrop(doc, { sky: ["#BFEFE2", "#EAF9F3", "#F6FCF6"], glow: "#FFFCEA", glowAt: [260, 120, 200], tint: "#9ADCC8", far, near });
  let o = b.o;
  o += stand(bananaSymbol(doc, DAY), 360, b.farTop(360) + 46, 80, BANANA_RATIO);
  o += b.near;
  // the wooden frame, the yellow jerrycan on its rope, the foot pedal
  o += `<g transform="translate(-26 0)" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M86 258V96M166 258V96M80 96H172" fill="none" stroke-width="13"/>
    <path d="M86 258V96M166 258V96M80 96H172" fill="none" stroke="#B27740" stroke-width="6"/>
    <path d="M126 96V112" fill="none" stroke-width="2.4"/>
    <path d="M104 118C104 112 108 110 114 110H142C148 110 152 114 152 120V150C152 156 148 160 142 160H114C108 160 104 156 104 150Z" fill="#FFC93F" transform="rotate(-14 128 135)"/>
    <path d="M108 146L98 156L102 162L114 154" fill="#2BA6A0" transform="rotate(-14 128 135)"/>
    <path d="M110 122H122" fill="none" stroke="#fff" stroke-width="3.4" opacity=".7" transform="rotate(-14 128 135)"/>
    <path d="M118 252L150 246" fill="none" stroke-width="10"/><path d="M118 252L150 246" fill="none" stroke="#B27740" stroke-width="4"/>
  </g>`;
  o += `<path d="M76 162C96 168 120 174 140 180" fill="none" stroke="#7FD3F0" stroke-width="5" stroke-linecap="round"/><g fill="#7FD3F0" stroke="${OUTLINE}" stroke-width="2"><path d="M148 202c3 4 4 7 0 9c-4-2-3-5 0-9Z"/><path d="M160 214c3 4 4 7 0 9c-4-2-3-5 0-9Z"/></g>`;
  o += shadow(184, 262, 36, 6, 0.2);
  o += keza(doc, { x: 184, y: 260, s: 0.76, pose: "give", look: 0.5, mouth: "open", flip: true });
  // soap bubbles drifting up and to the right
  const bubbles = [[236, 150, 15], [254, 108, 10], [280, 146, 19], [300, 84, 13], [246, 70, 8], [338, 72, 16], [212, 96, 9]];
  o += `<g fill="#EAF8FF" fill-opacity=".55" stroke="#5BB6E8" stroke-width="3">${bubbles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>`;
  o += `<g fill="#fff">${bubbles.map(([x, y, r]) => `<circle cx="${f(x - r * 0.4)}" cy="${f(y - r * 0.4)}" r="${f(r * 0.24)}"/>`).join("")}</g>`;
  // toothbrush in a cup on the right
  o += `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"><path d="M300 200L310 166M310 166L318 140" fill="none" stroke-width="10" stroke-linecap="round"/><path d="M300 200L310 166M310 166L318 140" fill="none" stroke="#FF8C6B" stroke-width="4" stroke-linecap="round"/><rect x="311" y="122" width="16" height="22" rx="4" fill="#fff" transform="rotate(16 319 133)"/><path d="M286 196H330L324 248C324 252 320 254 316 254H300C296 254 292 252 292 248Z" fill="#4FB0E6"/><path d="M294 206V236" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".6"/></g>`;
  return { doc, body: o };
}

/* ---------- stickers ---------- */

function stickerBase(doc, id, [c1, c2], rays) {
  doc.def(`${id}g`, radial(`${id}g`, [[0, c1], [1, c2]], [0.4, 0.35, 0.75]));
  let o = `<circle cx="100" cy="104" r="92" fill="#3A1F0E" opacity=".14"/>`;
  o += `<circle cx="100" cy="99" r="92" fill="#fff" stroke="#EEDFC8" stroke-width="1.5"/>`;
  o += `<circle cx="100" cy="99" r="77" fill="url(#${id}g)" stroke="${OUTLINE}" stroke-width="4"/>`;
  let d = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = a + Math.PI / 24;
    d += `M100 99L${f(100 + 75 * Math.cos(a))} ${f(99 + 75 * Math.sin(a))}L${f(100 + 75 * Math.cos(b))} ${f(99 + 75 * Math.sin(b))}Z`;
  }
  o += `<path d="${d}" fill="${rays}" opacity=".35"/>`;
  return o;
}
const gloss = `<path d="M44 74A62 62 0 0 1 82 36" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/>`;
const sparkle = (x, y, s, c = "#fff") =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-10C1-3 3-1 10 0C3 1 1 3 0 10C-1 3-3 1-10 0C-3-1-1-3 0-10Z" fill="${c}"/>`;
const kawaii = (cx, cy, k = 1) =>
  `<g transform="translate(${cx} ${cy}) scale(${k})"><ellipse cx="-13" cy="0" rx="4.6" ry="5.8" fill="#3A1F0E"/><ellipse cx="13" cy="0" rx="4.6" ry="5.8" fill="#3A1F0E"/><circle cx="-11.4" cy="-2.4" r="1.8" fill="#fff"/><circle cx="14.6" cy="-2.4" r="1.8" fill="#fff"/><ellipse cx="-22" cy="9" rx="6" ry="3.8" fill="#FF6F5B" opacity=".45"/><ellipse cx="22" cy="9" rx="6" ry="3.8" fill="#FF6F5B" opacity=".45"/><path d="M-7 7C-5 15 5 15 7 7C2 9-2 9-7 7Z" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/></g>`;

/* Challenge 1 (numbers 1–5): a happy mango. */
function sticker1() {
  const doc = new Doc();
  let o = stickerBase(doc, "s", ["#FFE7A8", "#FF9F6E"], "#FFF6D8");
  o += `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M102 50C104 42 110 36 118 34" fill="none" stroke-width="5"/>
    <path d="M110 44C122 30 142 32 148 42C136 52 122 52 110 44Z" fill="#3DAE6B"/>
    <path d="M118 44C126 40 134 40 140 42" fill="none" stroke="#7FD49A" stroke-width="2.4"/>
  </g>`;
  doc.def("mg", linear("mg", [[0.05, "#A4D04C"], [0.45, "#FFD34A"], [1, "#FF8E36"]], [0, 0, 1, 1]));
  o += `<path d="M44 106C40 74 66 50 102 50C138 50 160 74 158 104C156 132 136 150 108 154C84 158 64 154 54 140C48 132 45 120 44 106Z" fill="url(#mg)" stroke="${OUTLINE}" stroke-width="4.5" stroke-linejoin="round"/>`;
  o += `<path d="M62 92C66 76 80 64 98 62" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>`;
  o += kawaii(102, 106, 1.25);
  o += gloss + sparkle(40, 52, 1.1) + sparkle(162, 150, 0.9) + sparkle(160, 64, 0.7, "#FFF6C8");
  return { doc, body: o };
}

/* Challenge 2 (numbers 6–10): a happy woven basket full of fruit. */
function sticker2() {
  const doc = new Doc();
  let o = stickerBase(doc, "s", ["#BFE9FF", "#5BB6E8"], "#E8F7FF");
  const inside = fruit(doc, "orange", 74, 76, 40) + fruit(doc, "banana", 104, 62, 46, -20) + fruit(doc, "orange", 128, 74, 40) + fruit(doc, "avocado", 100, 82, 34, 10);
  o += basket(doc, 100, 92, 124, 70, inside, "bk", [0.82, 0.98]);
  o += kawaii(100, 124, 1.05);
  o += gloss + sparkle(40, 128, 1) + sparkle(162, 120, 0.8) + sparkle(150, 48, 0.8, "#FFF6C8");
  return { doc, body: o };
}

export function buildPosters(write) {
  for (const [file, make] of [["numbers", numbers], ["colors-shapes", colorsShapes], ["body-hygiene", bodyHygiene]]) {
    const { doc, body } = make();
    write(`images/seasons/${file}.svg`, { w: W, h: H, body, doc, kind: "scene", par: "xMidYMid slice" });
  }
  for (const [file, make] of [["s1c1", sticker1], ["s1c2", sticker2]]) {
    const { doc, body } = make();
    write(`images/stickers/${file}.svg`, { w: 200, h: 200, body, doc });
  }
}
