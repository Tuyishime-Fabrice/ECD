/**
 * Story characters: Keza (an original Rwandan girl, the same in every story), her friends,
 * Grandma and the market seller. Characters follow the object style: a warm-brown outline,
 * soft gradient fills and one white highlight.
 *
 * Every figure is drawn in its own units with the feet at (0, 0); Keza is about 200 tall.
 */
import { OUTLINE, curve, f, linear, mix, radial } from "./lib.mjs";

const OW = 4; // outline width at scale 1
const EYE = "#2A160C";

export const SKIN = {
  keza: ["#B4744A", "#93593A"],
  mugisha: ["#A2643E", "#83492B"],
  ineza: ["#BB7C50", "#9A5E3C"],
  grandma: ["#9C5E3A", "#7C4428"],
  seller: ["#A96B44", "#8A5032"],
};

function skinFill(doc, who) {
  const id = `sk-${who}`;
  doc.def(id, radial(id, [[0, SKIN[who][0]], [1, SKIN[who][1]]], [0.35, 0.3, 0.85]));
  return `url(#${id})`;
}
/** Limbs are strokes, which a radial gradient would smear: they get the mid skin tone. */
const limbSkin = (who) => mix(SKIN[who][0], SKIN[who][1], 0.4);

/** A limb: an outlined round-capped stroke through three points. */
const limb = (pts, w, fill) => {
  const d = curve(pts);
  return `<path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="${w + OW * 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const hand = ([x, y], fill, r = 6.8) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}" stroke="${OUTLINE}" stroke-width="${OW}"/>`;
const foot = ([x, y], dir, color) =>
  `<ellipse cx="${f(x + dir * 3)}" cy="${f(y + 2)}" rx="9.5" ry="5.2" fill="${color}" stroke="${OUTLINE}" stroke-width="${OW}"/>`;

const ARMS = {
  stand: [[[-19, -98], [-26, -80], [-28, -62]], [[19, -98], [26, -80], [28, -62]]],
  wave: [[[-19, -98], [-26, -80], [-28, -62]], [[19, -98], [36, -112], [40, -140]]],
  holdUp: [[[-19, -98], [-26, -80], [-28, -62]], [[19, -98], [32, -122], [32, -152]]],
  reach: [[[-19, -98], [-32, -84], [-22, -70]], [[19, -98], [34, -128], [44, -160]]],
  offer: [[[-19, -98], [-22, -78], [-4, -76]], [[19, -98], [30, -82], [20, -76]]],
  give: [[[-19, -98], [-12, -80], [14, -84]], [[19, -98], [36, -90], [50, -98]]],
  carry: [[[-19, -98], [-38, -122], [-30, -156]], [[19, -98], [38, -122], [30, -156]]],
  cheer: [[[-19, -98], [-38, -114], [-46, -140]], [[19, -98], [38, -114], [46, -140]]],
  hold: [[[-19, -98], [-30, -84], [-20, -68]], [[19, -98], [30, -84], [20, -68]]],
  point: [[[-19, -98], [-26, -80], [-28, -62]], [[19, -98], [38, -100], [56, -108]]],
  balance: [[[-19, -98], [-38, -104], [-54, -118]], [[19, -98], [34, -86], [42, -70]]],
  rope: [[[-19, -98], [-36, -90], [-48, -80]], [[19, -98], [36, -90], [48, -80]]],
};
const LEGS = {
  stand: [[[-10, -44], [-11, -24], [-12, -8]], [[10, -44], [11, -24], [12, -8]]],
  walk: [[[-10, -44], [-17, -26], [-22, -8]], [[10, -44], [12, -24], [17, -8]]],
  tiptoe: [[[-10, -44], [-10, -26], [-10, -12]], [[10, -44], [10, -26], [10, -12]]],
  jump: [[[-10, -44], [-20, -30], [-14, -16]], [[10, -44], [20, -30], [14, -16]]],
  kick: [[[-10, -44], [-12, -24], [-14, -8]], [[10, -44], [26, -32], [42, -30]]],
};

/** Face features centered on (cx, cy); `look` shifts them for a three-quarter turn. */
function face({ cx, cy, look = 0, mouth = "smile", hair = "#2A1810", closed = false, glasses = false, age = 0 }) {
  const dx = look * 6;
  const ex = 11.5;
  let o = "";
  const eyes = [cx - ex + dx, cx + ex + dx];
  if (closed) {
    o += `<path d="M${f(eyes[0] - 5)} ${f(cy + 3)}c2 3.6 8 3.6 10 0M${f(eyes[1] - 5)} ${f(cy + 3)}c2 3.6 8 3.6 10 0" fill="none" stroke="${EYE}" stroke-width="2.8" stroke-linecap="round"/>`;
  } else {
    for (const x of eyes) o += `<ellipse cx="${f(x)}" cy="${f(cy + 3)}" rx="4.3" ry="5.4" fill="${EYE}"/><circle cx="${f(x + 1.5)}" cy="${f(cy + 0.6)}" r="1.7" fill="#fff"/>`;
  }
  o += `<path d="M${f(eyes[0] - 5)} ${f(cy - 8 - age)}q5 -${3.2 + age} 10 0M${f(eyes[1] - 5)} ${f(cy - 8 - age)}q5 -${3.2 + age} 10 0" fill="none" stroke="${hair}" stroke-width="2.6" stroke-linecap="round"/>`;
  o += `<g fill="#E86F5C" opacity=".38"><ellipse cx="${f(cx - 19 + dx * 0.7)}" cy="${f(cy + 13)}" rx="6.2" ry="3.8"/><ellipse cx="${f(cx + 19 + dx * 0.7)}" cy="${f(cy + 13)}" rx="6.2" ry="3.8"/></g>`;
  o += `<path d="M${f(cx - 2.6 + dx * 1.2)} ${f(cy + 10)}q2.6 2 5.2 0" fill="none" stroke="#5A2E16" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`;
  const mx = cx + dx * 1.1;
  const my = cy + 17;
  if (mouth === "open") {
    o += `<path d="M${f(mx - 8)} ${f(my - 1)}c1.5 11 14.5 11 16 0c-5 2-11 2-16 0Z" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${f(mx - 4.4)} ${f(my + 4.6)}c2.6-1.6 6.2-1.6 8.8 0c-2.4 2.6-6.4 2.6-8.8 0Z" fill="#FF8467"/>`;
  } else if (mouth === "o") {
    o += `<ellipse cx="${f(mx)}" cy="${f(my + 1)}" rx="3.6" ry="4.2" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.2"/>`;
  } else {
    o += `<path d="M${f(mx - 7)} ${f(my - 1)}q7 7 14 0" fill="none" stroke="#5A2E16" stroke-width="2.8" stroke-linecap="round"/>`;
  }
  if (glasses) {
    o += `<g fill="none" stroke="#5A3112" stroke-width="2.4"><circle cx="${f(eyes[0])}" cy="${f(cy + 3)}" r="8.2"/><circle cx="${f(eyes[1])}" cy="${f(cy + 3)}" r="8.2"/><path d="M${f(eyes[0] + 8)} ${f(cy + 2)}q${f(ex - 8)} -3 ${f(2 * ex - 16)} 0"/></g><g fill="#fff" opacity=".45"><path d="M${f(eyes[0] - 5)} ${f(cy)}a6 6 0 0 1 4 -4.6l1 1.6a4.4 4.4 0 0 0 -3 3.4Z"/><path d="M${f(eyes[1] - 5)} ${f(cy)}a6 6 0 0 1 4 -4.6l1 1.6a4.4 4.4 0 0 0 -3 3.4Z"/></g>`;
  }
  return o;
}

/**
 * Keza. Options: pose (arm pose), legs, look (-1..1), mouth (smile | open | o),
 * hold(hands) → markup drawn under her hands (what she carries), front → markup over everything.
 */
export function keza(doc, { x, y, s = 1, flip = false, pose = "stand", legs = "stand", look = 0, mouth = "smile", closed = false, hold, front = "", sit = false, id = "kz" }) {
  const skin = skinFill(doc, "keza");
  const ls = limbSkin("keza");
  doc.def("kz-dress", linear("kz-dress", [[0, "#F0558E"], [1, "#C93A72"]], [0, 0, 0.3, 1]));
  const hair = "#2A1810";
  const [armL, armR] = ARMS[pose];
  let o = "";
  // puffs behind the head
  o += `<g fill="${hair}" stroke="${OUTLINE}" stroke-width="${OW}"><circle cx="-26" cy="-160" r="16.5"/><circle cx="26" cy="-160" r="16.5"/></g>`;
  o += `<path d="M-33 -166c3-5 8-7 13-6M19 -170c4-3 9-3 13 0" fill="none" stroke="#5B3A28" stroke-width="2.6" stroke-linecap="round"/>`;
  if (sit) {
    // cross-legged on the ground: knees out, feet tucked in front
    o += limb([[-8, -40], [-30, -22], [-6, -12]], 14, ls) + limb([[8, -40], [30, -22], [6, -12]], 14, ls);
    o += foot([-6, -14], 1, "#7A4A2A") + foot([6, -14], -1, "#7A4A2A");
  } else {
    const [legL, legR] = LEGS[legs];
    o += limb(legL, 12, ls) + limb(legR, 12, ls);
    o += foot(legL[2], -1, "#7A4A2A") + foot(legR[2], 1, "#7A4A2A");
  }
  // dress, with a cream zig-zag (imigongo) band at the hem
  const hemY = sit ? -30 : -40;
  o += `<path d="M-15 -105C-24 -103-27-96-28-86L-${sit ? 44 : 36} ${hemY - 8}C-${sit ? 45 : 37} ${hemY - 3}-33 ${hemY}-28 ${hemY}H28C33 ${hemY} ${sit ? 45 : 37} ${hemY - 3} ${sit ? 44 : 36} ${hemY - 8}L28-86C27-96 24-103 15-105C8-101-8-101-15-105Z" fill="url(#kz-dress)" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  const zz = [];
  const w0 = sit ? 40 : 32;
  for (let i = 0; i <= 10; i++) zz.push(`${f(-w0 + (i * w0 * 2) / 10)} ${hemY - 7 - (i % 2 ? 5 : 0)}`);
  o += `<path d="M${zz.join("L")}" fill="none" stroke="#FFE7C2" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  o += `<path d="M-12 -101C-6-96 6-96 12-101" fill="none" stroke="#FFE7C2" stroke-width="3.4" stroke-linecap="round"/>`;
  o += `<path d="M-20 -88C-22 -78-24 -68-26 -60" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".45"/>`;
  // arms, then what she holds, then hands and sleeves
  o += limb(armL, 12, ls) + limb(armR, 12, ls);
  if (hold) o += hold(armL[2], armR[2]);
  o += hand(armL[2], skin) + hand(armR[2], skin);
  o += `<g fill="url(#kz-dress)" stroke="${OUTLINE}" stroke-width="${OW}"><ellipse cx="-20" cy="-96" rx="9" ry="8.4"/><ellipse cx="20" cy="-96" rx="9" ry="8.4"/></g>`;
  // head
  o += `<g fill="${skin}" stroke="${OUTLINE}" stroke-width="${OW}"><circle cx="-30" cy="-130" r="6.5"/><circle cx="30" cy="-130" r="6.5"/><ellipse cx="0" cy="-134" rx="31" ry="29.5"/></g>`;
  const hx = look * 4;
  o += `<path d="M-31.5 -132C-33 -156-17 -165 0 -165C17 -165 33 -156 31.5 -132C28 -144 ${f(18 + hx)} -151 ${f(hx)} -150C${f(-18 + hx)} -151-28 -144-31.5 -132Z" fill="${hair}" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  // yellow hair ties at the base of each puff, and the one highlight
  o += `<g fill="#FFC93F" stroke="${OUTLINE}" stroke-width="3"><ellipse cx="-19.5" cy="-150" rx="6.4" ry="4.2" transform="rotate(-38 -19.5 -150)"/><ellipse cx="19.5" cy="-150" rx="6.4" ry="4.2" transform="rotate(38 19.5 -150)"/></g>`;
  o += `<path d="M-14 -160C-9 -162-4 -163 1 -163" fill="none" stroke="#6E5444" stroke-width="3" stroke-linecap="round"/>`;
  o += face({ cx: 0, cy: -134, look, mouth, closed, hair });
  o += front;
  const t = `translate(${f(x)} ${f(y)})${s !== 1 || flip ? ` scale(${flip ? -s : s} ${s})` : ""}`;
  return `<g transform="${t}">${o}</g>`;
}

/** A friend: a boy (Mugisha, short hair, blue shirt) or a girl (Ineza, yellow dress, a bun). */
export function friend(doc, who, { x, y, s = 1, flip = false, pose = "stand", legs = "stand", look = 0, mouth = "smile", hold, front = "", sit = false }) {
  const skin = skinFill(doc, who);
  const ls = limbSkin(who);
  const boy = who === "mugisha";
  const top = boy ? ["#4FB3EA", "#2B88C4"] : ["#FFD45A", "#F2A91C"];
  const gid = `${who}-top`;
  doc.def(gid, linear(gid, [[0, top[0]], [1, top[1]]], [0, 0, 0.3, 1]));
  const hair = "#21130C";
  const [armL, armR] = ARMS[pose];
  let o = "";
  if (!boy) o += `<circle cx="0" cy="-168" r="13" fill="${hair}" stroke="${OUTLINE}" stroke-width="${OW}"/>`;
  if (sit) {
    o += limb([[-8, -40], [-30, -22], [-6, -12]], 14, ls) + limb([[8, -40], [30, -22], [6, -12]], 14, ls);
    o += foot([-6, -14], 1, "#3E5C8A") + foot([6, -14], -1, "#3E5C8A");
  } else {
    const [legL, legR] = LEGS[legs];
    o += limb(legL, 12, ls) + limb(legR, 12, ls);
    o += foot(legL[2], -1, boy ? "#3E5C8A" : "#7A4A2A") + foot(legR[2], 1, boy ? "#3E5C8A" : "#7A4A2A");
  }
  if (boy) {
    const sy = sit ? -30 : -44;
    o += `<path d="M-24 -66L-${sit ? 34 : 26} ${sy}H${sit ? 34 : 26}L24 -66Z" fill="#3C4F86" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
    o += `<path d="M-15 -105C-24 -103-27-96-27-86L-26 -62C-26 -58-24 -56-20 -56H20C24 -56 26 -58 26 -62L27 -86C27 -96 24 -103 15 -105C8 -101-8 -101-15 -105Z" fill="url(#${gid})" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
    o += `<path d="M-6 -101L0 -92L6 -101" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  } else {
    const hemY = sit ? -30 : -40;
    o += `<path d="M-15 -105C-24 -103-27-96-28-86L-${sit ? 44 : 36} ${hemY - 8}C-${sit ? 45 : 37} ${hemY - 3}-33 ${hemY}-28 ${hemY}H28C33 ${hemY} ${sit ? 45 : 37} ${hemY - 3} ${sit ? 44 : 36} ${hemY - 8}L28-86C27-96 24-103 15-105C8-101-8-101-15-105Z" fill="url(#${gid})" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
    o += `<g fill="#FFF3D2">${[-16, 0, 16, -8, 8].map((dx, i) => `<circle cx="${dx}" cy="${i < 3 ? -70 : -56}" r="2.6"/>`).join("")}</g>`;
  }
  o += `<path d="M-20 -88C-22 -78-23 -70-24 -64" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".45"/>`;
  o += limb(armL, 12, ls) + limb(armR, 12, ls);
  if (hold) o += hold(armL[2], armR[2]);
  o += hand(armL[2], skin) + hand(armR[2], skin);
  o += `<g fill="url(#${gid})" stroke="${OUTLINE}" stroke-width="${OW}"><ellipse cx="-20" cy="-96" rx="9" ry="8.4"/><ellipse cx="20" cy="-96" rx="9" ry="8.4"/></g>`;
  o += `<g fill="${skin}" stroke="${OUTLINE}" stroke-width="${OW}"><circle cx="-30" cy="-130" r="6.5"/><circle cx="30" cy="-130" r="6.5"/><ellipse cx="0" cy="-134" rx="31" ry="29.5"/></g>`;
  if (boy) {
    o += `<path d="M-31 -134C-33 -152-20 -164 0 -164C20 -164 33 -152 31 -134C29 -140 26 -145 22 -147C18 -142 12 -146 8 -150C2 -145-6 -146-10 -150C-15 -145-23 -145-26 -146C-28 -142-30 -138-31 -134Z" fill="${hair}" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  } else {
    o += `<path d="M-31.5 -130C-34 -154-18 -165 0 -165C18 -165 34 -154 31.5 -130C29 -138 24 -146 16 -150C6 -146-8 -150-14 -156C-20 -148-28 -142-31.5 -130Z" fill="${hair}" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
    o += `<path d="M-12 -176C-8 -180-2 -182 4 -181" fill="none" stroke="#FFC93F" stroke-width="4" stroke-linecap="round"/>`;
  }
  o += `<path d="M-14 -158C-9 -161-4 -162 1 -162" fill="none" stroke="#5E4637" stroke-width="3" stroke-linecap="round"/>`;
  o += face({ cx: 0, cy: -134, look, mouth, hair });
  o += front;
  const t = `translate(${f(x)} ${f(y)})${s !== 1 || flip ? ` scale(${flip ? -s : s} ${s})` : ""}`;
  return `<g transform="${t}">${o}</g>`;
}

/**
 * A grown-up woman in a wrap dress and headwrap: Grandma (glasses, teal wrap, seated on a stool)
 * or the market seller (orange wrap, behind a stall: only the upper body is drawn).
 */
export function woman(doc, who, { x, y, s = 1, flip = false, look = 0, mouth = "smile", arms = "lap", hold, seated = false, upper = false }) {
  const skin = skinFill(doc, who);
  const ls = limbSkin(who);
  const gran = who === "grandma";
  const wrap = gran ? ["#3BB3A6", "#1F8A80"] : ["#FF9A3C", "#E8701A"];
  const cloth = gran ? ["#FFF1DA", "#F1D7AE"] : ["#7CC46A", "#4E9E48"];
  doc.def(`${who}-wrap`, linear(`${who}-wrap`, [[0, wrap[0]], [1, wrap[1]]], [0, 0, 1, 1]));
  doc.def(`${who}-cloth`, linear(`${who}-cloth`, [[0, cloth[0]], [1, cloth[1]]], [0, 0, 0.3, 1]));
  let o = "";
  const H = -60; // the body is drawn taller than the children's: everything shifts up by 60
  if (seated) {
    // a low wooden stool, a little wider than her lap so it shows; shins down to the ground
    o += `<path d="M-46 -4V-40M46 -4V-40" stroke="${OUTLINE}" stroke-width="${OW * 2 + 7}" stroke-linecap="round"/><path d="M-46 -4V-40M46 -4V-40" stroke="#B27740" stroke-width="7" stroke-linecap="round"/>`;
    o += `<rect x="-60" y="-52" width="120" height="13" rx="6" fill="#C98B4E" stroke="${OUTLINE}" stroke-width="${OW}"/>`;
    o += `<path d="M-22 -46V-10M22 -46V-10" stroke="${OUTLINE}" stroke-width="${12 + OW * 2}" stroke-linecap="round"/><path d="M-22 -46V-10M22 -46V-10" stroke="${ls}" stroke-width="12" stroke-linecap="round"/>`;
    o += foot([-22, -6], -1, "#7A4A2A") + foot([22, -6], 1, "#7A4A2A");
    o += `<path d="M-32 -100C-44 -86-50 -66-50 -52C-50 -46-46 -44-40 -44H40C46 -44 50 -46 50 -52C50 -66 44 -86 32 -100Z" fill="url(#${who}-cloth)" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
    o += `<path d="M0 -50V-72M-30 -50C-28 -58-26 -64-24 -70M30 -50C28 -58 26 -64 24 -70" fill="none" stroke="#D9B98A" stroke-width="3" stroke-linecap="round"/>`;
  }
  const by = seated ? -44 : 0; // body base
  const T = (yy) => yy + by + (seated ? 0 : H);
  if (!seated && !upper) o += `<path d="M-34 ${T(-40)}L-38 -8H38L34 ${T(-40)}Z" fill="url(#${who}-cloth)" stroke="${OUTLINE}" stroke-width="${OW}"/>`;
  // torso with the sash over one shoulder (umushanana style)
  o += `<path d="M-20 ${T(-108)}C-32 ${T(-104)}-36 ${T(-92)}-36 ${T(-78)}L-38 ${T(-36)}H38L36 ${T(-78)}C36 ${T(-92)} 32 ${T(-104)} 20 ${T(-108)}C10 ${T(-102)}-10 ${T(-102)}-20 ${T(-108)}Z" fill="url(#${who}-cloth)" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  o += `<path d="M-22 ${T(-106)}L30 ${T(-40)}H10L-30 ${T(-92)}Z" fill="url(#${who}-wrap)" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>`;
  o += `<path d="M-26 ${T(-92)}C-28 ${T(-80)}-30 ${T(-68)}-31 ${T(-56)}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".5"/>`;
  // arms
  const A =
    arms === "offer"
      ? [[[-24, T(-100)], [-30, T(-74)], [-10, T(-66)]], [[24, T(-100)], [30, T(-74)], [10, T(-66)]]]
      : arms === "receive"
        ? [[[-24, T(-100)], [-8, T(-70)], [22, T(-74)]], [[24, T(-100)], [42, T(-84)], [50, T(-70)]]]
      : arms === "reach"
        ? [[[-24, T(-100)], [-30, T(-74)], [-20, T(-56)]], [[24, T(-100)], [-0, T(-76)], [-26, T(-80)]]]
        : arms === "wave"
          ? [[[-24, T(-100)], [-30, T(-74)], [-20, T(-56)]], [[24, T(-100)], [40, T(-118)], [42, T(-146)]]]
          : [[[-24, T(-100)], [-32, T(-72)], [-14, T(-50)]], [[24, T(-100)], [32, T(-72)], [14, T(-50)]]];
  o += limb(A[0], 13, ls) + limb(A[1], 13, ls);
  if (hold) o += hold(A[0][2], A[1][2]);
  o += hand(A[0][2], skin, 7.2) + hand(A[1][2], skin, 7.2);
  // head and headwrap
  const hy = T(-140);
  o += `<g fill="${skin}" stroke="${OUTLINE}" stroke-width="${OW}"><ellipse cx="0" cy="${hy}" rx="30" ry="30"/></g>`;
  o += `<path d="M-33 ${hy - 2}C-38 ${hy - 30}-20 ${hy - 50} 2 ${hy - 50}C24 ${hy - 50} 40 ${hy - 34} 34 ${hy - 4}C30 ${hy - 14} 20 ${hy - 20} 0 ${hy - 20}C-18 ${hy - 20}-28 ${hy - 14}-33 ${hy - 2}Z" fill="url(#${who}-wrap)" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  o += `<path d="M18 ${hy - 46}C30 ${hy - 58} 44 ${hy - 54} 42 ${hy - 40}C36 ${hy - 46} 28 ${hy - 46} 22 ${hy - 40}Z" fill="url(#${who}-wrap)" stroke="${OUTLINE}" stroke-width="${OW}" stroke-linejoin="round"/>`;
  o += `<path d="M-24 ${hy - 30}C-18 ${hy - 38}-8 ${hy - 42} 4 ${hy - 42}M-26 ${hy - 20}C-16 ${hy - 28} 0 ${hy - 31} 16 ${hy - 30}" fill="none" stroke="${gran ? "#BFF0E6" : "#FFE0A8"}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>`;
  if (gran) o += `<path d="M-31 ${hy - 4}C-32 ${hy - 10}-30 ${hy - 14}-27 ${hy - 15}M31 ${hy - 4}C32 ${hy - 10} 30 ${hy - 14} 27 ${hy - 15}" fill="none" stroke="#E8E2DA" stroke-width="3.4" stroke-linecap="round"/>`;
  o += face({ cx: 0, cy: hy + 2, look, mouth, glasses: gran, age: gran ? 0.6 : 0, hair: "#3A2418" });
  if (gran) o += `<path d="M-23 ${hy + 20}q3 3 6 3M23 ${hy + 20}q-3 3-6 3" fill="none" stroke="#5A2E16" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>`;
  const t = `translate(${f(x)} ${f(y)})${s !== 1 || flip ? ` scale(${flip ? -s : s} ${s})` : ""}`;
  return `<g transform="${t}">${o}</g>`;
}
