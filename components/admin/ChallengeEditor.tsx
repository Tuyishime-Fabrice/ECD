"use client";

/**
 * Adding or changing a challenge: a title, a sticker picture and exactly 5 picture
 * questions. Like stories, a new challenge stays on this screen until "Add challenge".
 */
import clsx from "clsx";
import { ChevronDown, CircleAlert, Gift, Info, ListChecks, Plus, Trash2, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Challenge } from "@/content/schema";
import {
  addChallenge,
  blankChallenge,
  deleteItem,
  findChallenge,
  newChallengeId,
  sortedSeasons,
  storiesBefore,
  storiesOf,
  updateChallenge,
} from "@/lib/admin/ui-content";
import { checkDraft, locate, type Located } from "@/lib/admin/ui-issues";
import { quoteTitle } from "@/lib/admin/ui-summary";
import { useDraft } from "./AdminProvider";
import { PictureField, ProblemSummary, useFocusFromHash, useProblems } from "./editing";
import { QuestionEditor, type QuestionChange } from "./QuestionEditor";
import {
  Alert,
  Bilingual,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Eyebrow,
  Field,
  ICON,
  PageHeader,
  PictureView,
  Select,
} from "./ui";

export function ChallengeEditor({ id, collection }: { id?: string; collection?: string }) {
  const { draft, edit, reservedIds, toast, pictureSrc } = useDraft();
  const router = useRouter();
  useFocusFromHash();

  const seasons = sortedSeasons(draft.seasons);
  const isNew = !id;
  const found = id ? findChallenge(draft.seasons, id) : null;
  const firstSeason =
    (collection && seasons.find((s) => s.id === collection)?.id) ??
    seasons.find((s) => s.status === "published")?.id ??
    seasons[0]?.id ??
    "";
  const [newSeasonId, setNewSeasonId] = useState(firstSeason);
  const [local, setLocal] = useState<Challenge>(() => blankChallenge(draft.seasons, firstSeason, reservedIds));
  const [attempt, setAttempt] = useState<{ id: string } | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const challenge = isNew ? local : found?.value;
  const challengeId = isNew ? (attempt?.id ?? local.id) : (id ?? "");
  const newIssues = useMemo<Located[] | undefined>(() => {
    if (!isNew || !attempt) return isNew ? [] : undefined;
    const candidate = addChallenge(draft.seasons, newSeasonId, { ...local, id: attempt.id });
    return locate(candidate, checkDraft(candidate, draft.site)).filter(
      (i) => i.target.kind === "challenge" && i.target.id === attempt.id,
    );
  }, [isNew, attempt, draft, newSeasonId, local]);
  const { byField, errors, countWithin } = useProblems("challenge", challengeId, newIssues);

  if (!challenge) {
    return (
      <>
        <PageHeader back={{ href: "/admin/challenges", label: "Challenges" }} title="Challenge not found" />
        <EmptyState icon={<Gift className="size-6" {...ICON} />} title="This challenge isn't here any more">
          It may have been deleted. Go back to the list of challenges.
        </EmptyState>
      </>
    );
  }

  const title = challenge.title.en.trim();
  const update = (change: (c: Challenge) => Challenge) => {
    if (isNew) setLocal(change);
    else
      edit((s) => ({ ...s, seasons: updateChallenge(s.seasons, challengeId, change) }), {
        key: `challenge:${challengeId}`,
        text: `Changed challenge ${quoteTitle(title)}`,
      });
  };
  // Applied to the question as it is now: a picture can land after other changes were made.
  const setQuestion = (index: number, change: QuestionChange) =>
    update((c) => ({ ...c, questions: c.questions.map((q, i) => (i === index ? change(q) : q)) }));

  const add = () => {
    const finalId = newChallengeId(draft.seasons, newSeasonId, reservedIds);
    const ready: Challenge = {
      ...local,
      id: finalId,
      questions: local.questions.map((q, i) => ({ ...q, id: `${finalId}-q${i + 1}` })),
    };
    const candidate = addChallenge(draft.seasons, newSeasonId, ready);
    const problems = locate(candidate, checkDraft(candidate, draft.site)).filter(
      (i) => i.target.kind === "challenge" && i.target.id === finalId,
    );
    setLocal(ready);
    if (problems.length) {
      setAttempt({ id: finalId });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    edit((s) => ({ ...s, seasons: addChallenge(s.seasons, newSeasonId, ready) }), {
      key: `add:${finalId}`,
      text: `Added challenge ${quoteTitle(ready.title.en)}`,
    });
    toast({ tone: "success", title: "Challenge added", body: "Press Save to show it to children." });
    router.push("/admin/challenges");
  };

  const season = seasons.find((s) => s.id === (isNew ? newSeasonId : found?.season.id));
  const after = isNew ? (season ? storiesOf(season).length : 0) : found ? storiesBefore(found.season, challengeId) : 0;
  const isOpen = (i: number) => open[i] ?? (i === 0 || countWithin(`questions.${i}`) > 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/challenges", label: "Challenges" }}
        eyebrow={isNew ? undefined : <Eyebrow>Challenge · {season?.title.en}</Eyebrow>}
        title={isNew ? "Add a challenge" : title || "Untitled challenge"}
        description={
          isNew
            ? "Five picture questions. Children win the sticker when they finish."
            : "Changes are kept here until you press Save."
        }
      />

      <ProblemSummary byField={byField} />

      <div className="space-y-6">
        <Card>
          <CardHeader icon={<Type className="size-5" {...ICON} />} title="Title and collection" />
          <CardBody className="space-y-5">
            <Bilingual
              field="title"
              label="Challenge title"
              value={challenge.title}
              onChange={(t) => update((c) => ({ ...c, title: t }))}
              errors={errors}
            />
            {isNew ? (
              <Field field="collection" label="Collection" className="max-w-md" hint="It goes at the end, after the last story.">
                {(control) => (
                  <Select {...control} value={newSeasonId} onChange={(e) => setNewSeasonId(e.target.value)}>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title.en}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
            <Alert tone="info" title={after ? `Comes after story ${after}` : "Comes at the start"}>
              Challenges sit after every 4 stories, in {quoteTitle(season?.title.en ?? "")}. Children can open it once
              they have watched the stories before it.
            </Alert>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Gift className="size-5" {...ICON} />}
            title="Sticker"
            description="Children win this sticker for their sticker book. A square picture with a see-through background looks best."
          />
          <CardBody>
            <PictureField
              field="sticker"
              label="Sticker picture"
              kind="sticker"
              nameHint={`${challenge.title.en || challenge.id} sticker`}
              value={challenge.sticker || undefined}
              onChange={(sticker) => update((c) => ({ ...c, sticker: sticker ?? "" }))}
              errors={errors("sticker")}
            />
          </CardBody>
        </Card>

        <section aria-labelledby="questions-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 id="questions-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <ListChecks className="size-5 text-listen-ink" {...ICON} />
                Questions
              </h2>
              <p className="text-[15px] text-ink-2">Exactly 5. Each has 2 to 4 picture answers.</p>
            </div>
          </div>
          <ol className="space-y-3">
            {challenge.questions.map((question, i) => {
              const problems = countWithin(`questions.${i}`);
              const expanded = isOpen(i);
              const panelId = `question-panel-${i}`;
              const right = question.options.find((o) => o.id === question.correctOptionId);
              return (
                <li key={i}>
                  <Card as="div" className={clsx(problems > 0 && "border-play-ink/50")}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => setOpen((o) => ({ ...o, [i]: !expanded }))}
                        className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-paper-2/60 sm:px-5"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper-2 font-display text-[15px] font-bold text-ink ring-1 ring-line">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">
                            {question.promptText.en || <span className="text-ink-3">No question yet</span>}
                          </span>
                          <span className="block text-sm text-ink-2">
                            {question.options.length} answers
                            {right?.label ? ` · right answer: ${right.label}` : ""}
                          </span>
                        </span>
                        {problems > 0 && (
                          <span className="flex items-center gap-1 text-sm font-semibold text-play-ink">
                            <CircleAlert className="size-4" {...ICON} />
                            <span className="hidden sm:inline">{problems === 1 ? "1 to fix" : `${problems} to fix`}</span>
                            <span className="sm:hidden">{problems}</span>
                          </span>
                        )}
                        <span className="hidden items-center gap-1 sm:flex" aria-hidden>
                          {question.options.slice(0, 4).map((o) => (
                            <PictureView
                              key={o.id}
                              src={o.image ? pictureSrc(o.image) : ""}
                              alt=""
                              fit="contain"
                              className="size-8 rounded-md bg-paper-2 ring-1 ring-line"
                            />
                          ))}
                        </span>
                        <ChevronDown
                          className={clsx("size-5 shrink-0 text-ink-3 transition-transform", expanded && "rotate-180")}
                          {...ICON}
                        />
                      </button>
                    </h3>
                    <div id={panelId} hidden={!expanded} className="border-t border-line px-4 pb-5 pt-5 sm:px-5">
                      {expanded && (
                        <QuestionEditor
                          field={`questions.${i}`}
                          value={question}
                          onChange={(change) => setQuestion(i, change)}
                          skills={draft.seasons.skills}
                          errors={errors}
                          nameHint={`${challenge.title.en || challenge.id} q${i + 1}`}
                        />
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        <p className="flex items-center gap-2 text-sm text-ink-2">
          <Info className="size-4 text-ink-3" {...ICON} />
          Izuba reads each question aloud, so keep the words short and simple.
        </p>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          {isNew ? (
            <ButtonLink href="/admin/challenges" variant="ghost">
              Cancel
            </ButtonLink>
          ) : (
            <Button variant="quiet-danger" icon={<Trash2 className="size-[18px]" {...ICON} />} onClick={() => setConfirmDelete(true)}>
              Delete challenge
            </Button>
          )}
          {isNew ? (
            <Button variant="primary" size="lg" icon={<Plus className="size-5" {...ICON} />} onClick={add}>
              Add challenge
            </Button>
          ) : (
            <ButtonLink href="/admin/challenges" variant="primary" size="lg">
              Done
            </ButtonLink>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          edit((s) => ({ ...s, seasons: deleteItem(s.seasons, challengeId) }), {
            key: `delete:${challengeId}`,
            text: `Deleted challenge ${quoteTitle(title)}`,
          });
          toast({ tone: "info", title: "Challenge deleted", body: "Children still see it until you save." });
          router.push("/admin/challenges");
        }}
        title={`Delete ${quoteTitle(title || "this challenge")}?`}
        confirmLabel="Delete challenge"
      >
        Children won&apos;t see this challenge or win its sticker once you save. You can bring it back from History
        after saving.
      </ConfirmDialog>
    </>
  );
}
