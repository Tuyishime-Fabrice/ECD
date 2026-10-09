import clsx from "clsx";
import { useId } from "react";

/*
 * Izuba, the sun mascot, drawn inline so it can move. The shapes mirror
 * scripts/art/mascot.mjs, which draws Izuba into the SVG files (logo, empty states,
 * time's-up scenes): change both together. Mascot.test.tsx checks that they match.
 */

export type MascotPose = "happy" | "wave" | "cheer" | "oops" | "sleep";

const OUTLINE = "#5A3112";
const INK = "#3A1F0E";

const RAY_LONG = "M60 3C67 3 70 13 66.5 22H53.5C50 13 53 3 60 3Z";
const RAY_SHORT = "M60 11C64.5 11 66.5 17 64.5 23H55.5C53.5 17 55.5 11 60 11Z";
const LONG_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SHORT_ANGLES = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

/** "z" from Baloo 2 ExtraBold (SIL OFL 1.1), as in scripts/art/glyphs.json. */
const Z_GLYPH =
  "M41.2-33.3L13.6 0L6.9 0Q5.3-1.4 4.4-3.3Q3.4-5.2 3.4-7.6L3.4-7.6Q3.4-9.6 4.4-11.6Q5.3-13.5 6.7-15.2L6.7-15.2L35.1-48.5L41-48.5Q42.6-47.1 43.6-45.2Q44.5-43.3 44.5-40.9L44.5-40.9Q44.5-38.9 43.6-37.0Q42.6-35 41.2-33.3L41.2-33.3ZM9.5-48.5L37.4-48.5L37.4-35.4L5.5-35.4Q4.9-36.5 4.4-38.3Q3.8-40 3.8-41.9L3.8-41.9Q3.8-45.4 5.4-47.0Q7-48.5 9.5-48.5L9.5-48.5ZM40 0L12.1 0L12.1-13.1L44-13.1Q44.6-12.1 45.2-10.4Q45.7-8.6 45.7-6.6L45.7-6.6Q45.7-3.1 44.2-1.6Q42.6 0 40 0L40 0Z";

// CSS transforms on SVG parts turn around a point in the 120×120 drawing.
const pivot = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" as const });

function Arm({ d, hand }: { d: string; hand: [number, number] }) {
  return (
    <>
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth="12" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#FFBE38" strokeWidth="6" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r="7.5" fill="#FFD453" stroke={OUTLINE} strokeWidth="3" />
    </>
  );
}

function Eye({ x, y = 59 }: { x: number; y?: number }) {
  return (
    <>
      <ellipse cx={x} cy={y} rx="4.6" ry="6" fill={INK} />
      <circle cx={x + 1.7} cy={y - 2.6} r="1.8" fill="#fff" />
    </>
  );
}

function Face({ pose }: { pose: MascotPose }) {
  if (pose === "cheer") {
    return (
      <>
        <path d="M42 60C43.5 53 51.5 53 53 60M67 60C68.5 53 76.5 53 78 60" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M46.5 69C49 84 71 84 73.5 69C64 72 56 72 46.5 69Z" fill="#7C2D12" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M52.5 76.8C56.5 74.6 63.5 74.6 67.5 76.8C64.5 80.6 55.5 80.6 52.5 76.8Z" fill="#FF8467" />
      </>
    );
  }
  if (pose === "sleep") {
    return (
      <>
        <path d="M42 60C44 65 51 65 53 60M67 60C69 65 76 65 78 60" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        <ellipse cx="60" cy="74" rx="4.2" ry="3.6" fill="#7C2D12" stroke={OUTLINE} strokeWidth="2.4" />
      </>
    );
  }
  if (pose === "oops") {
    return (
      <>
        <Eye x={47.5} y={60} />
        <Eye x={72.5} y={60} />
        <path d="M41.5 49C44 46.5 48 45.5 52 46M68 46C72 45.5 76 46.5 78.5 49" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="60" cy="75" rx="4.4" ry="4.8" fill="#7C2D12" stroke={OUTLINE} strokeWidth="2.4" />
      </>
    );
  }
  return (
    <>
      <Eye x={47.5} />
      <Eye x={72.5} />
      <path d="M49.5 70.5C52 80 68 80 70.5 70.5C63 73 57 73 49.5 70.5Z" fill="#7C2D12" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M54.5 75.6C57.5 74 62.5 74 65.5 75.6C63 78.4 57 78.4 54.5 75.6Z" fill="#FF8467" />
    </>
  );
}

/** The nightcap and a drifting "z z" for the sleep pose. */
function Nightcap({ p }: { p: string }) {
  const zs = (
    <>
      <use href={`#${p}z`} transform="translate(97 34) scale(0.3)" />
      <use href={`#${p}z`} transform="translate(108 16) scale(0.22)" />
    </>
  );
  return (
    <>
      <path
        d="M30 36C31 31 32 29 33 27C26 27 19 29 13 32L11 26C22 12 44 2 72 2C85 2 94 10 94 22C94 29 93 33 91 37Z"
        fill={`url(#${p}c)`}
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M47 12C49 10 52 10 54 12M70 9C72 7 75 8 76 10M82 22C83 20 86 20 87 22M29 17C30 15 32 15 33 16" fill="none" stroke="#D9CCFF" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 45C25 29 95 29 99 45L96 51C88 35 32 35 24 51Z" fill="#FFF4E0" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="11" cy="30" r="7" fill="#FFF4E0" stroke={OUTLINE} strokeWidth="3" />
      <g className="motion-safe:animate-float">
        <g fill="#fff" stroke="#fff" strokeWidth="10" strokeLinejoin="round">
          {zs}
        </g>
        <g fill="#8E5BD0">{zs}</g>
      </g>
    </>
  );
}

/**
 * Izuba in a 120×120 box. The rays turn slowly and the waving arm waves (motion-safe);
 * asleep, the rays rest and the "z z" drifts instead.
 */
export function Mascot({ pose = "happy", className, label }: { pose?: MascotPose; className?: string; label?: string }) {
  // Several mascots can share a page, so every gradient id is unique to this one.
  const p = `izuba${useId().replace(/[^\w-]/g, "")}`;
  const asleep = pose === "sleep";
  return (
    <svg
      viewBox="0 0 120 120"
      className={clsx("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <radialGradient id={`${p}f`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FFEB97" />
          <stop offset="0.55" stopColor="#FFCB3D" />
          <stop offset="1" stopColor="#FFA81E" />
        </radialGradient>
        <linearGradient id={`${p}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC93F" />
          <stop offset="1" stopColor="#FF9F1A" />
        </linearGradient>
        {asleep && (
          <>
            <linearGradient id={`${p}c`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9C86F0" />
              <stop offset="1" stopColor="#6C4FD0" />
            </linearGradient>
            <path id={`${p}z`} d={Z_GLYPH} />
          </>
        )}
      </defs>

      <g
        className={asleep ? undefined : "motion-safe:animate-spin-slow"}
        style={asleep ? undefined : pivot(60, 60)}
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
        fill={`url(#${p}r)`}
      >
        {LONG_ANGLES.map((a) => (
          <path key={a} d={RAY_LONG} transform={a ? `rotate(${a} 60 60)` : undefined} />
        ))}
        {SHORT_ANGLES.map((a) => (
          <path key={a} d={RAY_SHORT} transform={`rotate(${a} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="38" fill={`url(#${p}f)`} stroke={OUTLINE} strokeWidth="3" />
      <path d="M36 50A27 27 0 0 1 51 33.5" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".6" />
      <g transform={pose === "oops" ? "rotate(-9 60 64)" : undefined}>
        <ellipse cx="39" cy="70" rx="7.5" ry="4.8" fill="#FF7F5C" opacity={asleep ? 0.6 : 0.45} />
        <ellipse cx="81" cy="70" rx="7.5" ry="4.8" fill="#FF7F5C" opacity={asleep ? 0.6 : 0.45} />
        <Face pose={pose} />
      </g>

      {pose === "wave" && (
        <g className="motion-safe:animate-wave" style={pivot(83, 87)}>
          <Arm d="M83 87C95 84 104 74 107 60" hand={[108, 55]} />
        </g>
      )}
      {pose === "cheer" && (
        <>
          <Arm d="M37 87C24 82 15 66 12 48" hand={[11, 43]} />
          <Arm d="M83 87C96 82 105 66 108 48" hand={[109, 43]} />
        </>
      )}
      {asleep && <Nightcap p={p} />}
    </svg>
  );
}
