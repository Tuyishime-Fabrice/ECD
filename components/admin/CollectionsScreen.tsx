"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, Library, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Season } from "@/content/schema";
import { addSeason, blankSeason, challengesOf, moveSeason, sortedSeasons, storiesOf } from "@/lib/admin/ui-content";
import { quoteTitle } from "@/lib/admin/ui-summary";
import { useDraft } from "./AdminProvider";
import { COLORS } from "./editing";
import { Badge, Button, Card, Dialog, Field, ICON, IconButton, PageHeader, PictureView, TextInput } from "./ui";

export function CollectionsScreen() {
  const { draft } = useDraft();
  const [adding, setAdding] = useState(false);
  const seasons = sortedSeasons(draft.seasons);
  return (
    <>
      <PageHeader
        title="Collections"
        description="Stories are grouped into collections. Children see them on Home in this order."
        actions={
          <Button variant="primary" icon={<Plus className="size-5" {...ICON} />} onClick={() => setAdding(true)}>
            Add a collection
          </Button>
        }
      />
      <ol className="space-y-3">
        {seasons.map((season, i) => (
          <CollectionRow key={season.id} season={season} index={i} count={seasons.length} />
        ))}
      </ol>
      <AddCollectionDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function CollectionRow({ season, index, count }: { season: Season; index: number; count: number }) {
  const { edit, pictureSrc, issues } = useDraft();
  const stories = storiesOf(season).length;
  const challenges = challengesOf(season).length;
  const href = `/admin/collections/${encodeURIComponent(season.id)}`;
  const title = season.title.en || "Untitled collection";
  const problems = issues.filter((x) => x.target.kind === "collection" && x.target.id === season.id).length;
  const move = (direction: -1 | 1) =>
    edit((s) => ({ ...s, seasons: moveSeason(s.seasons, season.id, direction) }), {
      key: "move-collections",
      text: "Changed the order of collections",
    });
  return (
    <Card as="li" className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:flex-nowrap sm:p-4">
      <span className="hidden w-6 shrink-0 text-center font-display text-base font-bold tabular-nums text-ink-3 sm:block">
        {index + 1}
      </span>
      <Link href={href} className="group flex min-w-0 flex-1 items-center gap-4 rounded-xl">
        <span className={clsx("relative block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-line sm:w-28", COLORS[season.color].soft)}>
          <PictureView src={season.posterImage ? pictureSrc(season.posterImage) : ""} alt="" className="size-full" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold leading-tight text-ink group-hover:underline">{title}</span>
          </span>
          {season.title.rw && (
            <span lang="rw" className="mt-0.5 block truncate text-sm text-ink-2">
              {season.title.rw}
            </span>
          )}
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {season.status === "published" ? <Badge tone="live">Live</Badge> : <Badge tone="soon">Coming soon</Badge>}
            <Badge tone="neutral" icon={<span className={clsx("size-2.5 rounded-full", COLORS[season.color].swatch)} />}>
              {COLORS[season.color].label}
            </Badge>
            <span className="text-sm text-ink-2">
              {stories} {stories === 1 ? "story" : "stories"}
              {challenges ? ` · ${challenges} ${challenges === 1 ? "challenge" : "challenges"}` : ""}
            </span>
            {problems > 0 && <Badge tone="danger">{problems === 1 ? "1 thing to fix" : `${problems} things to fix`}</Badge>}
          </span>
        </span>
      </Link>
      <div className="ml-auto flex shrink-0 items-center gap-0.5" role="group" aria-label={`Actions for ${title}`}>
        <IconButton label={`Move ${title} up`} icon={<ArrowUp className="size-5" {...ICON} />} disabled={index === 0} onClick={() => move(-1)} />
        <IconButton
          label={`Move ${title} down`}
          icon={<ArrowDown className="size-5" {...ICON} />}
          disabled={index === count - 1}
          onClick={() => move(1)}
        />
        <Link
          href={href}
          className="ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-display text-[15px] font-semibold text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
        >
          <Pencil className="size-[18px]" {...ICON} />
          Edit<span className="sr-only"> {title}</span>
        </Link>
      </div>
    </Card>
  );
}

function AddCollectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { draft, edit, reservedIds, toast } = useDraft();
  const router = useRouter();
  const [en, setEn] = useState("");
  const [rw, setRw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setEn("");
    setRw("");
    setError(null);
    onClose();
  };
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!en.trim()) {
      setError("Write the English title.");
      document.getElementById("f-new-title-en")?.focus();
      return;
    }
    const season = blankSeason(draft.seasons, { en, rw }, reservedIds);
    edit((s) => ({ ...s, seasons: addSeason(s.seasons, season) }), {
      key: `add:${season.id}`,
      text: `Added collection ${quoteTitle(season.title.en)}`,
    });
    toast({ tone: "success", title: "Collection added", body: "Add a poster picture, then press Save." });
    close();
    router.push(`/admin/collections/${season.id}`);
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      onSubmit={create}
      title="Add a collection"
      description="It starts as “Coming soon”. Children see it on Home with a sleeping badge until you make it Live."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" icon={<Library className="size-[18px]" {...ICON} />}>
            Add collection
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field field="new.title.en" label="Title in English" errors={error ? [error] : undefined}>
          {(control) => (
            <TextInput {...control} autoFocus value={en} placeholder="Animal Stories" onChange={(e) => setEn(e.target.value)} />
          )}
        </Field>
        <Field field="new.title.rw" label="Title in Kinyarwanda" optional>
          {(control) => <TextInput {...control} lang="rw" value={rw} onChange={(e) => setRw(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}
