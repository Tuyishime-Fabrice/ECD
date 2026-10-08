import clsx from "clsx";
import { Check, Star } from "lucide-react";

export function NumberBadge({
  n,
  borderClass,
  compact = false,
  className,
}: {
  n: number;
  borderClass: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "grid place-items-center rounded-full bg-white font-display font-extrabold leading-none text-ink-900",
        compact ? "size-9 border-[3px] text-xl" : "size-12 border-4 text-[26px]",
        borderClass,
        className,
      )}
    >
      {n}
    </span>
  );
}

export function WatchedBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "grid place-items-center rounded-full border-[3px] border-white bg-leaf-500",
        compact ? "size-8" : "size-10",
        className,
      )}
    >
      <Check className={compact ? "size-5 text-white" : "size-6 text-white"} strokeWidth={4} />
    </span>
  );
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <span aria-hidden className={clsx("block h-2.5 overflow-hidden rounded-full bg-white/80", className)}>
      <span className="block h-full rounded-full bg-leaf-500" style={{ width: `${Math.max(6, percent)}%` }} />
    </span>
  );
}

export function StarRow({ stars, size = "size-6", className }: { stars: number; size?: string; className?: string }) {
  return (
    <span aria-hidden className={clsx("flex gap-0.5", className)}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={clsx(size, i <= stars ? "fill-sun-400 text-ink-900" : "fill-white/70 text-ink-900/40")}
          strokeWidth={2.5}
        />
      ))}
    </span>
  );
}
