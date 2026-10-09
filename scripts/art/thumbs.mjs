/**
 * Story thumbnails (16:9, 640×360): each is a little scene from its story with Keza, in its
 * own hue. The top-right 100×80 and the bottom-right 120×120 stay free of key content (status
 * badges and the play disc sit there), and key content stays inside y 44–316 so a wider hero crop
 * keeps it. A small toy-block numeral sits top-left.
 */
import {
  BANANA_RATIO,
  DAY,
  Doc,
  HUT_RATIO,
  bananaSymbol,
  cloudSymbol,
  f,
  footpath,
  hill,
  hutSymbol,
  linear,
  meadow,
  mix,
  place,
  radial,
  sampler,
  stand,
  terraces,
  toyNumeral,
} from "./lib.mjs";
import { keza, friend, woman } from "./people.mjs";
import { basket, fruit, goat, hen, mangoTree, mat, shadow, stall } from "./props.mjs";

const W = 640;
const H = 360;

const NUM = {
  blue: ["#4FB3EA", "#1E73A6"],
  coral: ["#FF8A66", "#C4532F"],
  gold: ["#FFC93F", "#C97A00"],
  teal: ["#3CC2B4", "#1A7A72"],
  berry: ["#B08AF0", "#6E40B0"],
};

/** Sky, glow and three tinted hill layers; returns the ground line samplers for placing things. */
function backdrop(doc, c) {
  doc.def("tsky", linear("tsky", [[0, c.sky[0]], [0.7, c.sky[1]], [1, c.sky[2] ?? c.sky[1]]]));
  doc.def("tglow", radial("tglow", [[0, c.glow, 0.95], [0.5, c.glow, 0.45], [1, c.glow, 0]]));
  let o = `<rect width="${W}" height="${H}" fill="url(#tsky)"/>`;
  o += `<circle cx="${c.glowAt[0]}" cy="${c.glowAt[1]}" r="${c.glowAt[2] ?? 230}" fill="url(#tglow)"/>`;
  const far = c.farPts ?? [[-20, 214], [90, 196], [220, 210], [360, 186], [500, 204], [660, 190]];
  const mid = c.midPts ?? [[-20, 252], [120, 240], [260, 254], [420, 236], [560, 246], [660, 240]];
  const near = c.nearPts ?? [[-20, 300], [140, 292], [320, 298], [500, 290], [660, 296]];
  const tint = c.tint;
  const farC = mix("#CFE0B4", tint, 0.42);
  const midC = mix("#9DCC86", tint, 0.24);
  const nearC = mix("#74BE68", tint, 0.14);
  const grad = (id, c1, y0, y1) => {
    doc.def(id, linear(id, [[0, mix(c1, "#FFFBE0", 0.22)], [1, mix(c1, "#2E7A43", 0.1)]], [0, y0, 0, y1], ' gradientUnits="userSpaceOnUse"'));
    return `url(#${id})`;
  };
  return {
    sky: o,
    far: hill(far, H, farC) + terraces(far, [[10, 260, 640, 0], [9, -10, 200, 0]], 280, mix(farC, "#FFFFFF", 0.3), 2.4),
    mid: hill(mid, H, grad("tmid", midC, 226, 320)) + terraces(mid, [[12, -10, 260, 0], [26, 40, 220, 0.1], [12, 380, 650, 0]], 330, mix(midC, "#FFFFFF", 0.28), 3),
    near: hill(near, H, grad("tnear", nearC, 280, 360)),
    farTop: sampler(far),
    midTop: sampler(mid),
    nearTop: sampler(near),
    nearPts: near,
    colors: { farC, midC, nearC, shade: mix(nearC, "#1E3A12", 0.5) },
  };
}

function frame(doc, body) {
  return { doc, body };
}

/* 1. Keza's One Mango: she holds up the one mango she found under the mango tree. */
function s1e1() {
  const doc = new Doc();
  const b = backdrop(doc, { sky: ["#FFC9A6", "#FFEBD6", "#FFF4E6"], glow: "#FFF6DA", glowAt: [300, 120, 260], tint: "#F2B48C" });
  let o = b.sky + b.far + b.mid;
  o += stand(hutSymbol(doc, DAY), 120, b.midTop(120) + 12, 44, HUT_RATIO) + stand(hutSymbol(doc, DAY), 156, b.midTop(156) + 14, 32, HUT_RATIO);
  const tree = mangoTree(doc, 486, b.nearTop(486) + 12, 250, { tone: 0.15 });
  o += tree.svg + b.near;
  o += meadow(doc, DAY, b.nearPts, { x0: 20, x1: 470, depth: [10, 50], count: 8, tufts: 3, seed: 11 });
  o += shadow(318, 318, 56, 9, 0.2);
  o += keza(doc, { x: 318, y: 316, pose: "holdUp", legs: "stand", mouth: "open", look: 0.2, hold: (l, r) => fruit(doc, "mango", r[0] + 4, r[1] - 24, 58, 10) });
  o += toyNumeral(doc, "1", { x: 76, y: 116, size: 74, color: NUM.blue[0], deep: NUM.blue[1], id: "n1" });
  return frame(doc, o);
}

/* 2. Two Bananas for Grandma: Keza brings two bananas to Grandma by her hut. */
function s1e2() {
  const doc = new Doc();
  const b = backdrop(doc, { sky: ["#BDEBD2", "#E8F8EE", "#F4FBF3"], glow: "#FFFBE6", glowAt: [420, 90, 220], tint: "#9ED9B8" });
  let o = b.sky + b.far;
  const bp = bananaSymbol(doc, DAY);
  o += stand(bp, 470, b.midTop(470) + 20, 120, BANANA_RATIO) + stand(bp, 560, b.midTop(560) + 16, 92, BANANA_RATIO, { flip: true });
  o += b.mid;
  o += stand(hutSymbol(doc, DAY), 92, b.nearTop(92) + 14, 190, HUT_RATIO);
  o += b.near;
  o += meadow(doc, DAY, b.nearPts, { x0: 200, x1: 500, depth: [12, 50], count: 6, tufts: 2, seed: 21 });
  o += shadow(236, 322, 62, 9, 0.2) + shadow(392, 318, 46, 8, 0.2);
  o += woman(doc, "grandma", { x: 230, y: 320, seated: true, arms: "receive", mouth: "open", look: 0.5 });
  o += keza(doc, {
    x: 392,
    y: 316,
    flip: true,
    pose: "give",
    look: 0.6,
    mouth: "open",
    hold: (l, r) => fruit(doc, "banana", r[0] - 2, r[1] - 12, 62, -36) + fruit(doc, "banana", r[0] + 12, r[1] - 4, 62, -8),
  });
  o += toyNumeral(doc, "2", { x: 72, y: 104, size: 66, color: NUM.coral[0], deep: NUM.coral[1], id: "n2" });
  return frame(doc, o);
}

/* 3. Three Oranges for Market: Keza walks the path to market with a basket on her head. */
function s1e3() {
  const doc = new Doc();
  const b = backdrop(doc, {
    sky: ["#8ED0EE", "#E1F2F0", "#FFE5C0"],
    glow: "#FFF4CF",
    glowAt: [520, 150, 260],
    tint: "#B9DDE8",
    farPts: [[-20, 200], [120, 186], [260, 200], [420, 176], [560, 190], [660, 184]],
  });
  let o = b.sky;
  const cl = cloudSymbol(doc, DAY);
  o += place(cl, 150, 40, 84, 46 / 120) + place(cl, 360, 70, 56, 46 / 120, { extra: ' opacity=".85"' });
  o += b.far;
  // the market far away: tiny awnings on the hill
  o += `<g transform="translate(470 ${f(b.farTop(470) + 4)})"><path d="M-22 0V-12M22 0V-12M-4 0V-12" stroke="#9C6A3C" stroke-width="2"/><path d="M-26 -12H-6L-8 -20H-24ZM-4 -12H26L22 -20H0Z" fill="#E0457B"/><path d="M-4 -12H8L6 -20H0Z" fill="#FFF3DE"/></g>`;
  o += b.mid;
  o += footpath(DAY, [[120, 380, 120], [190, 330, 80], [300, 296, 54], [400, 270, 32], [460, 254, 18], [486, b.midTop(486) + 6, 6]]);
  o += stand(bananaSymbol(doc, DAY), 104, b.midTop(104) + 40, 110, BANANA_RATIO, { flip: true });
  o += meadow(doc, DAY, [[-20, 300], [660, 300]], { x0: 20, x1: 520, depth: [6, 50], count: 9, tufts: 3, seed: 31 });
  o += shadow(300, 324, 50, 8, 0.2);
  o += keza(doc, {
    x: 300,
    y: 322,
    pose: "carry",
    legs: "walk",
    look: 0.4,
    mouth: "open",
    hold: () => basket(doc, 0, -196, 104, 44, fruit(doc, "orange", -26, -206, 40) + fruit(doc, "orange", 26, -206, 40) + fruit(doc, "orange", 0, -218, 42), "bk3"),
  });
  o += toyNumeral(doc, "3", { x: 72, y: 104, size: 66, color: NUM.coral[0], deep: NUM.coral[1], id: "n3" });
  return frame(doc, o);
}

/* 4. Four Goats, Five Hens: Keza counts the animals in the yard. */
function s1e4() {
  const doc = new Doc();
  const b = backdrop(doc, { sky: ["#D9CCFA", "#F3EEFF", "#FFF0E6"], glow: "#FFF6E6", glowAt: [330, 150, 240], tint: "#C9B4F0" });
  let o = b.sky + b.far + b.mid;
  o += stand(hutSymbol(doc, DAY), 586, b.midTop(586) + 18, 64, HUT_RATIO);
  o += b.near;
  o += goat(156, 256, 0.62, false, 0, -8) + goat(70, 268, 0.6, true, 2) + goat(424, 252, 0.6, true, 1) + goat(486, 262, 0.58, false, 3, 10);
  o += shadow(312, 316, 48, 8, 0.2);
  o += keza(doc, { x: 312, y: 314, pose: "cheer", mouth: "open" });
  const hx = [70, 140, 210, 400, 466];
  hx.forEach((x, i) => (o += shadow(x, 334, 22, 4, 0.18) + hen(x, 334, 1.05, i > 2, i, i === 1)));
  o += toyNumeral(doc, "4", { x: 56, y: 100, size: 60, color: NUM.gold[0], deep: NUM.gold[1], id: "n4" });
  o += toyNumeral(doc, "5", { x: 104, y: 112, size: 46, color: NUM.blue[0], deep: NUM.blue[1], id: "n5" });
  return frame(doc, o);
}

/* 5. Six Mangoes Up High: six mangoes at the top of the tree, Keza on tiptoe. */
function s1e5() {
  const doc = new Doc();
  const b = backdrop(doc, { sky: ["#FFDF86", "#FFF3CC", "#FFF8E4"], glow: "#FFFDF0", glowAt: [460, 90, 220], tint: "#F2D27A" });
  let o = b.sky + b.far + b.mid + b.near;
  const tree = mangoTree(doc, 300, b.nearTop(300) + 4, 330, { tone: 0.05 });
  o += tree.svg;
  const spots = [[196, 92], [262, 66], [334, 80], [404, 104], [232, 148], [300, 132]];
  spots.forEach(([x, y], i) => (o += fruit(doc, "mango", x, y, 42, 50 + i * 12)));
  o += meadow(doc, DAY, b.nearPts, { x0: 30, x1: 500, depth: [10, 50], count: 8, tufts: 3, seed: 51 });
  o += shadow(378, 326, 44, 7, 0.2);
  o += keza(doc, { x: 378, y: 318, pose: "reach", legs: "tiptoe", look: -0.2, mouth: "o", s: 0.92 });
  o += toyNumeral(doc, "6", { x: 70, y: 104, size: 66, color: NUM.blue[0], deep: NUM.blue[1], id: "n6" });
  return frame(doc, o);
}

/* 6. Seven Bananas to Share: three friends on a mat by the lake, seven bananas on a plate. */
function s1e6() {
  const doc = new Doc();
  const b = backdrop(doc, {
    sky: ["#9EE3DA", "#E4F8F4", "#F4FCF8"],
    glow: "#FFFBE8",
    glowAt: [470, 110, 220],
    tint: "#86D3C6",
    farPts: [[-20, 168], [110, 154], [260, 166], [420, 150], [560, 160], [660, 156]],
    midPts: [[-20, 250], [160, 244], [340, 252], [520, 242], [660, 248]],
  });
  let o = b.sky + b.far;
  // Lake Kivu between the far hills and the shore
  doc.def("lake", linear("lake", [[0, "#7FD0E0"], [1, "#B9ECEA"]]));
  o += `<rect y="${f(b.farTop(0) + 14)}" width="${W}" height="120" fill="url(#lake)"/>`;
  o += `<path d="M60 206H140M190 222H300M380 200H440M470 216H580M100 236H170" stroke="#E8FAF8" stroke-width="3" stroke-linecap="round"/>`;
  o += `<path d="M470 196C478 204 506 204 514 196Z" fill="#7A5236"/><path d="M492 196V178L506 192Z" fill="#FFF6E2"/>`;
  o += b.mid;
  o += stand(bananaSymbol(doc, DAY), 560, b.midTop(560) + 26, 110, BANANA_RATIO);
  o += b.near;
  o += mat(276, 304, 400, 52);
  o += friend(doc, "mugisha", { x: 140, y: 310, sit: true, pose: "cheer", mouth: "open", look: 0.4 });
  o += friend(doc, "ineza", { x: 412, y: 310, sit: true, pose: "hold", look: -0.5, mouth: "open" });
  o += keza(doc, { x: 276, y: 306, sit: true, pose: "offer", mouth: "open" });
  // seven bananas fanned on a woven plate in front of Keza
  o += `<ellipse cx="276" cy="330" rx="104" ry="17" fill="#E2B877" stroke="#5A3112" stroke-width="4"/><ellipse cx="276" cy="328" rx="90" ry="11" fill="#F3D6A2"/>`;
  [-78, -52, -26, 0, 26, 52, 78].forEach((dx, i) => (o += fruit(doc, "banana", 276 + dx, 306 + Math.abs(dx) * 0.08, 46, -78 + (i - 3) * 6)));
  o += toyNumeral(doc, "7", { x: 70, y: 100, size: 62, color: NUM.coral[0], deep: NUM.coral[1], id: "n7" });
  return frame(doc, o);
}

/* 7. Eight Oranges in a Basket: the big basket is full, Keza cheers. */
function s1e7() {
  const doc = new Doc();
  const b = backdrop(doc, { sky: ["#FFC2D2", "#FFE6EC", "#FFF3EE"], glow: "#FFF8EE", glowAt: [260, 130, 240], tint: "#F4AFC0" });
  let o = b.sky + b.far + b.mid;
  const bp = bananaSymbol(doc, DAY);
  o += stand(bp, 70, b.midTop(70) + 30, 100, BANANA_RATIO, { flip: true });
  o += stand(hutSymbol(doc, DAY), 520, b.midTop(520) + 18, 64, HUT_RATIO) + stand(hutSymbol(doc, DAY), 568, b.midTop(568) + 20, 46, HUT_RATIO);
  o += b.near;
  o += meadow(doc, DAY, b.nearPts, { x0: 20, x1: 500, depth: [10, 46], count: 7, tufts: 3, seed: 71 });
  o += shadow(206, 334, 92, 10, 0.2) + shadow(390, 322, 46, 8, 0.2);
  const back = [[-62, -14], [-21, -20], [21, -20], [62, -14]].map(([dx, dy]) => fruit(doc, "orange", 206 + dx, 262 + dy, 46)).join("");
  const front = [[-42, -2], [0, -6], [42, -2]].map(([dx, dy]) => fruit(doc, "orange", 206 + dx, 262 + dy, 46)).join("");
  const topOne = fruit(doc, "orange", 206, 220, 46);
  o += basket(doc, 206, 266, 190, 72, back + front + topOne, "bk7");
  o += keza(doc, { x: 390, y: 320, pose: "cheer", mouth: "open", look: -0.4 });
  o += toyNumeral(doc, "8", { x: 64, y: 100, size: 62, color: NUM.teal[0], deep: NUM.teal[1], id: "n8" });
  return frame(doc, o);
}

/* 8. Nine and Ten at the Market: nine avocados and ten mangoes on the stall. */
function s1e8() {
  const doc = new Doc();
  const b = backdrop(doc, {
    sky: ["#FFD7A8", "#FFEFD8", "#FFF6EA"],
    glow: "#FFFBEE",
    glowAt: [470, 120, 220],
    tint: "#E8B98A",
    nearPts: [[-20, 296], [160, 290], [340, 294], [520, 288], [660, 292]],
  });
  let o = b.sky + b.far + b.mid;
  o += stand(bananaSymbol(doc, DAY), 586, b.midTop(586) + 20, 90, BANANA_RATIO);
  o += b.near;
  const st = stall(doc, 120, 420, 112, 316, ["#2BA6A0", "#FFF3DE"]);
  o += st.svg;
  o += woman(doc, "seller", { x: 270, y: 256, upper: true, arms: "wave", mouth: "open", look: 0.4, s: 0.8 });
  o += st.table;
  // nine avocados (4-3-2) and ten mangoes (4-3-2-1), stacked on the table
  const pile = (kind, cx, rows, size, rot) => {
    let p = "";
    rows.forEach((n, r) => {
      for (let i = 0; i < n; i++) p += fruit(doc, kind, cx + (i - (n - 1) / 2) * size * 0.82, st.tableY - size * 0.36 - r * size * 0.62, size, rot + ((i + r) % 2 ? 8 : -8));
    });
    return p;
  };
  o += pile("avocado", 196, [4, 3, 2], 30, 0);
  o += pile("mango", 348, [4, 3, 2, 1], 30, 20);
  o += shadow(470, 322, 42, 7, 0.2);
  o += keza(doc, { x: 470, y: 320, flip: true, pose: "point", look: 0.5, mouth: "open", s: 0.92 });
  o += toyNumeral(doc, "9", { x: 46, y: 96, size: 50, color: NUM.berry[0], deep: NUM.berry[1], id: "n9" });
  o += toyNumeral(doc, "10", { x: 84, y: 110, size: 36, color: NUM.blue[0], deep: NUM.blue[1], id: "n10" });
  return frame(doc, o);
}

export function buildThumbs(write) {
  const all = { s1e1, s1e2, s1e3, s1e4, s1e5, s1e6, s1e7, s1e8 };
  for (const [id, make] of Object.entries(all)) {
    const { doc, body } = make();
    write(`images/thumbs/${id}.svg`, { w: W, h: H, body, doc, kind: "scene", par: "xMidYMid slice" });
  }
}
