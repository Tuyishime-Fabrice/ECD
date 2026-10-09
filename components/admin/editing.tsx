"use client";

/**
 * Pieces the editors share: problems by field, jumping to a field, and picture
 * uploads (resized in the browser, named with uploadPath).
 */
import clsx from "clsx";
import { CircleAlert, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SeasonColor } from "@/content/schema";
import type { PictureKind } from "@/lib/admin/ui-images";
import { fieldId, problemsFor, type Located, type Target } from "@/lib/admin/ui-issues";
import { uploadPath } from "@/lib/admin/uploads";
import { useAdmin } from "./AdminProvider";
import { PictureError, preparePicture } from "./pictures";
import { Button, FieldErrors, ICON, PictureView } from "./ui";

export const COLORS: Record<SeasonColor, { label: string; swatch: string; soft: string }> = {
  sky: { label: "Sky blue", swatch: "bg-listen", soft: "bg-listen/15" },
  coral: { label: "Coral", swatch: "bg-coral", soft: "bg-coral-soft" },
  leaf: { label: "Leaf green", swatch: "bg-leaf", soft: "bg-leaf-soft" },
  grape: { label: "Grape purple", swatch: "bg-berry", soft: "bg-berry-soft" },
};

export const videoLink = (youtubeId: string) => (youtubeId && youtubeId !== "DEMO" ? `https://youtu.be/${youtubeId}` : "");

/** Problems for one story, challenge, collection or the settings, by field. */
export function useProblems(kind: Target["kind"], id?: string, override?: Located[]) {
  const { issues } = useAdmin();
  const source = override ?? issues;
  const byField = useMemo(() => problemsFor(source, kind, id), [source, kind, id]);
  const errors = useCallback((field: string) => byField.get(field), [byField]);
  /** Problems on this field or anything inside it ("questions.2" covers "questions.2.options.0.image"). */
  const countWithin = useCallback(
    (prefix: string) => [...byField].filter(([f]) => f === prefix || f.startsWith(`${prefix}.`)).reduce((n, [, l]) => n + l.length, 0),
    [byField],
  );
  return { byField, errors, countWithin };
}

/** Moves to a field and focuses it, waiting a moment for the screen to appear first. */
export function focusField(id: string) {
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus({ preventScroll: true });
    } else if (++tries < 30) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

/** On opening an editor from a "Fix" link (/admin/stories/s1e2#f-title-en), go to that field. */
export function useFocusFromHash() {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id.startsWith("f-")) focusField(id);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
}

/** "Question 3 · answer B" for fields inside a question, so a problem in a list says which one. */
export function fieldLabel(field: string): string | null {
  const parts: string[] = [];
  const question = /^questions\.(\d+)/.exec(field);
  if (question) parts.push(`Question ${Number(question[1]) + 1}`);
  if (/^pausePoints\./.test(field)) parts.push("Question during the story");
  const answer = /\.options\.(\d+)/.exec(field);
  if (answer) parts.push(`answer ${String.fromCharCode(65 + Number(answer[1]))}`);
  return parts.length ? parts.join(" · ") : null;
}

/** "Fix these" at the top of an editor, each linking to its field (the GOV.UK error summary pattern). */
export function ProblemSummary({ byField }: { byField: Map<string, string[]> }) {
  const entries = [...byField].flatMap(([field, list]) => list.map((problem) => ({ field, problem })));
  if (!entries.length) return null;
  return (
    <div role="alert" className="mb-6 rounded-xl border border-play-ink/40 bg-coral-soft px-4 py-3.5">
      <p className="flex items-center gap-2 font-bold text-ink">
        <CircleAlert className="size-5 text-play-ink" {...ICON} />
        {entries.length === 1 ? "1 thing to fix" : `${entries.length} things to fix`}
      </p>
      <ul className="mt-2 space-y-1 pl-7">
        {entries.map(({ field, problem }) => (
          <li key={`${field}-${problem}`}>
            <a
              href={`#${fieldId(field)}`}
              onClick={(e) => {
                e.preventDefault();
                focusField(fieldId(field));
              }}
              className="text-[15px] font-semibold text-ink underline decoration-play-ink/50 underline-offset-2 hover:decoration-play-ink"
            >
              {fieldLabel(field) ? `${fieldLabel(field)}: ` : ""}
              {problem}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Picks a file, resizes it and adds it to the save; `onPicked` gets the new picture's path.
 * `name` describes the picture ("Keza's One Mango picture") and becomes its file name.
 */
export function usePictureUpload(kind: PictureKind, name: string, onPicked: (path: string) => void) {
  const { addPicture } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const accept = async (file: Blob) => {
    setBusy(true);
    setError(null);
    try {
      const picture = await preparePicture(file, kind);
      const path = uploadPath(name, picture.type);
      addPicture(path, { dataUrl: picture.dataUrl, bytes: picture.bytes });
      onPicked(path);
    } catch (err) {
      setError(err instanceof PictureError ? err.message : "This picture couldn't be used. Try another one.");
    } finally {
      setBusy(false);
    }
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      tabIndex={-1}
      aria-hidden
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void accept(file);
      }}
    />
  );
  return { open: () => input.current?.click(), accept, busy, error, fileInput };
}

const ASPECT: Record<PictureKind, string> = {
  story: "aspect-video",
  poster: "aspect-[4/3]",
  sticker: "aspect-square",
  answer: "aspect-square",
};

/** A picture with "Upload" (and optionally "Remove"), its problems underneath. */
export function PictureField({
  field,
  label,
  hint,
  kind,
  nameHint,
  value,
  onChange,
  errors,
  optional,
  extraActions,
  caption,
  className,
}: {
  field: string;
  label: string;
  hint?: React.ReactNode;
  kind: PictureKind;
  nameHint: string;
  value: string | undefined;
  onChange: (path: string | undefined) => void;
  errors?: readonly string[];
  optional?: boolean;
  extraActions?: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
}) {
  const { pictureSrc } = useAdmin();
  const upload = usePictureUpload(kind, nameHint, onChange);
  const id = fieldId(field);
  const problems = [...(upload.error ? [upload.error] : []), ...(errors ?? [])];
  const square = kind === "sticker" || kind === "answer";
  return (
    <div className={className}>
      <p id={`${id}-label`} className="mb-1.5 flex items-baseline gap-2 text-[15px] font-bold text-ink">
        {label}
        {optional && <span className="text-sm font-semibold text-ink-3">Optional</span>}
      </p>
      {hint && <p className="-mt-0.5 mb-2.5 text-sm text-ink-2">{hint}</p>}
      <div className={clsx("flex gap-3", square ? "flex-row items-center gap-4" : "flex-col")}>
        <div
          className={clsx(
            "relative shrink-0 overflow-hidden rounded-xl border bg-paper-2",
            ASPECT[kind],
            square ? "w-32" : "w-full sm:w-96",
            problems.length ? "border-play-ink" : "border-line",
          )}
        >
          <PictureView src={value ? pictureSrc(value) : ""} alt={label} fit={square ? "contain" : "cover"} className="size-full" />
          {upload.busy && (
            <span className="absolute inset-0 grid place-items-center bg-paper/80">
              <LoaderCircle className="size-6 animate-spin text-ink-2" {...ICON} />
            </span>
          )}
        </div>
        <div className={clsx("flex min-w-0 gap-2", square ? "flex-col" : "flex-col sm:flex-row-reverse sm:items-center sm:justify-end sm:gap-3")}>
          {caption && <div className="text-sm text-ink-2">{caption}</div>}
          <div className="flex flex-wrap gap-2">
            {extraActions}
            <Button
              id={id}
              onClick={upload.open}
              loading={upload.busy}
              icon={value ? <Upload className="size-[18px]" {...ICON} /> : <ImagePlus className="size-[18px]" {...ICON} />}
              aria-describedby={[`${id}-label`, problems.length ? `${id}-error` : ""].filter(Boolean).join(" ")}
            >
              {value ? "Replace" : "Upload a picture"}
            </Button>
            {optional && value && (
              <Button variant="ghost" onClick={() => onChange(undefined)} icon={<Trash2 className="size-[18px]" {...ICON} />}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {upload.fileInput}
      <FieldErrors id={`${id}-error`} errors={problems} />
    </div>
  );
}
