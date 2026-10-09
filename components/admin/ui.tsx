"use client";

/**
 * Building blocks for the dashboard screens, in the grown-up style of
 * docs/DESIGN.md: paper cards on paper-2, line borders, listen-blue accent,
 * Baloo headings, 16px Nunito, and 44px targets.
 */
import clsx from "clsx";
import { ArrowLeft, CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { fieldId } from "@/lib/admin/ui-issues";

export const ICON = { strokeWidth: 2, "aria-hidden": true } as const;

/* ---------- Buttons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet-danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-listen-lip text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.18)] hover:bg-listen-lip/90",
  secondary: "border border-line bg-paper text-ink shadow-e1 hover:border-ink-3/40 hover:bg-paper-2",
  ghost: "text-ink-2 hover:bg-ink/[0.06] hover:text-ink",
  danger: "bg-play-lip text-white shadow-[0_1px_2px_rgb(0_0_0/0.18)] hover:bg-play-lip/90",
  "quiet-danger": "text-play-ink hover:bg-play-ink/10",
};
const SIZES: Record<Size, string> = {
  sm: "min-h-11 gap-1.5 px-3 text-[15px]",
  md: "min-h-11 gap-2 px-4 text-base",
  lg: "min-h-12 gap-2 px-5 text-[17px]",
};

export const buttonClass = (variant: Variant = "secondary", size: Size = "md", className?: string) =>
  clsx(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-xl font-display font-semibold leading-none transition-[background-color,border-color,color,transform] duration-100 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-[18px] animate-spin" {...ICON} /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: React.ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** A square icon button; `label` is read aloud and shown as a tooltip. */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(buttonClass(variant, "md", "w-11 px-0"), className)}
      {...rest}
    >
      {icon}
    </button>
  );
}

/* ---------- Layout ---------- */

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-semibold text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
        >
          <ArrowLeft className="size-4" {...ICON} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
          <h1 className="font-display text-[26px] font-bold leading-[1.15] text-ink sm:text-[30px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-base text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  className,
  children,
  as: As = "section",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "li" }) {
  return (
    <As className={clsx("rounded-2xl border border-line bg-paper shadow-e1", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  id,
  level = 2,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  id?: string;
  level?: 2 | 3;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-listen/12 text-listen-ink">{icon}</span>
        )}
        <div className="min-w-0">
          <H id={id} className="font-display text-lg font-bold leading-snug text-ink">
            {title}
          </H>
          {description && <p className="mt-0.5 text-[15px] text-ink-2">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const CardBody = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={clsx("px-5 pb-5 pt-4 sm:px-6 sm:pb-6", className)}>{children}</div>
);

export const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={clsx("text-xs font-extrabold uppercase tracking-[0.08em] text-ink-3", className)}>{children}</p>
);

/* ---------- Badges and notices ---------- */

type Tone = "live" | "soon" | "warn" | "neutral" | "info" | "danger";
const TONES: Record<Tone, string> = {
  live: "bg-leaf-soft text-leaf-ink",
  soon: "bg-berry-soft text-berry-ink",
  warn: "bg-sun-soft text-ink",
  neutral: "bg-paper-2 text-ink-2 ring-1 ring-inset ring-line",
  info: "bg-listen/12 text-listen-ink",
  danger: "bg-coral-soft text-ink",
};

export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold leading-none",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const ALERT_ICONS = { error: CircleAlert, info: Info, success: CircleCheck, warn: TriangleAlert } as const;
const ALERT_TONES = {
  error: "border-play-ink/40 bg-coral-soft text-ink [&_svg.alert-icon]:text-play-ink",
  info: "border-listen/30 bg-listen/[0.08] text-ink [&_svg.alert-icon]:text-listen-ink",
  success: "border-leaf/30 bg-leaf-soft text-ink [&_svg.alert-icon]:text-leaf-ink",
  warn: "border-sun-lip/40 bg-sun-soft text-ink [&_svg.alert-icon]:text-sun-lip",
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  actions,
  className,
  id,
  tabIndex,
}: {
  tone?: keyof typeof ALERT_ICONS;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
}) {
  const Icon = ALERT_ICONS[tone];
  return (
    <div
      id={id}
      tabIndex={tabIndex}
      role={tone === "error" ? "alert" : undefined}
      className={clsx("flex gap-3 rounded-xl border px-4 py-3.5 text-[15px]", ALERT_TONES[tone], className)}
    >
      <Icon className="alert-icon mt-0.5 size-5 shrink-0" {...ICON} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold text-ink">{title}</p>}
        {children && <div className={clsx("text-ink-2", title && "mt-0.5")}>{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-ink-3/40 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-paper-2 text-ink-3 ring-1 ring-line">{icon}</span>
      <p className="mt-3 font-display text-lg font-bold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[15px] text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-2" role="status">
      <LoaderCircle className="size-5 animate-spin" {...ICON} />
      <span className="text-[15px] font-semibold">{label}</span>
    </div>
  );
}

/* ---------- Form fields ---------- */

export const inputClass = (invalid?: boolean, className?: string) =>
  clsx(
    "block w-full min-h-11 rounded-xl border bg-paper px-3.5 py-2.5 text-base text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow] placeholder:text-ink-3 hover:border-ink-3 focus:border-listen focus:outline-none focus:ring-[3px] focus:ring-listen/30 disabled:opacity-60",
    invalid ? "border-play-ink ring-1 ring-play-ink/40" : "border-ink-3/80",
    className,
  );

export type FieldControl = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

export function FieldErrors({ id, errors }: { id: string; errors?: readonly string[] }) {
  if (!errors?.length) return null;
  return (
    <div id={id} className="mt-1.5 space-y-1">
      {errors.map((e) => (
        <p key={e} className="flex items-start gap-1.5 text-sm font-semibold text-play-ink">
          <CircleAlert className="mt-px size-4 shrink-0" {...ICON} />
          <span>{e}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * A label, the control, a hint and any problems. The control gets its id and the
 * aria attributes through `children(props)`. `field` is the dotted path problems use.
 */
export function Field({
  field,
  label,
  hint,
  errors,
  optional,
  className,
  children,
}: {
  field: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  errors?: readonly string[];
  optional?: boolean;
  className?: string;
  children: (control: FieldControl) => React.ReactNode;
}) {
  const id = fieldId(field);
  const invalid = Boolean(errors?.length);
  const describedBy = [hint ? `${id}-hint` : "", invalid ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-[15px] font-bold text-ink">
        {label}
        {optional && <span className="text-sm font-semibold text-ink-3">Optional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy || undefined, "aria-invalid": invalid || undefined })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-2">
          {hint}
        </p>
      )}
      <FieldErrors id={`${id}-error`} errors={errors} />
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} type="text" className={inputClass(Boolean(rest["aria-invalid"]), className)} {...rest} />;
});

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      className={inputClass(Boolean(rest["aria-invalid"]), clsx("min-h-24 resize-y leading-relaxed", className))}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={inputClass(
          Boolean(rest["aria-invalid"]),
          clsx("cursor-pointer appearance-none pr-10", className),
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-2"
        aria-hidden
      >
        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** English and Kinyarwanda side by side. English is required wherever there is text. */
export function Bilingual({
  field,
  label,
  hint,
  value,
  onChange,
  errors,
  multiline,
  placeholder,
}: {
  field: string;
  label: string;
  hint?: string;
  value: { en: string; rw: string };
  onChange: (value: { en: string; rw: string }) => void;
  errors: (field: string) => readonly string[] | undefined;
  multiline?: boolean;
  placeholder?: { en?: string; rw?: string };
}) {
  const Control = multiline ? TextArea : TextInput;
  return (
    <fieldset>
      <legend className="mb-1 text-[15px] font-bold text-ink">{label}</legend>
      {hint && <p className="mb-2 text-sm text-ink-2">{hint}</p>}
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {(["en", "rw"] as const).map((lang) => (
          <Field
            key={lang}
            field={`${field}.${lang}`}
            label={<span className="font-semibold text-ink-2">{lang === "en" ? "English" : "Kinyarwanda"}</span>}
            errors={errors(`${field}.${lang}`)}
          >
            {(control) => (
              <Control
                {...control}
                lang={lang}
                value={value[lang]}
                placeholder={placeholder?.[lang]}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  onChange({ ...value, [lang]: e.target.value })
                }
              />
            )}
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

/** A checkbox or radio with its label as the (44px tall) target. */
export function Choice({
  type = "checkbox",
  label,
  description,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "checkbox" | "radio";
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <label
      className={clsx(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 transition-colors hover:border-ink-3/50 has-[:checked]:border-listen has-[:checked]:bg-listen/[0.07] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-listen/30",
        className,
      )}
    >
      <input type={type} className="mt-[3px] size-[18px] shrink-0 cursor-pointer accent-listen-lip focus:outline-none" {...rest} />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-2">{description}</span>}
      </span>
    </label>
  );
}

/* ---------- Dialog ---------- */

/** A modal built on <dialog>: focus stays inside, Escape closes, the page behind is inert. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = "default",
  wide,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "danger";
  wide?: boolean;
  /** Makes the dialog a form, so Enter in a field submits it. */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const frame = "flex max-h-[calc(100dvh-2rem)] flex-col";
  const wrap = (body: React.ReactNode) =>
    onSubmit ? (
      <form onSubmit={onSubmit} noValidate className={frame}>
        {body}
      </form>
    ) : (
      <div className={frame}>{body}</div>
    );
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={clsx(
        "admin-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-line bg-paper p-0 text-ink shadow-e2 backdrop:bg-black/50",
        wide ? "max-w-2xl" : "max-w-md",
      )}
    >
      {open &&
        wrap(
          <>
          <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            {tone === "danger" && (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-soft text-play-ink">
                <TriangleAlert className="size-5" {...ICON} />
              </span>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id={titleId} className="font-display text-xl font-bold leading-snug text-ink">
                {title}
              </h2>
              {description && <div className="mt-1.5 text-[15px] text-ink-2">{description}</div>}
            </div>
            <IconButton label="Close" icon={<X className="size-5" {...ICON} />} onClick={onClose} className="-mr-2 -mt-2" />
          </div>
          {children && <div className="min-h-0 overflow-y-auto px-5 pt-4 sm:px-6">{children}</div>}
          {footer && (
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line bg-paper-2/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          )}
          {!footer && <div className="h-5 sm:h-6" />}
          </>,
        )}
    </dialog>
  );
}

/** Asks before doing something that loses work. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  children,
  confirmLabel,
  tone = "danger",
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={children}
      tone={tone}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/* ---------- Pictures ---------- */

/** A saved picture that isn't live yet can't be shown from the app; say so instead of a broken image. */
export function PictureView({
  src,
  alt,
  className,
  fit = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    return (
      <span
        className={clsx("grid place-items-center bg-paper-2 text-center text-xs font-semibold text-ink-3", className)}
        role="img"
        aria-label={src ? `${alt} (shows once live)` : `${alt} (none yet)`}
      >
        <svg viewBox="0 0 24 24" className="size-6 opacity-70" aria-hidden>
          <path
            d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(src)}
      className={clsx(fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}
