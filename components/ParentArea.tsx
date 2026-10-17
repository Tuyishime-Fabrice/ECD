"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  ChartNoAxesColumn,
  Clock,
  Info,
  MessageCircle,
  Plus,
  Presentation,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SeasonCard, SkillInfo } from "@/content/types";
import { brand } from "@/lib/brand";
import { LANGUAGE_NAMES } from "@/lib/i18n";
import { DAILY_LIMITS, type Lang, type Settings } from "@/lib/progress";
import { skillStatuses, type SkillStatus } from "@/lib/skills";
import { getStore, useDocumentTitle, useLearningState, usePick, useProgress, useSettings, useT } from "@/lib/store";
import { grantExtension } from "@/lib/screen-time";
import { dailyLimitSec, kigaliDate, usageToday } from "@/lib/timer";
import { ParentGate } from "./ParentGate";

type Contact = { link: string; label: string } | null;

/** Grown-up buttons: solid teal for the main action, outlined for the rest. */
const primaryButton =
  "tap inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-strong px-5 text-base font-bold text-on-accent shadow-e1";
const secondaryButton =
  "tap inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 text-base font-bold text-brand";

export function ParentPage({ seasons, skills, contact }: { seasons: SeasonCard[]; skills: SkillInfo[]; contact: Contact }) {
  const t = useT();
  const [unlocked, setUnlocked] = useState(false);
  useDocumentTitle(t("parentArea"));

  if (!unlocked) {
    return (
      <div className="flex min-h-dvh flex-col bg-ground">
        <ParentHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm rounded-hero border border-line bg-paper px-6 py-8 shadow-e2">
            <ParentGate onPass={() => setUnlocked(true)} />
          </div>
          <p className="sr-only">{t("parentArea")}</p>
        </main>
      </div>
    );
  }
  return <ParentArea seasons={seasons} skills={skills} contact={contact} />;
}

/** The brand on the left, the way back to the child's screens on the right. */
function ParentHeader() {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8">
        <img src="/brand/wordmark.svg" alt={brand.name} width={126} height={36} className="h-9 w-auto" />
        <Link href="/" className={clsx(secondaryButton, "ml-auto min-h-12 px-4 text-sm sm:text-base")}>
          <ArrowLeft className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
          {t("backToChild")}
        </Link>
      </div>
    </header>
  );
}

function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-card border border-line bg-paper p-5 shadow-e1 md:p-6", className)}>
      <h2 className="flex items-center gap-3 font-display text-lg font-black leading-tight text-ink">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>
        {title}
      </h2>
      <div className="mt-4 text-base text-ink">{children}</div>
    </section>
  );
}

const icon = (Icon: typeof Clock) => <Icon className="size-5" strokeWidth={2.5} aria-hidden />;

/** Mustard progress bar on a hairline track. */
function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
      <span className="block h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
    </span>
  );
}

function Switch({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        {help && <p className="mt-0.5 text-sm leading-snug text-ink-2">{help}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-8 w-14 shrink-0 rounded-full transition-colors before:absolute before:-inset-2 before:content-['']",
          checked ? "bg-brand-strong" : "bg-line",
        )}
      >
        <span
          className={clsx(
            "absolute top-1 size-6 rounded-full bg-white shadow-e1 transition-[left]",
            checked ? "left-7" : "left-1",
          )}
        />
        <span className="sr-only">{checked ? t("on") : t("offState")}</span>
      </button>
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "min-h-11 rounded-full border px-4 text-base font-bold transition-colors",
            o.value === value ? "border-brand-strong bg-brand-strong text-on-accent" : "border-line bg-paper text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<SkillStatus, string> = {
  mastered: "bg-leaf-soft text-leaf-ink",
  practicing: "bg-sun-soft text-ink",
  not_started: "bg-paper-2 text-ink-2",
};
const STATUS_KEY = { mastered: "mastered", practicing: "practicing", not_started: "notStarted" } as const;

function ParentArea({ seasons, skills, contact }: { seasons: SeasonCard[]; skills: SkillInfo[]; contact: Contact }) {
  const t = useT();
  const pick = usePick();
  const settings = useSettings();
  const learning = useLearningState();
  const usage = useProgress((s) => s.usage);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const update = (patch: Partial<Settings>) => getStore().updateSettings(patch);
  const statuses = skillStatuses(
    skills.map((s) => s.id),
    learning.challenges,
  );
  const today = usageToday(usage, kigaliDate());
  const limit = dailyLimitSec(settings);
  const usedMin = Math.floor(today.usedSec / 60);

  return (
    <div className="min-h-dvh bg-ground">
      <ParentHeader />
      <main className="mx-auto max-w-5xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6 md:px-8 md:pt-10">
        <p className="eyebrow text-brand">{t("gateTitle")}</p>
        <h1 className="mt-1 font-display text-[32px] font-black leading-tight text-ink md:text-[40px]">{t("parentArea")}</h1>

        <div className="mt-6 grid items-start gap-4 md:grid-cols-2 md:gap-6">
          <div className="flex flex-col gap-4 md:gap-6">
            <Card title={t("today")} icon={icon(Clock)}>
              <p className="font-display text-2xl font-black leading-tight text-ink">
                {Number.isFinite(limit)
                  ? t("usedOfLimit", { used: usedMin, limit: Math.round(limit / 60) })
                  : t("usedNoLimit", { used: usedMin })}
              </p>
              {Number.isFinite(limit) && <Bar value={today.usedSec} max={limit + today.extraSec} />}
              {today.extraSec > 0 && (
                <p className="mt-2 text-sm text-ink-2">{t("extraToday", { n: Math.round(today.extraSec / 60) })}</p>
              )}
              <button type="button" onClick={grantExtension} className={clsx(primaryButton, "mt-4")}>
                <Plus className="size-5" strokeWidth={2.5} aria-hidden />
                {t("addTenToday")}
              </button>
            </Card>

            <Card title={t("progress")} icon={icon(ChartNoAxesColumn)}>
              <ul className="flex flex-col gap-4">
                {seasons
                  .filter((s) => s.status === "published")
                  .map((season) => {
                    const episodes = season.items.filter((i) => i.type === "episode");
                    const watched = episodes.filter((e) => learning.episodes[e.id]?.watched).length;
                    return (
                      <li key={season.id}>
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-bold">{pick(season.title)}</span>
                          <span className="text-sm text-ink-2">{t("episodesWatched", { n: watched, m: episodes.length })}</span>
                        </p>
                        <Bar value={watched} max={episodes.length} />
                      </li>
                    );
                  })}
              </ul>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="font-display text-base font-black text-ink">{t("skills")}</h3>
                <p className="mt-0.5 text-sm text-ink-2">{t("skillsHelp")}</p>
                <ul className="mt-2 divide-y divide-line">
                  {skills.map((skill) => {
                    const status = statuses[skill.id] ?? "not_started";
                    return (
                      <li key={skill.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0 leading-snug">{pick(skill.label)}</span>
                        <span className={clsx("shrink-0 rounded-full px-3 py-1 text-sm font-bold", STATUS_STYLE[status])}>
                          {t(STATUS_KEY[status])}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4 md:gap-6">
            <Card title={t("settings")} icon={icon(SlidersHorizontal)}>
              <p className="font-bold">{t("dailyLimit")}</p>
              <p className="mb-3 mt-0.5 text-sm leading-snug text-ink-2">{t("dailyLimitHelp")}</p>
              <Segmented
                label={t("dailyLimit")}
                value={settings.dailyLimitMin}
                onChange={(v) => update({ dailyLimitMin: v })}
                options={DAILY_LIMITS.map((m) => ({ value: m, label: m === 0 ? t("off") : t("minutesN", { n: m }) }))}
              />
              <div className="mt-5 border-t border-line pt-2">
                <Switch label={t("sound")} help={t("soundHelp")} checked={settings.soundOn} onChange={(v) => update({ soundOn: v })} />
              </div>
              <div className="mt-2 border-t border-line pt-4">
                <p className="mb-3 font-bold">{t("language")}</p>
                <Segmented<Lang>
                  label={t("language")}
                  value={settings.language}
                  onChange={(v) => update({ language: v })}
                  options={(["rw", "en"] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
                />
              </div>
            </Card>

            <Card title={t("demoMode")} icon={icon(Presentation)}>
              <p className="text-sm text-ink-2">{t("demoHelp")}</p>
              <div className="mt-1 divide-y divide-line">
                <Switch label={t("unlockAll")} checked={settings.unlockAll} onChange={(v) => update({ unlockAll: v })} />
                <Switch
                  label={t("oneMinuteLimit")}
                  checked={settings.oneMinuteLimit}
                  onChange={(v) => update({ oneMinuteLimit: v })}
                />
                <Switch
                  label={t("placeholderVoice")}
                  help={t("placeholderVoiceHelp")}
                  checked={settings.placeholderVoice}
                  onChange={(v) => update({ placeholderVoice: v })}
                />
              </div>
            </Card>

            <Card title={t("resetAll")} icon={icon(RotateCcw)}>
              {resetDone ? (
                <p role="status">{t("resetDone")}</p>
              ) : confirmReset ? (
                <div className="flex flex-col gap-3">
                  <p>{t("resetConfirm")}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        getStore().resetProgress();
                        setConfirmReset(false);
                        setResetDone(true);
                      }}
                      className="tap inline-flex min-h-12 items-center rounded-full bg-ink px-5 font-bold text-paper"
                    >
                      {t("resetYes")}
                    </button>
                    <button type="button" onClick={() => setConfirmReset(false)} className={secondaryButton}>
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className={secondaryButton}>
                  {t("resetAll")}
                </button>
              )}
            </Card>
          </div>
        </div>

        <div className="mt-4 grid items-start gap-4 md:mt-6 md:grid-cols-2 md:gap-6">
          <Card title={t("about", { brand: brand.name })} icon={icon(Info)}>
            <p className="leading-relaxed text-ink-2">{t("aboutBody", { brand: brand.name })}</p>
          </Card>
          <div className="flex flex-col gap-4 md:gap-6">
            <Card title={t("privacy")} icon={icon(ShieldCheck)}>
              <p className="leading-relaxed text-ink-2">{t("privacyBody")}</p>
            </Card>
            {/* Hidden until a WhatsApp number is set in the admin dashboard (content/site.json). */}
            {contact && (
              <Card title={t("contact")} icon={icon(MessageCircle)}>
                <p className="text-ink-2">{t("contactBody")}</p>
                <a
                  href={contact.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-leaf-ink px-5 font-bold text-paper"
                >
                  <MessageCircle className="size-5" strokeWidth={2.5} aria-hidden />
                  {t("whatsapp")}
                  {` · ${contact.label}`}
                </a>
              </Card>
            )}
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center gap-2 text-center">
          <img src="/brand/lockup.svg" alt={brand.name} width={176} height={60} className="h-14 w-auto" />
          <p className="text-sm text-ink-3">© {brand.name}</p>
        </footer>
      </main>
    </div>
  );
}
