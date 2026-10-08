"use client";

import clsx from "clsx";
import { ArrowLeft, Clock, Info, MessageCircle, Plus, ShieldCheck } from "lucide-react";
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

export function ParentPage({ seasons, skills }: { seasons: SeasonCard[]; skills: SkillInfo[] }) {
  const t = useT();
  const [unlocked, setUnlocked] = useState(false);
  useDocumentTitle(t("parentArea"));

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
        <BackLink />
        <div className="flex flex-1 items-center justify-center">
          <ParentGate onPass={() => setUnlocked(true)} />
        </div>
        <p className="sr-only">{t("parentArea")}</p>
      </main>
    );
  }
  return <ParentArea seasons={seasons} skills={skills} />;
}

function BackLink() {
  const t = useT();
  return (
    <Link
      href="/"
      className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-white px-4 text-base font-semibold text-ink-900 shadow-soft"
    >
      <ArrowLeft className="size-5" strokeWidth={2.5} aria-hidden />
      {t("backToChild")}
    </Link>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-white p-5 shadow-soft">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-grape-700">
        {icon}
        {title}
      </h2>
      <div className="mt-3 text-base text-ink-900">{children}</div>
    </section>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-mist-100" aria-hidden>
      <span className="block h-full rounded-full bg-leaf-500" style={{ width: `${pct}%` }} />
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
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="font-semibold">{label}</p>
        {help && <p className="text-sm text-ink-600">{help}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-8 w-14 shrink-0 rounded-full transition-colors",
          checked ? "bg-grape-700" : "bg-mist-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-1 size-6 rounded-full bg-white shadow transition-[left]",
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
            "min-h-11 rounded-full border-2 px-4 text-base font-semibold",
            o.value === value ? "border-grape-700 bg-grape-700 text-white" : "border-mist-300 bg-white text-ink-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<SkillStatus, string> = {
  mastered: "bg-leaf-100 text-leaf-700",
  practicing: "bg-sun-100 text-ink-900",
  not_started: "bg-mist-100 text-ink-600",
};
const STATUS_KEY = { mastered: "mastered", practicing: "practicing", not_started: "notStarted" } as const;

function ParentArea({ seasons, skills }: { seasons: SeasonCard[]; skills: SkillInfo[] }) {
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
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <BackLink />
      <h1 className="font-display text-3xl font-bold text-ink-900">{t("parentArea")}</h1>

      <Card title={t("today")} icon={<Clock className="size-5" strokeWidth={2.5} aria-hidden />}>
        <p>
          {Number.isFinite(limit)
            ? t("usedOfLimit", { used: usedMin, limit: Math.round(limit / 60) })
            : t("usedNoLimit", { used: usedMin })}
        </p>
        {Number.isFinite(limit) && <Bar value={today.usedSec} max={limit + today.extraSec} />}
        {today.extraSec > 0 && <p className="mt-2 text-sm text-ink-600">{t("extraToday", { n: today.extraSec / 60 })}</p>}
        <button
          type="button"
          onClick={grantExtension}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-grape-700 px-4 font-semibold text-grape-700"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
          {t("addTenToday")}
        </button>
      </Card>

      <Card title={t("progress")}>
        <ul className="flex flex-col gap-3">
          {seasons
            .filter((s) => s.status === "published")
            .map((season) => {
              const episodes = season.items.filter((i) => i.type === "episode");
              const watched = episodes.filter((e) => learning.episodes[e.id]?.watched).length;
              return (
                <li key={season.id}>
                  <p className="flex justify-between gap-3">
                    <span className="font-semibold">{pick(season.title)}</span>
                    <span className="text-ink-600">{t("episodesWatched", { n: watched, m: episodes.length })}</span>
                  </p>
                  <Bar value={watched} max={episodes.length} />
                </li>
              );
            })}
        </ul>

        <h3 className="mt-5 font-display text-lg font-bold">{t("skills")}</h3>
        <p className="text-sm text-ink-600">{t("skillsHelp")}</p>
        <ul className="mt-2 divide-y divide-mist-100">
          {skills.map((skill) => {
            const status = statuses[skill.id] ?? "not_started";
            return (
              <li key={skill.id} className="flex items-center justify-between gap-3 py-2">
                <span>{pick(skill.label)}</span>
                <span className={clsx("shrink-0 rounded-full px-3 py-1 text-sm font-bold", STATUS_STYLE[status])}>
                  {t(STATUS_KEY[status])}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={t("settings")}>
        <p className="font-semibold">{t("dailyLimit")}</p>
        <p className="mb-2 text-sm text-ink-600">{t("dailyLimitHelp")}</p>
        <Segmented
          label={t("dailyLimit")}
          value={settings.dailyLimitMin}
          onChange={(v) => update({ dailyLimitMin: v })}
          options={DAILY_LIMITS.map((m) => ({ value: m, label: m === 0 ? t("off") : t("minutesN", { n: m }) }))}
        />
        <div className="mt-4 border-t border-mist-100 pt-2">
          <Switch label={t("sound")} help={t("soundHelp")} checked={settings.soundOn} onChange={(v) => update({ soundOn: v })} />
        </div>
        <div className="mt-2 border-t border-mist-100 pt-3">
          <p className="mb-2 font-semibold">{t("language")}</p>
          <Segmented<Lang>
            label={t("language")}
            value={settings.language}
            onChange={(v) => update({ language: v })}
            options={(["rw", "en"] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
          />
        </div>
      </Card>

      <Card title={t("demoMode")}>
        <p className="text-sm text-ink-600">{t("demoHelp")}</p>
        <Switch label={t("unlockAll")} checked={settings.unlockAll} onChange={(v) => update({ unlockAll: v })} />
        <Switch label={t("oneMinuteLimit")} checked={settings.oneMinuteLimit} onChange={(v) => update({ oneMinuteLimit: v })} />
        <Switch
          label={t("placeholderVoice")}
          help={t("placeholderVoiceHelp")}
          checked={settings.placeholderVoice}
          onChange={(v) => update({ placeholderVoice: v })}
        />
      </Card>

      <Card title={t("resetAll")}>
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
                className="min-h-11 rounded-full bg-ink-900 px-5 font-semibold text-white"
              >
                {t("resetYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-11 rounded-full border-2 border-mist-300 px-5 font-semibold"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-11 rounded-full border-2 border-ink-900 px-5 font-semibold"
          >
            {t("resetAll")}
          </button>
        )}
      </Card>

      <Card title={t("about", { brand: brand.name })} icon={<Info className="size-5" strokeWidth={2.5} aria-hidden />}>
        <p className="leading-relaxed">{t("aboutBody", { brand: brand.name })}</p>
      </Card>
      <Card title={t("privacy")} icon={<ShieldCheck className="size-5" strokeWidth={2.5} aria-hidden />}>
        <p className="leading-relaxed">{t("privacyBody")}</p>
      </Card>
      <Card title={t("contact")} icon={<MessageCircle className="size-5" strokeWidth={2.5} aria-hidden />}>
        <p>{t("contactBody")}</p>
        <a
          href={brand.contactLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-leaf-700 px-5 font-semibold text-white"
        >
          <MessageCircle className="size-5" strokeWidth={2.5} aria-hidden />
          {t("whatsapp")} · {brand.contactLabel}
        </a>
      </Card>
    </main>
  );
}
