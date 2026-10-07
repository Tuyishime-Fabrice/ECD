import clsx from "clsx";

/*
 * PLACEHOLDER MASCOT — a friendly sun drawn as simple shapes.
 * Replace this component when the real characters are designed.
 */

export type MascotPose = "happy" | "wave" | "cheer" | "oops";

const INK = "#263238";
const SUN = "#FFD23F";
const CHEEK = "#FF8A65";

function Arm({ d, hand, className, origin }: { d: string; hand: [number, number]; className?: string; origin?: string }) {
  return (
    <g className={className} style={origin ? { transformOrigin: origin, transformBox: "view-box" } : undefined}>
      <path d={d} fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d={d} fill="none" stroke={SUN} strokeWidth="5" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r="7" fill={SUN} stroke={INK} strokeWidth="3" />
    </g>
  );
}

export function Mascot({ pose = "happy", className, label }: { pose?: MascotPose; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={clsx("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-placeholder="mascot"
    >
      <g className="motion-safe:animate-spin-slow" style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x="55"
            y="3"
            width="10"
            height="17"
            rx="5"
            fill={SUN}
            stroke={INK}
            strokeWidth="3"
            transform={`rotate(${i * 30} 60 60)`}
          />
        ))}
      </g>

      {pose === "wave" && (
        <Arm d="M90 74 L106 46" hand={[107, 43]} className="animate-wave" origin="90px 74px" />
      )}
      {pose === "cheer" && (
        <>
          <Arm d="M30 72 L12 46" hand={[11, 43]} />
          <Arm d="M90 72 L108 46" hand={[109, 43]} />
        </>
      )}

      <circle cx="60" cy="60" r="36" fill={SUN} stroke={INK} strokeWidth="4" />
      <circle cx="42" cy="70" r="6" fill={CHEEK} opacity="0.55" />
      <circle cx="78" cy="70" r="6" fill={CHEEK} opacity="0.55" />

      {pose === "cheer" ? (
        <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d="M42 56 Q48 49 54 56" />
          <path d="M66 56 Q72 49 78 56" />
        </g>
      ) : (
        <g fill={INK}>
          <ellipse cx="48" cy={pose === "oops" ? 54 : 56} rx="4.5" ry="6" />
          <ellipse cx="72" cy={pose === "oops" ? 54 : 56} rx="4.5" ry="6" />
          <circle cx="49.5" cy={pose === "oops" ? 51.5 : 53.5} r="1.6" fill="#fff" />
          <circle cx="73.5" cy={pose === "oops" ? 51.5 : 53.5} r="1.6" fill="#fff" />
        </g>
      )}

      {pose === "cheer" ? (
        <path d="M46 68 Q60 86 74 68 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      ) : pose === "oops" ? (
        <ellipse cx="60" cy="74" rx="6" ry="5" fill={INK} />
      ) : (
        <path d="M47 69 Q60 81 73 69" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  );
}
