"use client";

import { ArrowDown, ArrowUp, Info, MessageCircle, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import { MAX_FEATURED, whatsappContact } from "@/content/site";
import { cleanFeatured, findStory, liveStories, moveInList, sortedSeasons, storiesOf } from "@/lib/admin/ui-content";
import { fieldId } from "@/lib/admin/ui-issues";
import { useDraft } from "./AdminProvider";
import { ProblemSummary, useFocusFromHash, useProblems } from "./editing";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  FieldErrors,
  ICON,
  IconButton,
  PageHeader,
  PictureView,
  Select,
  TextInput,
} from "./ui";

const PHONE = /^(\+?[0-9 ]{8,20})?$/;

export function SettingsScreen() {
  useFocusFromHash();
  const { byField, errors } = useProblems("settings");
  return (
    <>
      <PageHeader title="Settings" description="What children see first on Home, and how parents can reach you." />
      <ProblemSummary byField={byField} />
      <div className="space-y-6">
        <FeaturedCard errors={errors("featured")} />
        <ContactCard errors={errors("contact.whatsapp")} />
      </div>
    </>
  );
}

function FeaturedCard({ errors }: { errors?: readonly string[] }) {
  const { draft, edit, pictureSrc } = useDraft();
  const [pick, setPick] = useState("");
  const featured = cleanFeatured(draft.site, draft.seasons).featured;
  const dropped = draft.site.featured.length - featured.length;
  const available = liveStories(draft.seasons).filter(({ story }) => !featured.includes(story.id));
  const full = featured.length >= MAX_FEATURED;

  const setFeatured = (list: string[]) =>
    edit((s) => ({ ...s, site: { ...s.site, featured: list } }), { key: "featured", text: "Changed the featured stories" });

  return (
    <Card aria-labelledby="featured-heading">
      <CardHeader
        id="featured-heading"
        icon={<Star className="size-5" {...ICON} />}
        title="Featured stories"
        description={`The big slider at the top of Home. Pick up to ${MAX_FEATURED}, in the order they appear.`}
      />
      <CardBody className="space-y-4">
        {dropped > 0 && (
          <Alert tone="info">
            {dropped === 1 ? "1 story was" : `${dropped} stories were`} taken off this list because{" "}
            {dropped === 1 ? "it isn't" : "they aren't"} in a Live collection any more.
          </Alert>
        )}
        {featured.length === 0 ? (
          <EmptyState icon={<Star className="size-6" {...ICON} />} title="No featured stories">
            Home shows the first stories instead. Add a story below.
          </EmptyState>
        ) : (
          <ol className="divide-y divide-line rounded-xl border border-line">
            {featured.map((id, i) => {
              const found = findStory(draft.seasons, id);
              const title = found?.value.title.en || id;
              return (
                <li key={id} className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
                  <span className="w-5 shrink-0 text-center font-display font-bold tabular-nums text-ink-3">{i + 1}</span>
                  <PictureView
                    src={found?.value.thumbnail ? pictureSrc(found.value.thumbnail) : ""}
                    alt=""
                    className="aspect-video w-20 shrink-0 rounded-lg ring-1 ring-line sm:w-24"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-semibold leading-snug text-ink sm:line-clamp-1">{title}</span>
                    <span className="block truncate text-sm text-ink-2">{found?.season.title.en}</span>
                  </span>
                  <span className="flex shrink-0 items-center" role="group" aria-label={`Actions for ${title}`}>
                    <IconButton
                      label={`Move ${title} up`}
                      icon={<ArrowUp className="size-5" {...ICON} />}
                      disabled={i === 0}
                      onClick={() => setFeatured(moveInList(featured, i, -1))}
                    />
                    <IconButton
                      label={`Move ${title} down`}
                      icon={<ArrowDown className="size-5" {...ICON} />}
                      disabled={i === featured.length - 1}
                      onClick={() => setFeatured(moveInList(featured, i, 1))}
                    />
                    <IconButton
                      label={`Remove ${title} from featured`}
                      icon={<X className="size-5" {...ICON} />}
                      onClick={() => setFeatured(featured.filter((x) => x !== id))}
                    />
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div>
          <label htmlFor={fieldId("featured")} className="mb-1.5 block text-[15px] font-bold text-ink">
            Add a featured story
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Select
                id={fieldId("featured")}
                value={pick}
                disabled={full || !available.length}
                aria-describedby={`${fieldId("featured")}-hint${errors?.length ? ` ${fieldId("featured")}-error` : ""}`}
                onChange={(e) => setPick(e.target.value)}
              >
                <option value="">{full ? `${MAX_FEATURED} stories already featured` : "Choose a story…"}</option>
                {sortedSeasons(draft.seasons)
                  .filter((s) => s.status === "published")
                  .map((season) => {
                    const options = storiesOf(season).filter((e) => !featured.includes(e.id));
                    return options.length ? (
                      <optgroup key={season.id} label={season.title.en}>
                        {options.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title.en || e.id}
                          </option>
                        ))}
                      </optgroup>
                    ) : null;
                  })}
              </Select>
            </div>
            <Button
              icon={<Plus className="size-[18px]" {...ICON} />}
              disabled={!pick || full}
              onClick={() => {
                setFeatured([...featured, pick]);
                setPick("");
              }}
            >
              Add
            </Button>
          </div>
          <p id={`${fieldId("featured")}-hint`} className="mt-1.5 text-sm text-ink-2">
            Only stories in Live collections can be featured.
          </p>
          <FieldErrors id={`${fieldId("featured")}-error`} errors={errors} />
        </div>
      </CardBody>
    </Card>
  );
}

function ContactCard({ errors }: { errors?: readonly string[] }) {
  const { draft, edit } = useDraft();
  const number = draft.site.contact.whatsapp;
  const contact = PHONE.test(number) ? whatsappContact(number) : null;
  return (
    <Card>
      <CardHeader
        icon={<MessageCircle className="size-5" {...ICON} />}
        title="Contact"
        description="Parents can message you on WhatsApp from the parent area."
      />
      <CardBody>
        <Field
          field="contact.whatsapp"
          label="WhatsApp number"
          hint="With the country code, like +250 781 234 567. Leave it empty to hide Contact."
          errors={errors}
          className="max-w-sm"
        >
          {(control) => (
            <TextInput
              {...control}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+250 781 234 567"
              value={number}
              onChange={(e) =>
                edit((s) => ({ ...s, site: { ...s.site, contact: { ...s.site.contact, whatsapp: e.target.value } } }), {
                  key: "whatsapp",
                  text: "Changed the WhatsApp number",
                })
              }
            />
          )}
        </Field>
        <p className="mt-4 flex items-start gap-2 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-3" {...ICON} />
          {contact
            ? `Parents will see a Contact card that opens a WhatsApp chat with ${contact.label}.`
            : "Contact is hidden: parents won't see a WhatsApp card."}
        </p>
      </CardBody>
    </Card>
  );
}
