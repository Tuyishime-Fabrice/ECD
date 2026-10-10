"use client";

/**
 * Every story, grouped by collection in the order children watch them. Challenges
 * appear between the stories where they sit, so the order is easy to follow.
 */
import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronRight, Clapperboard, Gift, MessageCircleQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Episode, Season } from "@/content/schema";
import { deleteItem, moveStory, sortedSeasons, storiesBefore, storiesOf } from "@/lib/admin/ui-content";
import { quoteTitle } from "@/lib/admin/ui-summary";
import { formatClock } from "@/lib/admin/ui-time";
import { useDraft } from "./AdminProvider";
import { COLORS } from "./editing";
import { Badge, ButtonLink, Card, ConfirmDialog, EmptyState, ICON, IconButton, PageHeader, PictureView } from "./ui";

export function StoriesScreen() {
  const { draft } = useDraft();
  const seasons = sortedSeasons(draft.seasons);
  const total = seasons.reduce((n, s) => n + storiesOf(s).length, 0);
  return (
    <>
      <PageHeader
        title="Stories"
        description={`${total} ${total === 1 ? "story" : "stories"} in ${seasons.length} ${seasons.length === 1 ? "collection" : "collections"}, in the order children watch them.`}
        actions={
          <ButtonLink href="/admin/stories/new" variant="primary" icon={<Plus className="size-5" {...ICON} />}>
            Add a story
          </ButtonLink>
        }
      />
      <div className="space-y-6">
        {seasons.map((season) => (
          <CollectionStories key={season.id} season={season} />
        ))}
      </div>
    </>
  );
}

function CollectionStories({ season }: { season: Season }) {
  const { pictureSrc } = useDraft();
  const stories = storiesOf(season);
  const challenges = season.items.filter((i) => i.type === "challenge").length;
  const headingId = `collection-${season.id}`;
  let storyNumber = 0;
  let challengeNumber = 0;
  return (
    <Card aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-4 py-4 sm:px-5">
        <div className={clsx("relative size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-line", COLORS[season.color].soft)}>
          <PictureView src={season.posterImage ? pictureSrc(season.posterImage) : ""} alt="" className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={headingId} className="font-display text-lg font-bold leading-tight text-ink">
              {season.title.en}
            </h2>
            {season.status === "published" ? <Badge tone="live">Live</Badge> : <Badge tone="soon">Coming soon</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-2">
            {season.title.rw && <span lang="rw">{season.title.rw} · </span>}
            {stories.length} {stories.length === 1 ? "story" : "stories"}
            {challenges > 0 && ` · ${challenges} ${challenges === 1 ? "challenge" : "challenges"}`}
          </p>
        </div>
        <ButtonLink
          href={`/admin/stories/new?collection=${encodeURIComponent(season.id)}`}
          size="sm"
          icon={<Plus className="size-[18px]" {...ICON} />}
          className="w-full sm:w-auto"
        >
          Add story to this collection
        </ButtonLink>
      </div>
      {season.items.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState icon={<Clapperboard className="size-6" {...ICON} />} title="No stories yet">
            Add the first story to {quoteTitle(season.title.en)}.
          </EmptyState>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {season.items.map((item) => {
            if (item.type === "challenge") {
              challengeNumber++;
              return (
                <li key={item.challenge.id}>
                  <Link
                    href={`/admin/challenges/${encodeURIComponent(item.challenge.id)}`}
                    className="flex min-h-14 items-center gap-3 bg-berry-soft/50 px-4 py-2.5 hover:bg-berry-soft sm:px-5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-berry-soft text-berry-ink ring-1 ring-berry/30">
                      <Gift className="size-5" {...ICON} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-berry-ink">
                        {item.challenge.title.en || `Challenge ${challengeNumber}`}
                      </span>
                      <span className="block text-sm text-ink-2">
                        Challenge · after story {storiesBefore(season, item.challenge.id)} ·{" "}
                        {item.challenge.questions.length} questions
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-3" {...ICON} />
                  </Link>
                </li>
              );
            }
            storyNumber++;
            return (
              <StoryRow
                key={item.episode.id}
                story={item.episode}
                number={storyNumber}
                first={storyNumber === 1}
                last={storyNumber === stories.length}
              />
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function StoryRow({ story, number, first, last }: { story: Episode; number: number; first: boolean; last: boolean }) {
  const { edit, pictureSrc } = useDraft();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = story.title.en || "Untitled story";
  const href = `/admin/stories/${encodeURIComponent(story.id)}`;
  const move = (direction: -1 | 1) =>
    edit((s) => ({ ...s, seasons: moveStory(s.seasons, story.id, direction) }), {
      key: "move-stories",
      text: "Changed the order of stories",
    });
  return (
    <li className="group flex flex-col gap-2 px-4 py-3 hover:bg-paper-2/60 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <span className="hidden w-6 shrink-0 text-center font-display text-base font-bold tabular-nums text-ink-3 sm:block">
        {number}
      </span>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg sm:gap-4">
        <PictureView
          src={story.thumbnail ? pictureSrc(story.thumbnail) : ""}
          alt=""
          className="aspect-video w-24 shrink-0 rounded-lg ring-1 ring-line sm:w-28"
        />
        <span className="min-w-0">
          <span className="block text-xs font-extrabold uppercase tracking-[0.08em] text-ink-3 sm:hidden">Story {number}</span>
          <span className="line-clamp-2 font-semibold leading-snug text-ink group-hover:underline sm:line-clamp-1">{title}</span>
          {story.title.rw && (
            <span lang="rw" className="mt-0.5 line-clamp-1 text-sm text-ink-2">
              {story.title.rw}
            </span>
          )}
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {story.youtubeId === "DEMO" ? (
              <Badge tone="warn">Sample video</Badge>
            ) : story.youtubeId ? (
              <Badge tone="neutral">YouTube · {formatClock(story.durationSec)}</Badge>
            ) : (
              <Badge tone="danger">No video</Badge>
            )}
            {story.pausePoints?.length ? (
              <Badge tone="info" icon={<MessageCircleQuestion className="size-3.5" {...ICON} />}>
                Question
              </Badge>
            ) : null}
          </span>
        </span>
      </Link>
      <div
        className="-mr-2 flex shrink-0 items-center justify-end gap-0.5 sm:mr-0"
        role="group"
        aria-label={`Actions for ${title}`}
      >
        <IconButton
          label={`Move ${title} up`}
          icon={<ArrowUp className="size-6" {...ICON} strokeWidth={2.5} />}
          disabled={first}
          onClick={() => move(-1)}
        />
        <IconButton
          label={`Move ${title} down`}
          icon={<ArrowDown className="size-6" {...ICON} strokeWidth={2.5} />}
          disabled={last}
          onClick={() => move(1)}
        />
        <Link
          href={href}
          className="ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-display text-[15px] font-semibold text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
        >
          <Pencil className="size-[18px]" {...ICON} />
          Edit<span className="sr-only"> {title}</span>
        </Link>
        <IconButton
          label={`Delete ${title}`}
          icon={<Trash2 className="size-5" {...ICON} />}
          variant="quiet-danger"
          onClick={() => setConfirmDelete(true)}
        />
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          edit((s) => ({ ...s, seasons: deleteItem(s.seasons, story.id) }), {
            key: `delete:${story.id}`,
            text: `Deleted story ${quoteTitle(title)}`,
          });
        }}
        title={`Delete ${quoteTitle(title)}?`}
        confirmLabel="Delete story"
      >
        Children won&apos;t see this story once you save. You can bring it back from History after saving.
      </ConfirmDialog>
    </li>
  );
}
