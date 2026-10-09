/**
 * Izuba, the sun mascot, for the SVG files (logo, empty states, the time's-up scene).
 * The app draws Izuba inline with components/Mascot.tsx: keep the two in step.
 */
import { GLYPHS, INK, OUTLINE, linear, radial } from "./lib.mjs";

const RAY_LONG = "M60 3C67 3 70 13 66.5 22H53.5C50 13 53 3 60 3Z";
const RAY_SHORT = "M60 11C64.5 11 66.5 17 64.5 23H55.5C53.5 17 55.5 11 60 11Z";

const arm = (d, hx, hy) =>
  `<path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="12" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#FFBE38" stroke-width="6" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="7.5" fill="#FFD453" stroke="${OUTLINE}" stroke-width="3"/>`;
const ARM_R = ["M83 87C95 84 104 74 107 60", 108, 55];
const ARM_L = ["M37 87C25 84 16 74 13 60", 12, 55];
const eye = (x, y = 59) => `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="6" fill="${INK}"/><circle cx="${x + 1.7}" cy="${y - 2.6}" r="1.8" fill="#fff"/>`;
const SMILE = `<path d="M49.5 70.5C52 80 68 80 70.5 70.5C63 73 57 73 49.5 70.5Z" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M54.5 75.6C57.5 74 62.5 74 65.5 75.6C63 78.4 57 78.4 54.5 75.6Z" fill="#FF8467"/>`;

/**
 * Izuba in a 120×120 box. Poses: happy, wave, cheer, oops, sleep; "hold" raises both hands in
 * front of the face (for holding a map or a cloud). `p` prefixes gradient ids.
 */
export function mascot(doc, pose = "happy", p = "m") {
  doc.def(`${p}f`, radial(`${p}f`, [[0, "#FFEB97"], [0.55, "#FFCB3D"], [1, "#FFA81E"]], [0.38, 0.32, 0.8]));
  doc.def(`${p}r`, linear(`${p}r`, [[0, "#FFC93F"], [1, "#FF9F1A"]]));
  const rays =
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="${RAY_LONG}"${a ? ` transform="rotate(${a} 60 60)"` : ""}/>`).join("") +
    [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a) => `<path d="${RAY_SHORT}" transform="rotate(${a} 60 60)"/>`).join("");
  let arms = "";
  if (pose === "wave") arms = arm(...ARM_R);
  if (pose === "cheer") arms = arm("M37 87C24 82 15 66 12 48", 11, 43) + arm("M83 87C96 82 105 66 108 48", 109, 43);
  let face;
  const tilt = pose === "oops" ? ' transform="rotate(-9 60 64)"' : "";
  if (pose === "cheer") {
    face =
      `<path d="M42 60C43.5 53 51.5 53 53 60M67 60C68.5 53 76.5 53 78 60" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="M46.5 69C49 84 71 84 73.5 69C64 72 56 72 46.5 69Z" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M52.5 76.8C56.5 74.6 63.5 74.6 67.5 76.8C64.5 80.6 55.5 80.6 52.5 76.8Z" fill="#FF8467"/>`;
  } else if (pose === "sleep") {
    face =
      `<path d="M42 60C44 65 51 65 53 60M67 60C69 65 76 65 78 60" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<ellipse cx="60" cy="74" rx="4.2" ry="3.6" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.4"/>`;
  } else if (pose === "oops") {
    face =
      eye(47.5, 60) +
      eye(72.5, 60) +
      `<path d="M41.5 49C44 46.5 48 45.5 52 46M68 46C72 45.5 76 46.5 78.5 49" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<ellipse cx="60" cy="75" rx="4.4" ry="4.8" fill="#7C2D12" stroke="${OUTLINE}" stroke-width="2.4"/>`;
  } else {
    face = eye(47.5) + eye(72.5) + SMILE;
  }
  const cheek = pose === "sleep" ? 0.6 : 0.45;
  let extra = "";
  if (pose === "sleep") {
    doc.def(`${p}c`, linear(`${p}c`, [[0, "#9C86F0"], [1, "#6C4FD0"]], [0, 0, 1, 1]));
    extra =
      `<path d="M30 36C31 31 32 29 33 27C26 27 19 29 13 32L11 26C22 12 44 2 72 2C85 2 94 10 94 22C94 29 93 33 91 37Z" fill="url(#${p}c)" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M47 12C49 10 52 10 54 12M70 9C72 7 75 8 76 10M82 22C83 20 86 20 87 22M29 17C30 15 32 15 33 16" fill="none" stroke="#D9CCFF" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M21 45C25 29 95 29 99 45L96 51C88 35 32 35 24 51Z" fill="#FFF4E0" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>` +
      `<circle cx="11" cy="30" r="7" fill="#FFF4E0" stroke="${OUTLINE}" stroke-width="3"/>` +
      zzz(doc, p);
  }
  return (
    `<g stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round" fill="url(#${p}r)">${rays}</g>` +
    `<circle cx="60" cy="60" r="38" fill="url(#${p}f)" stroke="${OUTLINE}" stroke-width="3"/>` +
    `<path d="M36 50A27 27 0 0 1 51 33.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>` +
    `<g${tilt}><ellipse cx="39" cy="70" rx="7.5" ry="4.8" fill="#FF7F5C" opacity="${cheek}"/><ellipse cx="81" cy="70" rx="7.5" ry="4.8" fill="#FF7F5C" opacity="${cheek}"/>${face}</g>` +
    arms +
    extra
  );
}

/** "z z" for the sleeping pose: outlined Baloo glyphs, berry with a white rim. */
function zzz(doc, p) {
  doc.def(`${p}z`, `<path id="${p}z" d="${GLYPHS.z.d}"/>`);
  const one = (x, y, s) => `<use href="#${p}z" transform="translate(${x} ${y}) scale(${s})"/>`;
  const both = one(97, 34, 0.3) + one(108, 16, 0.22);
  return `<g fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round">${both}</g><g fill="#8E5BD0">${both}</g>`;
}
