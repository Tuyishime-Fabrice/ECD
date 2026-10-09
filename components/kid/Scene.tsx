import clsx from "clsx";

/**
 * A piece of the Storybook World that follows the phone's light/dark setting:
 * public/images/world/<name>-day.svg by day, <name>-night.svg by night.
 */
type SceneName = "home-hills" | "map" | "map-wide" | "quiz-hill" | "watch";

export function Scene({
  name,
  wide,
  className,
  imgClassName,
  eager = false,
}: {
  name: SceneName;
  /** A wider version of the scene for screens 640px and up. */
  wide?: SceneName;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  return (
    <picture className={clsx("pointer-events-none select-none", className)}>
      {wide && (
        <source
          media="(min-width: 640px) and (prefers-color-scheme: dark)"
          srcSet={`/images/world/${wide}-night.svg`}
        />
      )}
      {wide && <source media="(min-width: 640px)" srcSet={`/images/world/${wide}-day.svg`} />}
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
