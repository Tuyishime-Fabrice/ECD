import clsx from "clsx";

/**
 * A piece of the Storybook World that follows the phone's light/dark setting:
 * public/images/world/<name>-day.svg by day, <name>-night.svg by night.
 */
export function Scene({
  name,
  className,
  imgClassName,
  eager = false,
}: {
  name: "home-hills" | "map" | "map-wide" | "quiz-hill" | "watch";
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  return (
    <picture className={clsx("pointer-events-none select-none", className)}>
      <source media="(prefers-color-scheme: dark)" srcSet={`/images/world/${name}-night.svg`} />
      <img
        src={`/images/world/${name}-day.svg`}
        alt=""
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        className={imgClassName}
      />
    </picture>
  );
}

/** The sky behind a scene: morning gradient by day, night sky by night. */
export function Sky({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("bg-gradient-to-b from-sky-top to-sky-bottom", className)} />;
}
