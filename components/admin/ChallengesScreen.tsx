"use client";

import { ChevronRight, Gift, Info, Plus } from "lucide-react";
import Link from "next/link";
import { challengesOf, sortedSeasons, storiesBefore } from "@/lib/admin/ui-content";
import { quoteTitle } from "@/lib/admin/ui-summary";
import { useDraft } from "./AdminProvider";
import { Alert, Badge, ButtonLink, Card, EmptyState, ICON, PageHeader, PictureView } from "./ui";

export function ChallengesScreen() {
  const { draft, pictureSrc, issues } = useDraft();
  const seasons = sortedSeasons(draft.seasons);
  return (
    <>
      <PageHeader
        title="Challenges"
        description="Five picture questions that win a sticker. Children open a challenge after watching the stories before it."
      />
      <Alert tone="info" className="mb-6" title="Challenges sit after every 4 stories">
        A new challenge goes at the end of its collection, after the last stories. Moving stories up or down never moves a
        challenge.
      </Alert>
      <div className="space-y-6">
        {seasons.map((season) => {
          const list = challengesOf(season);
          const headingId = `challenges-${season.id}`;
          return (
            <Card key={season.id} aria-labelledby={headingId}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={headingId} className="font-display text-lg font-bold text-ink">
                      {season.title.en}
                    </h2>
                    {season.status === "published" ? <Badge tone="live">Live</Badge> : <Badge tone="soon">Coming soon</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {list.length} {list.length === 1 ? "challenge" : "challenges"}
                  </p>
                </div>
                <ButtonLink
                  href={`/admin/challenges/new?collection=${encodeURIComponent(season.id)}`}
                  size="sm"
                  icon={<Plus className="size-[18px]" {...ICON} />}
                  className="w-full sm:w-auto"
                >
                  Add a challenge
                </ButtonLink>
              </div>
              {list.length === 0 ? (
                <div className="p-4 sm:p-5">
                  <EmptyState icon={<Gift className="size-6" {...ICON} />} title="No challenges yet">
                    Add one after the first 4 stories of {quoteTitle(season.title.en)}.
                  </EmptyState>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  {list.map((challenge, i) => {
                    const problems = issues.filter(
                      (x) => x.target.kind === "challenge" && x.target.id === challenge.id,
                    ).length;
                    return (
                      <li key={challenge.id}>
                        <Link
                          href={`/admin/challenges/${encodeURIComponent(challenge.id)}`}
                          className="group flex items-center gap-4 rounded-xl border border-line bg-paper p-3 transition-colors hover:border-ink-3/40 hover:bg-paper-2"
                        >
                          <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-berry-soft ring-1 ring-berry/20">
                            <PictureView
                              src={challenge.sticker ? pictureSrc(challenge.sticker) : ""}
                              alt=""
                              fit="contain"
                              className="size-14 rounded-lg"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-extrabold uppercase tracking-[0.08em] text-berry-ink">
                              Challenge {i + 1}
                            </span>
                            <span className="block truncate font-semibold text-ink group-hover:underline">
                              {challenge.title.en || "Untitled challenge"}
                            </span>
                            <span className="mt-0.5 block text-sm text-ink-2">
                              After story {storiesBefore(season, challenge.id)} · {challenge.questions.length} questions
                            </span>
                            {problems > 0 && (
                              <Badge tone="danger" className="mt-1.5">
                                {problems === 1 ? "1 thing to fix" : `${problems} things to fix`}
                              </Badge>
                            )}
                          </span>
                          <ChevronRight className="size-5 shrink-0 text-ink-3" {...ICON} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-ink-2">
        <Info className="size-4 text-ink-3" {...ICON} />
        Children see each sticker in their sticker book once they finish the challenge.
      </p>
    </>
  );
}
