"use client";

/**
 * One picture question: the question in both languages, 2–4 picture answers,
 * which one is right, and the skill it practices. Used for the question during a
 * story and for the 5 questions of a challenge.
 *
 * Changes go up as functions of the question (`onChange(q => …)`), so a picture that
 * finishes resizing after other changes is added to the latest question, not to the
 * copy that was on screen when it was picked.
 */
import clsx from "clsx";
import { ImagePlus, LoaderCircle, Mic, Plus, Trash2 } from "lucide-react";
import type { LocalizedText, Question } from "@/content/schema";
import { addOption, changeOption, removeOption, setPromptImage } from "@/lib/admin/ui-content";
import { fieldId } from "@/lib/admin/ui-issues";
import { useAdmin } from "./AdminProvider";
import { PictureField, usePictureUpload } from "./editing";
import { Bilingual, Button, Field, FieldErrors, ICON, PictureView, Select, TextInput } from "./ui";

const MAX_ANSWERS = 4;
const MIN_ANSWERS = 2;

type Option = Question["options"][number];
export type QuestionChange = (q: Question) => Question;

export function QuestionEditor({
  value,
  onChange,
  field,
  skills,
  errors,
  nameHint,
  children,
}: {
  value: Question;
  onChange: (change: QuestionChange) => void;
  /** Where this question is, for problems and field ids: "pausePoints.0.question", "questions.2". */
  field: string;
  skills: Record<string, LocalizedText>;
  errors: (field: string) => readonly string[] | undefined;
  nameHint: string;
  /** Extra fields shown before the answers (the time, for a question during a story). */
  children?: React.ReactNode;
}) {
  const f = (name: string) => `${field}.${name}`;
  const set = (patch: Partial<Question>) => onChange((q) => ({ ...q, ...patch }));
  const options = value.options;

  const hasRecording = Boolean(value.promptAudio && Object.values(value.promptAudio).some(Boolean));

  return (
    <div className="space-y-6">
      {children}
      <div>
        <Bilingual
          field={f("promptText")}
          label="The question"
          hint="Izuba reads it out loud. Keep it short: “Tap the picture with 3 mangoes”."
          value={value.promptText}
          onChange={(promptText) => set({ promptText })}
          errors={errors}
        />
        {hasRecording && (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-2">
            <Mic className="mt-0.5 size-4 shrink-0 text-ink-3" {...ICON} />
            This question has a recorded voice. If you change the words, ask for a new recording.
          </p>
        )}
      </div>

      <PictureField
        field={f("promptImage")}
        label="Picture with the question"
        hint="Shown above the answers, for questions like “How many bananas?”."
        optional
        kind="answer"
        nameHint={`${nameHint} picture`}
        value={value.promptImage}
        onChange={(promptImage) => onChange((q) => setPromptImage(q, promptImage))}
        errors={errors(f("promptImage"))}
      />

      <fieldset>
        <legend className="text-[15px] font-bold text-ink">Answers</legend>
        <p className="mt-0.5 text-sm text-ink-2">
          {MIN_ANSWERS} to {MAX_ANSWERS} pictures. Choose the right one with “Right answer”.
        </p>
        <FieldErrors id={`${fieldId(f("options"))}-error`} errors={errors(f("options"))} />
        <FieldErrors id={`${fieldId(f("correctOptionId"))}-error`} errors={errors(f("correctOptionId"))} />
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option, i) => (
            <AnswerCard
              key={option.id}
              index={i}
              option={option}
              field={f(`options.${i}`)}
              groupName={`${fieldId(field)}-right`}
              correct={option.id === value.correctOptionId}
              onCorrect={() => set({ correctOptionId: option.id })}
              // By id, not position: answers can be removed while a picture is still resizing.
              onChange={(patch) => onChange((q) => changeOption(q, option.id, patch))}
              onRemove={
                options.length > MIN_ANSWERS
                  ? () => onChange((q) => (q.options.length > MIN_ANSWERS ? removeOption(q, option.id) : q))
                  : undefined
              }
              errors={errors}
              nameHint={nameHint}
              rightFieldId={i === 0 ? fieldId(f("correctOptionId")) : undefined}
            />
          ))}
        </ul>
        {options.length < MAX_ANSWERS && (
          <Button
            className="mt-3"
            icon={<Plus className="size-[18px]" {...ICON} />}
            onClick={() => onChange((q) => (q.options.length < MAX_ANSWERS ? addOption(q) : q))}
          >
            Add an answer
          </Button>
        )}
      </fieldset>

      <Field
        field={f("skill")}
        label="Skill it practices"
        hint="Parents see progress by skill."
        errors={errors(f("skill"))}
        className="max-w-md"
      >
        {(control) => (
          <Select {...control} value={value.skill} onChange={(e) => set({ skill: e.target.value })}>
            {!value.skill && <option value="">Choose a skill</option>}
            {Object.entries(skills).map(([id, label]) => (
              <option key={id} value={id}>
                {label.en}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}

function AnswerCard({
  index,
  option,
  field,
  groupName,
  correct,
  onCorrect,
  onChange,
  onRemove,
  errors,
  nameHint,
  rightFieldId,
}: {
  index: number;
  option: Option;
  field: string;
  groupName: string;
  correct: boolean;
  onCorrect: () => void;
  onChange: (patch: Partial<Option>) => void;
  onRemove?: () => void;
  errors: (field: string) => readonly string[] | undefined;
  nameHint: string;
  rightFieldId?: string;
}) {
  const { pictureSrc } = useAdmin();
  const letter = String.fromCharCode(65 + index);
  const upload = usePictureUpload("answer", `${nameHint} answer ${letter}`, (image) => onChange({ image }));
  const imageId = fieldId(`${field}.image`);
  const problems = [...(upload.error ? [upload.error] : []), ...(errors(`${field}.image`) ?? [])];
  return (
    <li
      className={clsx(
        "rounded-xl border bg-paper p-3 transition-colors",
        correct ? "border-leaf ring-1 ring-leaf/50" : "border-line",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[15px] font-bold text-ink">Answer {letter}</p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="-my-1 -mr-1 grid size-11 place-items-center rounded-lg text-ink-3 hover:bg-ink/[0.06] hover:text-play-ink"
            aria-label={`Remove answer ${letter}`}
            title={`Remove answer ${letter}`}
          >
            <Trash2 className="size-[18px]" {...ICON} />
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-3">
        <button
          id={imageId}
          type="button"
          onClick={upload.open}
          aria-label={option.image ? `Answer ${letter} picture: replace it` : `Answer ${letter}: add a picture`}
          aria-describedby={problems.length ? `${imageId}-error` : undefined}
          className={clsx(
            "group relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border bg-paper-2 transition-colors hover:border-listen",
            problems.length ? "border-play-ink" : option.image ? "border-line" : "border-dashed border-ink-3/60",
          )}
        >
          {option.image ? (
            <PictureView src={pictureSrc(option.image)} alt="" fit="contain" className="size-full p-1.5" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm font-semibold text-ink-2 group-hover:text-listen-ink">
              <ImagePlus className="size-6" {...ICON} />
              Add picture
            </span>
          )}
          {upload.busy && (
            <span className="absolute inset-0 grid place-items-center bg-paper/80">
              <LoaderCircle className="size-6 animate-spin text-ink-2" {...ICON} />
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div>
            <label htmlFor={fieldId(`${field}.label`)} className="text-sm font-semibold text-ink-2">
              What it shows
            </label>
            <TextInput
              id={fieldId(`${field}.label`)}
              value={option.label ?? ""}
              placeholder="3 mangoes"
              className="mt-1"
              onChange={(e) => onChange({ label: e.target.value || undefined })}
            />
          </div>
          <label
            className={clsx(
              "flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-[15px] font-semibold",
              correct ? "bg-leaf-soft text-leaf-ink" : "text-ink-2 hover:bg-ink/[0.05]",
            )}
          >
            <input
              id={rightFieldId}
              type="radio"
              name={groupName}
              checked={correct}
              onChange={onCorrect}
              className="size-[18px] accent-leaf"
            />
            Right answer
          </label>
        </div>
      </div>
      {upload.fileInput}
      <FieldErrors id={`${imageId}-error`} errors={problems} />
    </li>
  );
}
