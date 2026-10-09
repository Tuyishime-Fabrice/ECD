"use client";

import { ArrowRight, Clapperboard, Gift, History, Library, LifeBuoy, Plus, Settings, Star } from "lucide-react";
import Link from "next/link";
import { challengesOf, sortedSeasons, storiesOf } from "@/lib/admin/ui-content";
import { timeAgo } from "@/lib/admin/ui-time";
import { useDraft } from "./AdminProvider";
import { LiveChip } from "./Shell";
import { ButtonLink, Card, CardBody, CardHeader, ICON, PageHeader } from "./ui";

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

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ href, label, value, note, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-line bg-paper p-5 shadow-e1 transition-colors hover:border-ink-3/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-ink-2">{label}</p>
              <span className="grid size-9 place-items-center rounded-xl bg-listen/12 text-listen-ink">
                <Icon className="size-5" {...ICON} />
              </span>
            </div>
            <p className="mt-2 font-display text-4xl font-bold leading-none tabular-nums text-ink">{value}</p>
            <p className="mt-2 text-sm text-ink-2">{note}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Shortcuts" />
          <CardBody>
            <ul className="grid gap-2 sm:grid-cols-2">
              {shortcuts.map(({ href, label, note, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex min-h-16 items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-ink-3/40 hover:bg-paper-2"
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
