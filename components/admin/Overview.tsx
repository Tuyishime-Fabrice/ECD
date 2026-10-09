"use client";

import { ArrowRight, Clapperboard, Gift, History, Library, LifeBuoy, Plus, Settings, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { challengesOf, sortedSeasons, storiesOf } from "@/lib/admin/ui-content";
import { friendlyDate, timeAgo } from "@/lib/admin/ui-time";
import { useDraft } from "./AdminProvider";
import { api, type HistoryEntry } from "./api";
import { LiveChip } from "./Shell";
import { ButtonLink, Card, CardBody, CardHeader, ICON, PageHeader } from "./ui";

const RECENT = 4;

/** The latest saves, so the overview shows what changed lately. */
function RecentSaves() {
  const { deployed } = useDraft();
  const [commits, setCommits] = useState<HistoryEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.history().then((res) => {
      if (!cancelled) setCommits(res.ok ? res.data.commits.slice(0, RECENT) : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <Card>
      <CardHeader
        title="Recent saves"
        actions={
          <Link href="/admin/history" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-listen-ink hover:underline">
            See all
          </Link>
        }
      />
      <CardBody className="pt-1">
        {commits === null ? (
          <ul className="space-y-3" aria-hidden>
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="h-11 animate-pulse rounded-lg bg-paper-2" />
            ))}
          </ul>
        ) : commits.length === 0 ? (
          <p className="text-[15px] text-ink-2">Saves you make show up here.</p>
        ) : (
          <ol className="divide-y divide-line">
            {commits.map((c) => (
              <li key={c.sha} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <History className="mt-0.5 size-[18px] shrink-0 text-ink-3" {...ICON} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.summary || "Saved changes"}</p>
                  <p className="text-sm text-ink-2">
                    <time dateTime={c.date} title={friendlyDate(c.date)}>
                      {timeAgo(c.date)}
                    </time>
                    {c.sha === deployed && <span className="text-leaf-ink"> · live now</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

export function Overview() {
  const { draft, live, lastSavedAt, dirty } = useDraft();
  const seasons = sortedSeasons(draft.seasons);
  const liveSeasons = seasons.filter((s) => s.status === "published");
  const stories = seasons.flatMap(storiesOf);
  const liveStories = liveSeasons.flatMap(storiesOf);
  const challenges = seasons.flatMap(challengesOf);

  const stats = [
    {
      href: "/admin/collections",
      label: "Collections",
      value: seasons.length,
      note: `${liveSeasons.length} live, ${seasons.length - liveSeasons.length} coming soon`,
      icon: Library,
    },
    {
      href: "/admin/stories",
      label: "Stories",
      value: stories.length,
      note: `${liveStories.length} children can watch now`,
      icon: Clapperboard,
    },
    {
      href: "/admin/challenges",
      label: "Challenges",
      value: challenges.length,
      note: "One after every 4 stories",
      icon: Gift,
    },
  ];

  const shortcuts = [
    { href: "/admin/stories", label: "Stories", note: "Edit, reorder or delete stories", icon: Clapperboard },
    { href: "/admin/challenges", label: "Challenges", note: "Questions and sticker pictures", icon: Gift },
    { href: "/admin/collections", label: "Collections", note: "Titles, colors, posters, Live or Coming soon", icon: Library },
    { href: "/admin/settings", label: "Settings", note: "Featured stories and the WhatsApp number", icon: Settings },
    { href: "/admin/history", label: "History", note: "Every save, and Undo", icon: History },
    { href: "/admin/help", label: "Help", note: "How the dashboard works", icon: LifeBuoy },
  ];

  const status =
    live === "going" || live === "slow"
      ? { title: "Your last save is going live", body: "Children will see it in about 2 minutes. You can keep working." }
      : live === "live"
        ? { title: "Everything you saved is live", body: lastSavedAt ? `Last saved ${timeAgo(new Date(lastSavedAt).toISOString())}.` : "Children see the latest saved stories." }
        : { title: "Live status", body: "The live status shows here once the app is online." };

  return (
    <>
      <PageHeader
        title="Overview"
        description="Manage the stories children watch, the challenges between them, and the collections they belong to."
        actions={
          <ButtonLink href="/admin/stories/new" variant="primary" size="lg" icon={<Plus className="size-5" {...ICON} />}>
            Add a story
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map(({ href, label, value, note, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-line bg-paper p-4 shadow-e1 transition-colors hover:border-ink-3/40 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-ink-2">{label}</p>
              <span className="grid size-9 place-items-center rounded-xl bg-listen/12 text-listen-ink">
                <Icon className="size-5" {...ICON} />
              </span>
            </div>
            <p className="mt-1 font-display text-[32px] font-bold leading-none tabular-nums text-ink sm:mt-2 sm:text-4xl">{value}</p>
            <p className="mt-2 text-sm text-ink-2">{note}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader title="Shortcuts" />
          <CardBody>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {shortcuts.map(({ href, label, note, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex h-full min-h-16 items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-ink-3/40 hover:bg-paper-2"
                  >
                    <Icon className="size-5 shrink-0 text-ink-3 group-hover:text-listen-ink" {...ICON} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{label}</span>
                      <span className="block text-sm text-ink-2">{note}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" {...ICON} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <RecentSaves />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={status.title}
              description={dirty ? "You also have unsaved changes. Press Save when you're ready." : status.body}
              actions={<LiveChip announce={false} />}
            />
            <CardBody className="pt-3">
              <Link href="/admin/history" className="text-[15px] font-semibold text-listen-ink hover:underline">
                See all saves
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How it works" />
            <CardBody>
              <ol className="space-y-4">
                {[
                  ["Make your changes", "Add or edit stories, challenges and collections. Nothing changes for children yet."],
                  ["Press Save", "The dashboard checks everything first, so a mistake can't break the app."],
                  ["Live in about 2 minutes", "Children see the change the next time they open the app. Every save can be undone from History."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-listen-lip font-display text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="font-bold text-ink">{title}</p>
                      <p className="text-[15px] text-ink-2">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<Star className="size-5" {...ICON} />}
              title="Featured on Home"
              description={`${draft.site.featured.length} of 6 stories in the big slider.`}
            />
            <CardBody className="pt-3">
              <Link href="/admin/settings#f-featured" className="text-[15px] font-semibold text-listen-ink hover:underline">
                Choose featured stories
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
