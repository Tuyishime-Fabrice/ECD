import clsx from "clsx";
import { Check, Lock, Play, Star } from "lucide-react";

/** Green check in a picture's top-right corner: this story was watched. */
export function WatchedMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid size-8 place-items-center rounded-full border-2 border-paper bg-leaf shadow-e1", className)}
    >
      <Check className="size-4 text-on-accent" strokeWidth={4} />
    </span>
  );
}

/** Lock badge for challenges that still need stories watched. */
export function LockMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid size-8 place-items-center rounded-full border-2 border-paper bg-brand-strong shadow-e1", className)}
    >
      <Lock className="size-3.5 text-on-accent" strokeWidth={3} />
    </span>
  );
}

/** Small coral play disc for the "up next" story. */
export function PlayDisc({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid size-11 place-items-center rounded-full border-2 border-paper bg-play shadow-e2", className)}
    >
      <Play className="ml-0.5 size-5 fill-on-accent text-on-accent" strokeWidth={2.5} />
    </span>
  );
}

/** Mustard progress strip. A started story always shows a sliver; 0 shows an empty track. */
export function ProgressStrip({ percent, className }: { percent: number; className?: string }) {
  const width = percent <= 0 ? 0 : Math.max(6, Math.min(100, percent));
  return (
    <span aria-hidden className={clsx("block h-1.5 overflow-hidden rounded-full bg-line", className)}>
      <span className="block h-full rounded-full bg-sun" style={{ width: `${width}%` }} />
    </span>
  );
}

/** Dots showing how many of a challenge's stories are watched. */
export function Pips({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <span aria-hidden className={clsx("flex items-center gap-1", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx("size-2 rounded-full", i < done ? "bg-sun" : "bg-line")}
        />
      ))}
    </span>
  );
}

export function StarMarks({ stars, className }: { stars: number; className?: string }) {
  return (
    <span aria-hidden className={clsx("flex gap-0.5", className)}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={clsx("size-4", i <= stars ? "fill-sun text-sun-lip" : "fill-line text-line")}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}
