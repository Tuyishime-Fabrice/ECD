import clsx from "clsx";

const COLORS = [
  "var(--c-sun)",
  "var(--c-listen)",
  "var(--c-coral)",
  "var(--c-leaf)",
  "var(--c-berry)",
];

// Fixed layout (no randomness) so server and client render the same thing.
const PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const distance = 90 + (i % 3) * 35;
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance * 0.8),
    r: (i % 2 ? 1 : -1) * (120 + i * 15),
    color: COLORS[i % COLORS.length],
    star: i % 2 === 0,
    delay: (i % 4) * 40,
  };
});

/** Light CSS-only confetti/star burst from the center of its parent. */
export function StarBurst({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("pointer-events-none absolute left-1/2 top-1/2 size-0", className)}>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute left-0 top-0 block animate-burst opacity-0"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--r": `${p.r}deg`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        >
          {p.star ? (
            <svg viewBox="0 0 24 24" className="size-6">
              <path
                d="M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z"
                style={{ fill: p.color }}
                className="stroke-ink-900"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="block size-3 rounded-sm" style={{ background: p.color }} />
          )}
        </span>
      ))}
    </div>
  );
}
