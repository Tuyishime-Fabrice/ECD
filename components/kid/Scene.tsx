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

/**
 * The full-screen world behind a kid page: sky from under the top bar down,
 * with a scene along the bottom edge. Put it first inside a `relative` page wrapper.
 */
export function Backdrop({ scene, sceneClassName }: { scene: SceneName; sceneClassName?: string }) {
  return (
    <div aria-hidden className="absolute inset-x-0 -top-24 bottom-0 -z-10 overflow-hidden">
      <Sky className="absolute inset-0" />
      <Scene
        name={scene}
        className="absolute inset-x-0 bottom-0 block"
        imgClassName={clsx("block w-full object-cover object-top", sceneClassName ?? "h-40 md:h-56")}
      />
    </div>
  );
}
