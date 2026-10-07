"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { LocalizedText } from "@/content/types";
import { getStore, useHydrated, useT } from "@/lib/store";
import { useTimeUp } from "@/lib/screen-time";
import { EXTENSION_SEC, kigaliDate } from "@/lib/timer";
import { HomeActivityCard } from "./EndScreen";
import { Mascot } from "./Mascot";
import { ParentGateDialog } from "./ParentGate";

/** "Time to play! Come back tomorrow." — with a way for parents to add 10 minutes. */
export function TimesUp({ homeActivity, onExtended }: { homeActivity?: LocalizedText; onExtended?: () => void }) {
  const t = useT();
  const [gateOpen, setGateOpen] = useState(false);

  return (
    <section className="mx-auto flex w-full max-w-xl animate-fade-in flex-col items-center gap-4 px-4 py-2 text-center">
      <div className="relative w-full">
        <img
          src="/images/scenes/play-outside.svg"
          alt=""
          width={400}
          height={260}
          className="w-full rounded-card short:mx-auto short:w-2/3"
        />
        <Mascot pose="wave" className="absolute -top-4 right-2 w-24 sm:w-28" />
      </div>
      <h1 className="font-display text-[40px] font-extrabold leading-tight text-ink-900">{t("timesUpTitle")}</h1>
      <p className="-mt-3 font-display text-2xl font-bold text-ink-600">{t("timesUpBody")}</p>

      {homeActivity && (
        <div className="w-full">
          <HomeActivityCard text={homeActivity} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setGateOpen(true)}
        className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-mist-300 px-4 text-base font-semibold text-ink-600"
      >
        <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        {t("addTenMinutes")}
      </button>

      {gateOpen && (
        <ParentGateDialog
          onClose={() => setGateOpen(false)}
          onPass={() => {
            getStore().addExtraTime(kigaliDate(), EXTENSION_SEC);
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

  // Don't start a video or challenge (or download YouTube's script) before we know.
  if (mode === "start" && upWhenOpened === null) return <div className="min-h-[60dvh]" aria-busy="true" />;

  const blocked = mode === "live" ? up : upWhenOpened === true && up;
  return blocked ? <TimesUp /> : <>{children}</>;
}

