/**
 * UI objects: the challenge gift (closed and open), the agaseke answer plate, the empty sticker
 * slot, the offline and 404 pictures, and the logo. One file each in public/images/ui.
 */
import { Doc, GLYPHS, OUTLINE, f, linear, radial } from "./lib.mjs";
import { mascot } from "./mascot.mjs";

const SW = 3.5;

/* ---------- gift ---------- */

function giftDefs(doc) {
  doc.def("gbox", linear("gbox", [[0, "#AE84EC"], [1, "#7A48C4"]], [0, 0, 0.6, 1]));
  doc.def("glid", linear("glid", [[0, "#CDB0F7"], [1, "#9E76E2"]], [0, 0, 0, 1]));
  doc.def("gold", linear("gold", [[0, "#FFD866"], [1, "#F5A81C"]], [0, 0, 0, 1]));
}

/** Imigongo chevrons stacked down a vertical ribbon (x0..x1, y0..y1). */
function chevrons(x0, x1, y0, y1, step = 8) {
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  let dark = "";
  let ochre = "";
  for (let y = y0 + 3, i = 0; y < y1 - 2; y += step / 2, i++) {
    const d = `M${f(x0 + 1.5)} ${f(y)}L${f(mid)} ${f(y + half * 0.55)}L${f(x1 - 1.5)} ${f(y)}`;
    if (i % 2) ochre += d;
    else dark += d;
  }
  return `<path d="${dark}" fill="none" stroke="#7A3416" stroke-width="2.2" stroke-linejoin="miter"/><path d="${ochre}" fill="none" stroke="#FFF1D2" stroke-width="1.8" stroke-linejoin="miter"/>`;
}

const BOW = `<path d="M60 36C50 22 30 12 24 22C20 30 32 38 60 38Z" fill="url(#gold)"/><path d="M60 36C70 22 90 12 96 22C100 30 88 38 60 38Z" fill="url(#gold)"/><path d="M58 36C48 28 36 22 31 24" fill="none" stroke="#C97A00" stroke-width="2" opacity=".6"/><path d="M62 36C72 28 84 22 89 24" fill="none" stroke="#C97A00" stroke-width="2" opacity=".6"/>`;

function gift() {
  const doc = new Doc();
  giftDefs(doc);
  const o = `<g stroke="${OUTLINE}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">
    ${BOW}
    <rect x="20" y="52" width="80" height="58" rx="9" fill="url(#gbox)"/>
    <path d="M84 54H91C96 54 98 57 98 62V100C98 105 96 108 91 108H84Z" fill="#6A3BB0" stroke="none" opacity=".35"/>
    <rect x="51" y="52" width="18" height="58" fill="url(#gold)"/>
    <rect x="13" y="36" width="94" height="21" rx="8" fill="url(#glid)"/>
    <rect x="51" y="36" width="18" height="21" fill="url(#gold)"/>
    <rect x="53" y="28" width="14" height="13" rx="5" fill="url(#gold)"/>
  </g>
  ${chevrons(51, 69, 52, 110)}${chevrons(51, 69, 36, 57)}
  <path d="M51 52V110M69 52V110M51 36V57M69 36V57" stroke="${OUTLINE}" stroke-width="${SW}"/>
  <rect x="20" y="52" width="80" height="58" rx="9" fill="none" stroke="${OUTLINE}" stroke-width="${SW}"/>
  <rect x="13" y="36" width="94" height="21" rx="8" fill="none" stroke="${OUTLINE}" stroke-width="${SW}"/>
  <path d="M21 42H42M28 64V96" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".6"/>`;
  return { doc, body: o };
}

function giftOpen() {
  const doc = new Doc();
  giftDefs(doc);
  doc.def("beam", radial("beam", [[0, "#FFF6C8", 0.95], [0.55, "#FFE27A", 0.5], [1, "#FFE27A", 0]]));
  doc.def("ray", radial("ray", [[0, "#FFF3B0", 0.8], [1, "#FFE27A", 0]], [70, 74, 64], ' gradientUnits="userSpaceOnUse"'));
  doc.def("star", linear("star", [[0, "#FFE071"], [1, "#FFAE1A"]]));
  const R = 64;
  const beams = [-56, -28, 0, 28, 56].map((a) => `<path d="M70 74L${f(70 + R * Math.sin(((a - 7) * Math.PI) / 180))} ${f(74 - R * Math.cos(((a - 7) * Math.PI) / 180))}A${R} ${R} 0 0 1 ${f(70 + R * Math.sin(((a + 7) * Math.PI) / 180))} ${f(74 - R * Math.cos(((a + 7) * Math.PI) / 180))}Z"/>`).join("");
  const star = "M70 30l6.4 13 14.3 2.1-10.4 10.1 2.5 14.2L70 62.7l-12.8 6.7 2.5-14.2-10.4-10.1 14.3-2.1Z";
  const sp = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-10C1-3 3-1 10 0C3 1 1 3 0 10C-1 3-3 1-10 0C-3-1-1-3 0-10Z"/>`;
  const o = `<circle cx="70" cy="66" r="62" fill="url(#beam)"/>
  <g fill="url(#ray)">${beams}</g>
  <g stroke="${OUTLINE}" stroke-width="${SW}" stroke-linejoin="round">
    <path d="${star}" fill="url(#star)" transform="rotate(-8 70 50)"/>
  </g>
  <g transform="rotate(-8 70 50)"><circle cx="66" cy="50" r="1.8" fill="#3A1F0E"/><circle cx="74" cy="50" r="1.8" fill="#3A1F0E"/><path d="M66.5 54.4q3.5 3 7 0" fill="none" stroke="#3A1F0E" stroke-width="2" stroke-linecap="round"/><path d="M62 42l3-.6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>
  <g stroke="${OUTLINE}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">
    <rect x="30" y="74" width="80" height="58" rx="9" fill="url(#gbox)"/>
    <path d="M30 80C30 76 33 74 37 74H103C107 74 110 76 110 80V84H30Z" fill="#5A2E9C"/>
    <rect x="61" y="74" width="18" height="58" fill="url(#gold)"/>
  </g>
  ${chevrons(61, 79, 84, 132)}
  <path d="M61 74V132M79 74V132" stroke="${OUTLINE}" stroke-width="${SW}"/>
  <rect x="30" y="74" width="80" height="58" rx="9" fill="none" stroke="${OUTLINE}" stroke-width="${SW}"/>
  <path d="M38 88V118" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".6"/>
  <g transform="translate(104 34) rotate(26) scale(.6) translate(-60 -42)">
    <g stroke="${OUTLINE}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">${BOW}<rect x="13" y="36" width="94" height="21" rx="8" fill="url(#glid)"/><rect x="51" y="36" width="18" height="21" fill="url(#gold)"/><rect x="53" y="28" width="14" height="13" rx="5" fill="url(#gold)"/></g>
    ${chevrons(51, 69, 36, 57)}<path d="M51 36V57M69 36V57" stroke="${OUTLINE}" stroke-width="${SW}"/><rect x="13" y="36" width="94" height="21" rx="8" fill="none" stroke="${OUTLINE}" stroke-width="${SW}"/>
    <path d="M21 42H42" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".6"/>
  </g>
  <g fill="#FFC93F" stroke="${OUTLINE}" stroke-width="1.6" stroke-linejoin="round">${sp(22, 40, 0.9)}${sp(40, 18, 0.6)}${sp(118, 112, 0.6)}${sp(20, 98, 0.55)}</g>`;
  return { doc, body: o };
}

/* ---------- agaseke answer plate (top-down) ---------- */

function plate() {
  const doc = new Doc();
  doc.def("pl", radial("pl", [[0, "#FCEFD4"], [0.75, "#F6DFB2"], [1, "#EDCB8E"]]));
  const c = 100;
  // the coiled straw: an Archimedean spiral, with short stitches across it
  let spiral = "";
  let stitches = "";
  const turns = 9;
  const r0 = 6;
  const r1 = 74;
  const n = turns * 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    const x = c + r * Math.cos(a);
    const y = c + r * Math.sin(a);
    spiral += `${i ? "L" : "M"}${f(x)} ${f(y)}`;
    if (i % 4 === 2 && r > 12) {
      const k = (r1 - r0) / turns / 2.4;
      stitches += `M${f(c + (r - k) * Math.cos(a))} ${f(c + (r - k) * Math.sin(a))}L${f(c + (r + k) * Math.cos(a + 0.02))} ${f(c + (r + k) * Math.sin(a + 0.02))}`;
    }
  }
  // imigongo zig-zag band near the rim
  const zig = (ri, ro, count, rot) => {
    let d = "";
    for (let i = 0; i <= count * 2; i++) {
      const a = (i / (count * 2)) * Math.PI * 2 + rot;
      const r = i % 2 ? ro : ri;
      d += `${i ? "L" : "M"}${f(c + r * Math.cos(a))} ${f(c + r * Math.sin(a))}`;
    }
    return d + "Z";
  };
  const o = `<circle cx="100" cy="100" r="99" fill="#D3A15E"/>
  <circle cx="100" cy="100" r="95" fill="#EDC98D"/>
  <circle cx="100" cy="100" r="78" fill="url(#pl)"/>
  <path d="${spiral}" fill="none" stroke="#E2BC7E" stroke-width="2.4"/>
  <path d="${stitches}" fill="none" stroke="#D2A462" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
  <circle cx="100" cy="100" r="86.5" fill="#F6E2BA"/>
  <path d="${zig(80.5, 92, 20, 0)}" fill="none" stroke="#C9653A" stroke-width="3" stroke-linejoin="miter"/>
  <path d="${zig(80.5, 92, 20, Math.PI / 20)}" fill="none" stroke="#7A3416" stroke-width="1.6" stroke-linejoin="miter" opacity=".55"/>
  <circle cx="100" cy="100" r="78.5" fill="none" stroke="#D9AE6E" stroke-width="2.4"/>
  <circle cx="100" cy="100" r="95" fill="none" stroke="#C48F4E" stroke-width="1.6"/>
  <path d="M38 64A72 72 0 0 1 70 34" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/>`;
  return { doc, body: o };
}

/* ---------- empty sticker slot: works on light and dark paper (berry with transparency) ---------- */

function stickerSlot() {
  const doc = new Doc();
  const berry = "#9B6FE0";
  const q = GLYPHS["?"];
  const s = 0.95;
  const o = `<circle cx="100" cy="99" r="92" fill="${berry}" opacity=".14"/>
  <circle cx="100" cy="99" r="80" fill="none" stroke="${berry}" stroke-width="3.5" stroke-dasharray="11 8" stroke-linecap="round" opacity=".55"/>
  <g fill="${berry}" opacity=".26">
    <path d="M100 66C90 52 72 46 68 56C66 63 76 68 100 68ZM100 66C110 52 128 46 132 56C134 63 124 68 100 68Z"/>
    <rect x="58" y="70" width="84" height="22" rx="8"/>
    <rect x="64" y="96" width="72" height="58" rx="9"/>
  </g>
  <g transform="translate(${f(100 - ((q.bbox[0] + q.bbox[2]) / 2) * s)} 132) scale(${s})" fill="${berry}"><path d="${q.d}"/></g>`;
  return { doc, body: o };
}

/* ---------- empty states (no sky: they sit on the page in either theme) ---------- */

function cloudShape(doc, id, d) {
  doc.def(id, linear(id, [[0, "#FFFFFF"], [1, "#DDE6F6"]]));
  return `<path d="${d}" fill="url(#${id})" stroke="${OUTLINE}" stroke-width="${SW}" stroke-linejoin="round"/>`;
}

function offline() {
  const doc = new Doc();
  let o = `<g transform="translate(64 6) scale(.98)">${mascot(doc, "oops", "m")}</g>`;
  o += cloudShape(doc, "cl", "M38 176C18 176 12 152 30 144C26 124 48 112 64 122C70 100 98 92 114 106C124 88 156 88 166 108C182 98 206 108 204 128C222 130 230 152 214 166C210 174 202 176 196 176Z");
  o += `<path d="M44 160C70 166 170 166 206 160" fill="none" stroke="#C9D5EC" stroke-width="5" stroke-linecap="round"/>`;
  o += `<path d="M56 136C60 128 68 124 76 125M122 112C128 104 138 102 146 104" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
  o += `<g fill="#7FC2F0" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"><path d="M86 184c5.5 8 7 13 0 17c-7-4-5.5-9 0-17Z"/><path d="M122 189c5.5 8 7 13 0 17c-7-4-5.5-9 0-17Z"/><path d="M158 184c5.5 8 7 13 0 17c-7-4-5.5-9 0-17Z"/></g>`;
  return { doc, body: o };
}

function lost() {
  const doc = new Doc();
  doc.def("mp", linear("mp", [[0, "#FFF7E6"], [1, "#F3DFB8"]], [0, 0, 1, 1]));
  let o = `<g transform="translate(60 4)">${mascot(doc, "oops", "m")}</g>`;
  // an unfolded paper map held up in front, three panels
  const map = `<g stroke="${OUTLINE}" stroke-width="${SW}" stroke-linejoin="round">
    <path d="M60 106L100 99L100 190L60 197Z" fill="url(#mp)"/>
    <path d="M100 99L140 106L140 197L100 190Z" fill="#EFD9AE"/>
    <path d="M140 106L180 99L180 190L140 197Z" fill="url(#mp)"/>
  </g>
  <path d="M70 126C76 120 84 121 90 128M150 122C156 116 166 116 172 124" fill="none" stroke="#9BCB7E" stroke-width="7" stroke-linecap="round"/>
  <path d="M70 180C80 170 90 176 100 164C110 152 120 166 130 154C138 146 148 152 156 140" fill="none" stroke="#C9653A" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/>
  <path d="M156 134l10 10M166 134l-10 10" stroke="#E85F12" stroke-width="4" stroke-linecap="round"/>
  <path d="M114 128C114 120 126 120 126 128V136H114Z" fill="#D9A156" stroke="${OUTLINE}" stroke-width="2"/>
  <path d="M66 114L94 108" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  o += map;
  // arms reach down to hold the map's top corners
  const arms = "M90 92C80 96 72 100 66 106M150 92C160 96 168 100 174 103";
  o += `<path d="${arms}" fill="none" stroke="${OUTLINE}" stroke-width="12" stroke-linecap="round"/><path d="${arms}" fill="none" stroke="#FFBE38" stroke-width="6" stroke-linecap="round"/>`;
  o += `<g fill="#FFD453" stroke="${OUTLINE}" stroke-width="3"><circle cx="64" cy="108" r="8.5"/><circle cx="176" cy="103" r="8.5"/></g>`;
  return { doc, body: o };
}

function logo() {
  const doc = new Doc();
  return { doc, body: mascot(doc, "happy", "m") };
}

export function buildUi(write) {
  const items = [
    ["images/ui/gift.svg", gift, 120, 120],
    ["images/ui/gift-open.svg", giftOpen, 140, 140],
    ["images/ui/plate.svg", plate, 200, 200],
    ["images/ui/sticker-slot.svg", stickerSlot, 200, 200],
    ["images/ui/offline.svg", offline, 240, 210],
    ["images/ui/lost.svg", lost, 220, 210],
  ];
  for (const [rel, make, w, h] of items) {
    const { doc, body } = make();
    write(rel, { w, h, body, doc });
  }
  const { doc, body } = logo();
  write("icons/logo.svg", { w: 120, h: 120, body, doc, root: ' role="img" aria-label="Izuba"' });
}
