"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { LocalizedText } from "@/content/types";
import { useHydrated, useT } from "@/lib/store";
import { grantExtension, useTimeUp } from "@/lib/screen-time";
import { HomeActivityCard } from "./EndScreen";
import { Backdrop } from "./kid/Scene";
import { ParentGateDialog } from "./ParentGate";

/** "Time to play! Come back tomorrow." — with a way for parents to add 10 minutes. */
export function TimesUp({ homeActivity, onExtended }: { homeActivity?: LocalizedText; onExtended?: () => void }) {
  const t = useT();
  const [gateOpen, setGateOpen] = useState(false);

  return (
    <section className="mx-auto flex w-full max-w-xl animate-fade-in flex-col items-center gap-4 px-4 py-2 text-center">
      {/* Izuba is in the picture: waving over the children by day, asleep by night. */}
      <picture className="block w-full">
        <source media="(prefers-color-scheme: dark)" srcSet="/images/scenes/play-outside-night.svg" />
        <img
          src="/images/scenes/play-outside-day.svg"
          alt=""
          width={400}
          height={260}
          className="w-full rounded-card shadow-e2 short:mx-auto short:w-2/3"
        />
      </picture>
      <h1 className="font-display text-[40px] font-extrabold leading-tight text-ink">{t("timesUpTitle")}</h1>
      <p className="-mt-3 font-display text-2xl font-bold text-ink-2">{t("timesUpBody")}</p>

      {homeActivity && (
        <div className="w-full">
          <HomeActivityCard text={homeActivity} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setGateOpen(true)}
        className="tap mt-2 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-line bg-paper px-4 text-base font-semibold text-ink-2"
      >
        <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        {t("addTenMinutes")}
      </button>

      {gateOpen && (
        <ParentGateDialog
          onClose={() => setGateOpen(false)}
          onPass={() => {
            grantExtension();
            setGateOpen(false);
            onExtended?.();
          }}
        />
      )}
    </section>
  );
}

/**
 * Shows Time's Up instead of the page.
 * - "live": switches as soon as the limit is reached (Home, season, stickers).
 * - "start": only blocks if the limit was already reached when the page
 *   opened, so a video or challenge in progress can finish.
 */
export function TimeGate({ mode, children }: { mode: "live" | "start"; children: ReactNode }) {
  const hydrated = useHydrated();
  const up = useTimeUp();
  // Remember (once saved data is readable) whether time was already up on arrival.
  const [upWhenOpened, setUpWhenOpened] = useState<boolean | null>(null);
  if (mode === "start" && hydrated && upWhenOpened === null) setUpWhenOpened(up);

  const blocked = mode === "live" ? up : upWhenOpened === true && up;
  // Once a parent adds time, this page counts as opened in time: its video or challenge may finish.
  if (!blocked) return <>{children}</>;
  return (
    <div className="relative min-h-[calc(100dvh-5rem)] pb-44">
      <Backdrop scene="home-hills" />
      <TimesUp onExtended={() => setUpWhenOpened(false)} />
    </div>
  );
}

