"use client";

import clsx from "clsx";
import { Lock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/store";

const HOLD_MS = 3000;
const R = 54;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Press-and-hold for 3 seconds. Text only (no voice), so a young child
 * can't follow the instruction. Letting go early starts over.
 */
export function ParentGate({
  onPass,
  onCancel,
  titleId: titleIdProp,
  className,
}: {
  onPass: () => void;
  onCancel?: () => void;
  /** Lets a surrounding dialog point aria-labelledby at the heading. */
  titleId?: string;
  className?: string;
}) {
  const t = useT();
  const ownId = useId();
  const titleId = titleIdProp ?? ownId;
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(0);
  };

  const start = () => {
    if (frame.current !== null) return;
    startedAt.current = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - startedAt.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        frame.current = null;
        onPass();
        return;
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return (
    <div className={clsx("flex flex-col items-center gap-5 text-center", className)}>
      <h2 id={titleId} className="font-display text-2xl font-bold text-ink-900">
        {t("gateTitle")}
      </h2>
      <p className="max-w-xs text-lg text-ink-900">{t("gateInstruction")}</p>
      <button
        type="button"
        aria-label={t("gateInstruction")}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") stop();
        }}
        onBlur={stop}
        onContextMenu={(e) => e.preventDefault()}
        className="relative grid size-36 touch-none select-none place-items-center rounded-full bg-grape-100 [-webkit-touch-callout:none]"
      >
        <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={R} fill="none" className="stroke-white" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            className="stroke-grape-700"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <Lock className="relative size-10 text-grape-700" strokeWidth={2.5} aria-hidden />
      </button>
      <p className="text-base text-ink-600" aria-live="polite">
        {progress > 0 ? `${Math.ceil((1 - progress) * (HOLD_MS / 1000))}…` : t("gateHint")}
      </p>
      {onCancel && (
        <button type="button" onClick={onCancel} className="min-h-12 rounded-full px-6 text-base font-semibold text-ink-600 underline">
          {t("cancel")}
        </button>
      )}
    </div>
  );
}

/** The gate as a modal dialog, e.g. to add time from the Time's Up screen. */
export function ParentGateDialog({ onPass, onClose }: { onPass: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Keep keyboard focus inside the dialog.
      if (e.key === "Tab" && ref.current) {
        const buttons = [...ref.current.querySelectorAll<HTMLButtonElement>("button")];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        const inside = ref.current.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/60 p-4" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-card bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <ParentGate onPass={onPass} onCancel={onClose} titleId={titleId} />
      </div>
    </div>
  );
}
