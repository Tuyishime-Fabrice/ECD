"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronRight, Eye, ImageIcon, Library, Moon, Palette, Trash2, Type } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SEASON_COLORS, type Season, type SeasonColor } from "@/content/schema";
import {
  challengesOf,
  deleteSeason,
  findSeason,
  moveSeason,
  sortedSeasons,
  storiesOf,
  updateSeason,
} from "@/lib/admin/ui-content";
import { fieldId } from "@/lib/admin/ui-issues";
import { quoteTitle } from "@/lib/admin/ui-summary";
import { useDraft } from "./AdminProvider";
import { COLORS, PictureField, ProblemSummary, useFocusFromHash, useProblems } from "./editing";
import {
  Bilingual,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  FieldErrors,
  ICON,
  PageHeader,
} from "./ui";

export function CollectionEditor({ id }: { id: string }) {
  const { draft, edit, toast } = useDraft();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useFocusFromHash();
  const { byField, errors } = useProblems("collection", id);

  const season = findSeason(draft.seasons, id);
  if (!season) {
    return (
      <>
        <PageHeader back={{ href: "/admin/collections", label: "Collections" }} title="Collection not found" />
        <EmptyState icon={<Library className="size-6" {...ICON} />} title="This collection isn't here any more">
          It may have been deleted. Go back to the list of collections.
        </EmptyState>
      </>
    );
  }

  const title = season.title.en.trim();
  const update = (change: (s: Season) => Season) =>
    edit((s) => ({ ...s, seasons: updateSeason(s.seasons, id, change) }), {
      key: `collection:${id}`,
      text: `Changed collection ${quoteTitle(title)}`,
    });
  const list = sortedSeasons(draft.seasons);
  const position = list.findIndex((s) => s.id === id);
  const stories = storiesOf(season).length;
  const challenges = challengesOf(season).length;
  const move = (direction: -1 | 1) =>
    edit((s) => ({ ...s, seasons: moveSeason(s.seasons, id, direction) }), {
      key: "move-collections",
      text: "Changed the order of collections",
    });
  const statusErrors = [...(errors("status") ?? []), ...(errors("items") ?? [])];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/collections", label: "Collections" }}
        title={title || "Untitled collection"}
        description="Changes are kept here until you press Save."
      />
      <ProblemSummary byField={byField} />

      <div className="space-y-6">
        <Card>
          <CardHeader icon={<Type className="size-5" {...ICON} />} title="Title" />
          <CardBody>
            <Bilingual
              field="title"
              label="Collection title"
              value={season.title}
              onChange={(t) => update((s) => ({ ...s, title: t }))}
              errors={errors}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Eye className="size-5" {...ICON} />}
            title="Can children see it?"
            description="A collection needs at least one story before it can be Live."
          />
          <CardBody>
            <fieldset aria-describedby={statusErrors.length ? `${fieldId("status")}-error` : undefined}>
              <legend className="sr-only">Live or Coming soon</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatusOption
                  id={fieldId("items")}
                  checked={season.status === "published"}
                  onChange={() => update((s) => ({ ...s, status: "published" }))}
                  title="Live"
                  description={`Children can watch its ${stories === 1 ? "story" : `${stories} stories`}.`}
                  icon={<Eye className="size-5" {...ICON} />}
                  tone="live"
                />
                <StatusOption
                  id={fieldId("status")}
                  checked={season.status === "coming_soon"}
                  onChange={() => update((s) => ({ ...s, status: "coming_soon" }))}
                  title="Coming soon"
                  description="Children see the poster with a sleeping “zz” badge, but can't open it yet."
                  icon={<Moon className="size-5" {...ICON} />}
                  tone="soon"
                />
              </div>
            </fieldset>
            <FieldErrors id={`${fieldId("status")}-error`} errors={statusErrors} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Palette className="size-5" {...ICON} />}
            title="Color"
            description="Used for the collection's badges and accents."
          />
          <CardBody>
            <fieldset>
              <legend className="sr-only">Color</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" id={fieldId("color")}>
                {SEASON_COLORS.map((color: SeasonColor) => (
                  <label
                    key={color}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 hover:border-ink-3/50 has-[:checked]:border-listen has-[:checked]:bg-listen/[0.07] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-listen/30"
                  >
                    <input
                      type="radio"
                      name="collection-color"
                      className="sr-only"
                      checked={season.color === color}
                      onChange={() => update((s) => ({ ...s, color }))}
                    />
                    <span
                      className={clsx(
                        "size-7 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-paper",
                        COLORS[color].swatch,
                        season.color === color ? "ring-listen" : "ring-transparent",
                      )}
                      aria-hidden
                    />
                    <span className="text-[15px] font-semibold text-ink">{COLORS[color].label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <FieldErrors id={`${fieldId("color")}-error`} errors={errors("color")} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<ImageIcon className="size-5" {...ICON} />}
            title="Poster"
            description="Shown on Home for “Coming soon” collections. It is cut to a 4:3 shape."
          />
          <CardBody>
            <PictureField
              field="posterImage"
              label="Poster picture"
              kind="poster"
              nameHint={`${season.title.en || season.id} poster`}
              value={season.posterImage || undefined}
              onChange={(posterImage) => update((s) => ({ ...s, posterImage: posterImage ?? "" }))}
              errors={errors("posterImage")}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Library className="size-5" {...ICON} />}
            title="Order and contents"
            description={`Position ${position + 1} of ${list.length} on Home.`}
            actions={
              <div className="flex gap-2">
                <Button size="sm" icon={<ArrowUp className="size-[18px]" {...ICON} />} disabled={position === 0} onClick={() => move(-1)}>
                  Move up
                </Button>
                <Button
                  size="sm"
                  icon={<ArrowDown className="size-[18px]" {...ICON} />}
                  disabled={position === list.length - 1}
                  onClick={() => move(1)}
                >
                  Move down
                </Button>
              </div>
            }
          />
          <CardBody>
            <Link
              href="/admin/stories"
              className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 py-3 hover:bg-paper-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {stories} {stories === 1 ? "story" : "stories"}
                  {challenges ? `, ${challenges} ${challenges === 1 ? "challenge" : "challenges"}` : ""}
                </span>
                <span className="block text-sm text-ink-2">Add, edit and reorder them on the Stories page.</span>
              </span>
              <ChevronRight className="size-5 text-ink-3" {...ICON} />
            </Link>
          </CardBody>
        </Card>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button
              variant="quiet-danger"
              icon={<Trash2 className="size-[18px]" {...ICON} />}
              disabled={season.items.length > 0}
              onClick={() => setConfirmDelete(true)}
            >
              Delete collection
            </Button>
            {season.items.length > 0 && (
              <p className="mt-1 px-1 text-sm text-ink-2">Only an empty collection can be deleted.</p>
            )}
          </div>
          <ButtonLink href="/admin/collections" variant="primary" size="lg">
            Done
          </ButtonLink>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          edit((s) => ({ ...s, seasons: deleteSeason(s.seasons, id) }), {
            key: `delete:${id}`,
            text: `Deleted collection ${quoteTitle(title)}`,
          });
          toast({ tone: "info", title: "Collection deleted", body: "Press Save to make it final." });
          router.push("/admin/collections");
        }}
        title={`Delete ${quoteTitle(title || "this collection")}?`}
        confirmLabel="Delete collection"
      >
        It has no stories, so nothing else changes. You can bring it back from History after saving.
      </ConfirmDialog>
    </>
  );
}

function StatusOption({
  id,
  checked,
  onChange,
  title,
  description,
  icon,
  tone,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: "live" | "soon";
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer gap-3 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-listen/30",
        checked ? "border-listen bg-listen/[0.07]" : "border-line bg-paper hover:border-ink-3/50",
      )}
    >
      <input id={id} type="radio" name="collection-status" checked={checked} onChange={onChange} className="mt-1 size-[18px] shrink-0 accent-listen-lip" />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-bold text-ink">
          <span className={tone === "live" ? "text-leaf-ink" : "text-berry-ink"}>{icon}</span>
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-ink-2">{description}</span>
      </span>
    </label>
  );
}
