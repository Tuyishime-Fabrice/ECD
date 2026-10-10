import clsx from "clsx";
import { Check, Lock, Play, Star } from "lucide-react";

/** Green check in a picture's top-right corner: this story was watched. */
export function WatchedMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid size-9 place-items-center rounded-full border-[3px] border-paper bg-leaf shadow-e1", className)}
    >
      <Check className="size-5 text-on-accent" strokeWidth={4} />
    </span>
  );
}

/** Lock badge for challenges that still need stories watched. */
export function LockMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid size-9 place-items-center rounded-full border-[3px] border-paper bg-berry shadow-e1", className)}
    >
      <Lock className="size-4 text-on-accent" strokeWidth={3} />
    </span>
  );
}

/** Small orange play disc for the "up next" story. */
export function PlayDisc({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid size-12 place-items-center rounded-full border-[3px] border-paper bg-play shadow-e1", className)}
    >
      <Play className="ml-0.5 size-5 fill-on-accent text-on-accent" strokeWidth={2.5} />
    </span>
  );
}

/** Gold progress strip. A started story always shows a sliver; 0 shows an empty track. */
export function ProgressStrip({ percent, className }: { percent: number; className?: string }) {
  const width = percent <= 0 ? 0 : Math.max(6, Math.min(100, percent));
  return (
    <span aria-hidden className={clsx("block h-2 overflow-hidden rounded-full bg-line", className)}>
      <span className="block h-full rounded-full bg-sun" style={{ width: `${width}%` }} />
    </span>
  );
}

/** Dots showing how many of a challenge's stories are watched. */
export function Pips({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <span aria-hidden className={clsx("flex items-center gap-1.5", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx("size-2.5 rounded-full", i < done ? "bg-sun" : "bg-paper ring-2 ring-berry-lip")}
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
          className={clsx("size-5", i <= stars ? "fill-sun text-sun-lip" : "fill-paper text-line")}
          strokeWidth={2.5}
        />
      ))}
    </span>
  );
}
