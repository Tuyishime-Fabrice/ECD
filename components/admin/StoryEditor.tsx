"use client";

/**
 * Adding or changing a story. A new story is kept on this screen until "Add story";
 * changes to an existing story go straight into the unsaved changes.
 */
import clsx from "clsx";
import {
  Check,
  CircleDashed,
  Clapperboard,
  Clock,
  Home,
  ImageIcon,
  LoaderCircle,
  MessageCircleQuestion,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Episode } from "@/content/schema";
import {
  addStory,
  blankQuestion,
  blankStory,
  deleteItem,
  findStory,
  moveStoryToSeason,
  newStoryId,
  sortedSeasons,
  updateStory,
} from "@/lib/admin/ui-content";
import { checkDraft, locate, type Located } from "@/lib/admin/ui-issues";
import { quoteTitle } from "@/lib/admin/ui-summary";
import { formatClock, parseClock } from "@/lib/admin/ui-time";
import { uploadPath } from "@/lib/admin/uploads";
import { useDraft } from "./AdminProvider";
import { api, type VideoInfo } from "./api";
import { PictureField, ProblemSummary, useFocusFromHash, useProblems, videoLink } from "./editing";
import { base64ToBlob, preparePicture } from "./pictures";
import { QuestionEditor } from "./QuestionEditor";
import { readVideoLength } from "./youtube-length";
import {
  Alert,
  Badge,
  Bilingual,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Choice,
  ConfirmDialog,
  EmptyState,
  Eyebrow,
  Field,
  ICON,
  PageHeader,
  PictureView,
  Select,
  TextInput,
} from "./ui";

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; info: VideoInfo; picture: string | null };

type Length = "idle" | "reading" | "read" | "failed";

export function StoryEditor({ id, collection }: { id?: string; collection?: string }) {
  const admin = useDraft();
  const { draft, edit, reservedIds, toast } = admin;
  const router = useRouter();
  useFocusFromHash();

  const seasons = sortedSeasons(draft.seasons);
  const found = id ? findStory(draft.seasons, id) : null;
  const isNew = !id;

  const firstSeason =
    (collection && seasons.find((s) => s.id === collection)?.id) ??
    seasons.find((s) => s.status === "published")?.id ??
    seasons[0]?.id ??
    "";
  const [newSeasonId, setNewSeasonId] = useState(firstSeason);
  const [local, setLocal] = useState<Episode>(() => blankStory(draft.seasons, firstSeason, reservedIds));
  const [attempt, setAttempt] = useState<{ id: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const story = isNew ? local : found?.value;
  const seasonId = isNew ? newSeasonId : (found?.season.id ?? "");
  const storyId = isNew ? (attempt?.id ?? local.id) : (id ?? "");

  // A new story's problems show once "Add story" was pressed, and update as they are fixed.
  const newIssues = useMemo<Located[] | undefined>(() => {
    if (!isNew || !attempt) return isNew ? [] : undefined;
    const candidate = addStory(draft.seasons, newSeasonId, { ...local, id: attempt.id });
    return locate(candidate, checkDraft(candidate, draft.site)).filter(
      (i) => i.target.kind === "story" && i.target.id === attempt.id,
    );
  }, [isNew, attempt, draft, newSeasonId, local]);
  const problems = useProblems("story", storyId, newIssues);
  // The length is asked for once there is a video; before that, "Paste the YouTube link" says it all.
  const hideLength = !(isNew ? local.youtubeId : found?.value.youtubeId);
  const byField = useMemo(() => {
    if (!hideLength || !problems.byField.has("durationSec")) return problems.byField;
    const copy = new Map(problems.byField);
    copy.delete("durationSec");
    return copy;
  }, [hideLength, problems.byField]);
  const errors = (field: string) => byField.get(field);

  const title = story?.title.en.trim() ?? "";
  const update = (change: (e: Episode) => Episode) => {
    if (isNew) setLocal(change);
    else
      edit((s) => ({ ...s, seasons: updateStory(s.seasons, storyId, change) }), {
        key: `story:${storyId}`,
        text: `Changed story ${quoteTitle(title)}`,
      });
  };
  const yt = useYouTubeLookup(update);

  if (!story) {
    return (
      <>
        <PageHeader back={{ href: "/admin/stories", label: "Stories" }} title="Story not found" />
        <EmptyState icon={<Clapperboard className="size-6" {...ICON} />} title="This story isn't here any more">
          It may have been deleted. Go back to the list of stories.
        </EmptyState>
      </>
    );
  }

  const changeSeason = (next: string) => {
    if (isNew) return setNewSeasonId(next);
    const target = seasons.find((s) => s.id === next);
    edit((s) => ({ ...s, seasons: moveStoryToSeason(s.seasons, storyId, next) }), {
      key: `move:${storyId}`,
      text: `Moved story ${quoteTitle(title)} to ${quoteTitle(target?.title.en ?? "")}`,
    });
  };

  const add = () => {
    const finalId = newStoryId(draft.seasons, newSeasonId, reservedIds);
    const ready: Episode = {
      ...local,
      id: finalId,
      pausePoints: local.pausePoints?.map((p, i) => ({ ...p, question: { ...p.question, id: `${finalId}-p${i + 1}` } })),
    };
    if (!ready.pausePoints?.length) delete ready.pausePoints;
    const candidate = addStory(draft.seasons, newSeasonId, ready);
    const problems = locate(candidate, checkDraft(candidate, draft.site)).filter(
      (i) => i.target.kind === "story" && i.target.id === finalId,
    );
    if (problems.length) {
      setAttempt({ id: finalId });
      setLocal(ready);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    edit((s) => ({ ...s, seasons: addStory(s.seasons, newSeasonId, ready) }), {
      key: `add:${finalId}`,
      text: `Added story ${quoteTitle(ready.title.en)}`,
    });
    toast({ tone: "success", title: "Story added", body: "Press Save to show it to children." });
    router.push("/admin/stories");
  };

  const remove = () => {
    edit((s) => ({ ...s, seasons: deleteItem(s.seasons, storyId) }), {
      key: `delete:${storyId}`,
      text: `Deleted story ${quoteTitle(title)}`,
    });
    toast({ tone: "info", title: "Story deleted", body: "Children still see it until you save." });
    router.push("/admin/stories");
  };

  const season = seasons.find((s) => s.id === seasonId);
  const position = found ? found.season.items.filter((i) => i.type === "episode").findIndex((i) => i.type === "episode" && i.episode.id === storyId) + 1 : 0;
  const skills = draft.seasons.skills;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/stories", label: "Stories" }}
        eyebrow={
          isNew ? undefined : (
            <Eyebrow>
              Story {position} · {season?.title.en}
            </Eyebrow>
          )
        }
        title={isNew ? "Add a story" : title || "Untitled story"}
        description={
          isNew
            ? "Start with the YouTube link: the title and picture fill in by themselves."
            : "Changes are kept here until you press Save."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-6">
          <ProblemSummary byField={byField} />
          <VideoCard story={story} update={update} errors={errors} yt={yt} />

          <Card>
            <CardHeader icon={<Type className="size-5" {...ICON} />} title="Title" description="Children see it under the picture." />
            <CardBody>
              <Bilingual
                field="title"
                label="Story title"
                value={story.title}
                onChange={(t) => update((e) => ({ ...e, title: t }))}
                errors={errors}
              />
            </CardBody>
          </Card>

          <PictureCard
            story={story}
            update={update}
            errors={errors}
            ytPicture={yt.lookup.status === "done" ? yt.lookup.picture : null}
          />

          <Card>
            <CardHeader
              icon={<Clapperboard className="size-5" {...ICON} />}
              title="Collection"
              description={isNew ? "The story goes at the end of this collection." : "Moving the story puts it at the end of that collection."}
            />
            <CardBody>
              <Field field="collection" label="Collection" className="max-w-md">
                {(control) => (
                  <Select {...control} value={seasonId} onChange={(e) => changeSeason(e.target.value)}>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title.en}
                        {s.status === "coming_soon" ? " (Coming soon)" : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<Home className="size-5" {...ICON} />}
              title="Do it at home"
              description="A short activity for the family after the story. Parents see it on the last screen."
            />
            <CardBody>
              <Bilingual
                field="homeActivity"
                label="Activity"
                multiline
                value={story.homeActivity}
                onChange={(t) => update((e) => ({ ...e, homeActivity: t }))}
                errors={errors}
                placeholder={{ en: "Find ONE spoon in the kitchen together…" }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<Sparkles className="size-5" {...ICON} />}
              title="Skills"
              description="What the story teaches. Parents see progress by skill."
            />
            <CardBody>
              <fieldset>
                <legend className="sr-only">Skills</legend>
                <div id="f-skills" className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(skills).map(([skill, label]) => (
                    <Choice
                      key={skill}
                      label={label.en}
                      description={label.rw}
                      checked={story.skills.includes(skill)}
                      onChange={(e) =>
                        update((ep) => ({
                          ...ep,
                          skills: e.target.checked
                            ? Object.keys(skills).filter((k) => k === skill || ep.skills.includes(k))
                            : ep.skills.filter((k) => k !== skill),
                        }))
                      }
                    />
                  ))}
                </div>
              </fieldset>
            </CardBody>
          </Card>

          <QuestionCard story={story} update={update} errors={errors} skills={skills} />

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            {isNew ? (
              <ButtonLink href="/admin/stories" variant="ghost">
                Cancel
              </ButtonLink>
            ) : (
              <Button
                variant="quiet-danger"
                icon={<Trash2 className="size-[18px]" {...ICON} />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete story
              </Button>
            )}
            {isNew ? (
              <Button variant="primary" size="lg" icon={<Plus className="size-5" {...ICON} />} onClick={add}>
                Add story
              </Button>
            ) : (
              <ButtonLink href="/admin/stories" variant="primary" size="lg">
                Done
              </ButtonLink>
            )}
          </div>
        </div>

        <aside className="hidden xl:block" aria-label="Preview">
          <div className="sticky top-24 space-y-4">
            <Preview story={story} number={isNew ? (season ? season.items.filter((i) => i.type === "episode").length + 1 : 1) : position} />
            <Checklist story={story} />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={`Delete ${quoteTitle(title || "this story")}?`}
        confirmLabel="Delete story"
      >
        Children won&apos;t see this story once you save. You can bring it back from History after saving.
      </ConfirmDialog>
    </>
  );
}

type SectionProps = {
  story: Episode;
  update: (change: (e: Episode) => Episode) => void;
  errors: (field: string) => readonly string[] | undefined;
};

/** Keeps the YouTube result (title, picture) for this screen; the picture is already resized and waiting to be saved. */
function useYouTubeLookup(update: SectionProps["update"]) {
  const { addPicture, handleFailure } = useDraft();
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [length, setLength] = useState<Length>("idle");
  const lastLink = useRef("");

  const find = async (link: string) => {
    const text = link.trim();
    if (!text || text === lastLink.current) return;
    lastLink.current = text;
    setLookup({ status: "loading" });
    const res = await api.youtube(text);
    if (!res.ok) {
      if (res.status === 401) handleFailure(res);
      setLookup({ status: "error", error: res.error });
      lastLink.current = "";
      return;
    }
    const info = res.data;
    let picture: string | null = null;
    if (info.thumbnail) {
      try {
        const prepared = await preparePicture(base64ToBlob(info.thumbnail.base64, info.thumbnail.type), "story");
        picture = uploadPath(`${info.title || info.id} picture`, prepared.type);
        addPicture(picture, { dataUrl: prepared.dataUrl, bytes: prepared.bytes });
      } catch {
        picture = null;
      }
    }
    setLookup({ status: "done", info, picture });
    update((e) => ({
      ...e,
      youtubeId: info.id,
      title: e.title.en.trim() ? e.title : { ...e.title, en: info.title },
      // A new story takes the YouTube picture; an existing one keeps its picture unless asked.
      thumbnail: picture && !e.thumbnail ? picture : e.thumbnail,
    }));
    setLength("reading");
    const seconds = await readVideoLength(info.id);
    if (seconds) {
      update((e) => (e.youtubeId === info.id ? { ...e, durationSec: seconds } : e));
      setLength("read");
    } else setLength("failed");
  };
  return { lookup, length, find, setLength };
}

function VideoCard({ story, errors, update, yt }: SectionProps & { yt: ReturnType<typeof useYouTubeLookup> }) {
  const [link, setLink] = useState(() => videoLink(story.youtubeId));
  const [lengthText, setLengthText] = useState(() => (story.durationSec > 0 ? formatClock(story.durationSec) : ""));
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [editLength, setEditLength] = useState(false);

  const linkErrors = [
    ...(yt.lookup.status === "error" ? [yt.lookup.error] : []),
    ...(errors("youtubeId") ?? []),
  ];
  const showLength = Boolean(story.youtubeId) || yt.length !== "idle";
  const showLengthField = yt.length !== "reading" && (editLength || yt.length === "failed" || !story.durationSec);
  const lengthProblems = [...(lengthError ? [lengthError] : []), ...(errors("durationSec") ?? [])];

  return (
    <Card>
      <CardHeader
        icon={<Video className="size-5" {...ICON} />}
        title="Video"
        description="The story plays from YouTube. Its owner must allow it to play on other sites."
      />
      <CardBody className="space-y-5">
        {story.youtubeId === "DEMO" && (
          <Alert tone="info" title="This story uses the sample video">
            Paste a YouTube link to use the real video.
          </Alert>
        )}
        <Field
          field="youtubeId"
          label="Paste the YouTube link"
          hint="On YouTube, press Share, then Copy, and paste it here."
          errors={linkErrors}
        >
          {(control) => (
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                {...control}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://youtu.be/…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (pasted) setTimeout(() => void yt.find(pasted), 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void yt.find(link);
                  }
                }}
              />
              <Button
                onClick={() => void yt.find(link)}
                loading={yt.lookup.status === "loading"}
                icon={<Search className="size-[18px]" {...ICON} />}
              >
                {yt.lookup.status === "loading" ? "Finding…" : "Find video"}
              </Button>
            </div>
          )}
        </Field>

        {yt.lookup.status === "done" && (
          <div className="flex items-center gap-3 rounded-xl border border-leaf/40 bg-leaf-soft/60 p-3" role="status">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf text-white">
              <Check className="size-4" strokeWidth={3} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{yt.lookup.info.title || "Video found"}</p>
              <p className="text-sm text-ink-2">
                Found on YouTube. {yt.lookup.picture ? "The title and picture are filled in." : "It has no picture; upload one below."}
              </p>
            </div>
          </div>
        )}

        {showLength && (
          <div>
          {!showLengthField ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                <Clock className="size-[18px] text-ink-3" {...ICON} />
                Length
              </p>
              {yt.length === "reading" ? (
                <span className="flex items-center gap-2 text-[15px] text-ink-2" role="status">
                  <LoaderCircle className="size-4 animate-spin" {...ICON} />
                  Reading the length from YouTube…
                </span>
              ) : (
                <>
                  <span className="font-display text-lg font-bold tabular-nums text-ink">{formatClock(story.durationSec)}</span>
                  {yt.length === "read" && <Badge tone="live">Read from YouTube</Badge>}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLengthText(formatClock(story.durationSec));
                      setEditLength(true);
                    }}
                  >
                    Change
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Field
              field="durationSec"
              label="How long is it? (minutes:seconds)"
              hint={
                yt.length === "failed"
                  ? "We couldn't read the length from YouTube. You'll find it under the video on YouTube."
                  : "For example 4:30."
              }
              errors={lengthProblems}
              className="max-w-xs"
            >
              {(control) => (
                <TextInput
                  {...control}
                  inputMode="numeric"
                  placeholder="4:30"
                  value={lengthText}
                  onChange={(e) => {
                    setLengthText(e.target.value);
                    const seconds = parseClock(e.target.value);
                    if (seconds !== null && seconds > 0) {
                      setLengthError(null);
                      update((ep) => ({ ...ep, durationSec: seconds }));
                    }
                  }}
                  onBlur={() =>
                    setLengthError(
                      lengthText && (parseClock(lengthText) ?? 0) <= 0 ? "Write it as minutes:seconds, like 4:30." : null,
                    )
                  }
                />
              )}
            </Field>
          )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PictureCard({ story, update, errors, ytPicture }: SectionProps & { ytPicture: string | null }) {
  const source =
    story.thumbnail && story.thumbnail === ytPicture
      ? "From YouTube."
      : story.thumbnail?.startsWith("/images/uploads/")
        ? "Uploaded picture."
        : story.thumbnail
          ? "The story's picture."
          : null;
  return (
    <Card>
      <CardHeader
        icon={<ImageIcon className="size-5" {...ICON} />}
        title="Picture"
        description="Shown on the story card and in the big slider on Home. It is cut to a wide 16:9 shape."
      />
      <CardBody>
        <PictureField
          field="thumbnail"
          label="Story picture"
          kind="story"
          nameHint={`${story.title.en || story.id} picture`}
          value={story.thumbnail || undefined}
          onChange={(thumbnail) => update((e) => ({ ...e, thumbnail: thumbnail ?? "" }))}
          errors={errors("thumbnail")}
          caption={source}
          extraActions={
            ytPicture && story.thumbnail !== ytPicture ? (
              <Button variant="secondary" onClick={() => update((e) => ({ ...e, thumbnail: ytPicture }))}>
                Use the YouTube picture
              </Button>
            ) : null
          }
        />
      </CardBody>
    </Card>
  );
}

function QuestionCard({ story, update, errors, skills }: SectionProps & { skills: Record<string, { en: string; rw: string }> }) {
  const [times, setTimes] = useState<Record<number, string>>({});
  const points = story.pausePoints ?? [];
  const firstSkill = story.skills[0] ?? Object.keys(skills)[0] ?? "";
  return (
    <Card>
      <CardHeader
        icon={<MessageCircleQuestion className="size-5" {...ICON} />}
        title="Question during the story"
        description="Optional. The video pauses and Izuba asks a picture question, then the story goes on."
      />
      <CardBody>
        {points.length === 0 ? (
          <Button
            icon={<Plus className="size-[18px]" {...ICON} />}
            onClick={() =>
              update((e) => ({
                ...e,
                pausePoints: [
                  {
                    atSec: Math.max(1, Math.min(30, Math.floor((e.durationSec || 60) / 2))),
                    question: blankQuestion(`${e.id}-p1`, firstSkill),
                  },
                ],
              }))
            }
          >
            Add a question
          </Button>
        ) : (
          <div className="space-y-8">
            {points.map((point, i) => {
              const field = `pausePoints.${i}`;
              const text = times[i] ?? formatClock(point.atSec);
              const parsed = parseClock(text);
              const timeErrors = [
                ...(parsed === null ? ["Write it as minutes:seconds, like 0:45."] : []),
                ...(errors(`${field}.atSec`) ?? []),
              ];
              return (
                <div key={point.question.id} className={clsx(i > 0 && "border-t border-line pt-8")}>
                  <QuestionEditor
                    field={`${field}.question`}
                    value={point.question}
                    skills={skills}
                    errors={errors}
                    nameHint={`${story.title.en || story.id} question`}
                    onChange={(question) =>
                      update((e) => ({
                        ...e,
                        pausePoints: (e.pausePoints ?? []).map((p, k) => (k === i ? { ...p, question } : p)),
                      }))
                    }
                  >
                    <Field
                      field={`${field}.atSec`}
                      label="When it appears (minutes:seconds)"
                      hint={story.durationSec ? `The story is ${formatClock(story.durationSec)} long.` : undefined}
                      errors={timeErrors}
                      className="max-w-xs"
                    >
                      {(control) => (
                        <TextInput
                          {...control}
                          inputMode="numeric"
                          value={text}
                          onChange={(e) => {
                            setTimes((t) => ({ ...t, [i]: e.target.value }));
                            const seconds = parseClock(e.target.value);
                            if (seconds !== null) {
                              update((ep) => ({
                                ...ep,
                                pausePoints: (ep.pausePoints ?? []).map((p, k) => (k === i ? { ...p, atSec: seconds } : p)),
                              }));
                            }
                          }}
                        />
                      )}
                    </Field>
                  </QuestionEditor>
                  <Button
                    variant="quiet-danger"
                    className="mt-6"
                    icon={<Trash2 className="size-[18px]" {...ICON} />}
                    onClick={() =>
                      update((e) => {
                        const rest = (e.pausePoints ?? []).filter((_, k) => k !== i);
                        if (rest.length) return { ...e, pausePoints: rest };
                        const next: Episode = { ...e };
                        delete next.pausePoints;
                        return next;
                      })
                    }
                  >
                    Remove this question
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Preview({ story, number }: { story: Episode; number: number }) {
  const { pictureSrc } = useDraft();
  return (
    <Card className="overflow-hidden">
      <p className="px-4 pt-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-ink-3">What children see</p>
      <div className="p-3">
        <div className="rounded-xl bg-paper-2 p-2.5 ring-1 ring-line">
          <PictureView
            src={story.thumbnail ? pictureSrc(story.thumbnail) : ""}
            alt=""
            className="aspect-video w-full rounded-lg"
          />
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-play-ink">Story {number}</p>
          <p className="line-clamp-2 font-display text-base font-bold leading-snug text-ink">
            {story.title.rw || story.title.en || "Story title"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Checklist({ story }: { story: Episode }) {
  const items = [
    { label: "Video", done: Boolean(story.youtubeId) },
    { label: "Length", done: story.durationSec > 0 },
    { label: "English title", done: Boolean(story.title.en.trim()) },
    { label: "Kinyarwanda title", done: Boolean(story.title.rw.trim()), optional: true },
    { label: "Picture", done: Boolean(story.thumbnail) },
    { label: "Do it at home", done: Boolean(story.homeActivity.en.trim()) },
    { label: "Skills", done: story.skills.length > 0, optional: true },
  ];
  return (
    <Card>
      <p className="px-4 pt-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-ink-3">Checklist</p>
      <ul className="space-y-1 px-4 pb-4 pt-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 py-0.5 text-[15px]">
            {item.done ? (
              <span className="grid size-5 place-items-center rounded-full bg-leaf text-white">
                <Check className="size-3" strokeWidth={3.5} aria-hidden />
              </span>
            ) : (
              <CircleDashed className="size-5 text-ink-3" {...ICON} />
            )}
            <span className={item.done ? "text-ink" : "text-ink-2"}>
              {item.label}
              {item.optional && !item.done && <span className="text-ink-3"> (optional)</span>}
              <span className="sr-only">{item.done ? ": done" : ": not yet"}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-3 text-sm text-ink-2">
        <Link href="/admin/help#stories" className="font-semibold text-listen-ink hover:underline">
          Tips for good stories
        </Link>
      </div>
    </Card>
  );
}
