"use client";

/**
 * The dashboard frame: sidebar on wide screens, a top bar with a menu on phones,
 * the "Live" status, the unsaved-changes bar, messages, and the dialogs about
 * saving (problems to fix, someone else saved).
 */
import clsx from "clsx";
import {
  CircleAlert,
  CircleCheck,
  Clapperboard,
  ExternalLink,
  Gift,
  History,
  LayoutDashboard,
  Library,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/lib/brand";
import { targetHref } from "@/lib/admin/ui-issues";
import { useAdmin, type NewFormKind } from "./AdminProvider";
import { focusField } from "./editing";
import { Alert, Button, ButtonLink, ConfirmDialog, Dialog, ICON, IconButton } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/stories", label: "Stories", icon: Clapperboard },
  { href: "/admin/challenges", label: "Challenges", icon: Gift },
  { href: "/admin/collections", label: "Collections", icon: Library },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/history", label: "History", icon: History },
  { href: "/admin/help", label: "Help", icon: LifeBuoy },
] as const;

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

/** Where each kind of new item is filled in. */
const NEW_FORM: Record<NewFormKind, { href: string; noun: string }> = {
  story: { href: "/admin/stories/new", noun: "story" },
  challenge: { href: "/admin/challenges/new", noun: "challenge" },
};

/** A link to another page of this site, as a path, or null for a new tab, a download or a link within this page. */
function leavingTo(link: HTMLAnchorElement): string | null {
  if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return null; // Leaving the site: the browser asks (beforeunload).
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={clsx("flex items-center gap-2.5", className)}>
      <img src={brand.logo} alt="" className="size-8" width={32} height={32} />
      <span className="font-display text-[21px] font-extrabold leading-none tracking-tight text-ink">{brand.name}</span>
      <span className="rounded-md bg-listen/12 px-1.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.08em] text-listen-ink">
        Admin
      </span>
    </span>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
                active ? "bg-listen/12 font-bold text-listen-ink" : "text-ink-2 hover:bg-ink/[0.05] hover:text-ink",
              )}
            >
              <Icon
                className={clsx("size-5 shrink-0", active ? "text-listen-ink" : "text-ink-3 group-hover:text-ink-2")}
                {...ICON}
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="space-y-0.5 border-t border-line pt-3">
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-ink-2 hover:bg-ink/[0.05] hover:text-ink"
      >
        <ExternalLink className="size-5 text-ink-3" {...ICON} />
        Open the app
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold text-ink-2 hover:bg-ink/[0.05] hover:text-ink"
      >
        <LogOut className="size-5 text-ink-3" {...ICON} />
        Sign out
      </button>
    </div>
  );
}

/** "Going live…" or "Live ✓": whether the last save has reached the app yet. */
export function LiveChip({ className, announce = true }: { className?: string; announce?: boolean }) {
  const { live, saving } = useAdmin();
  let chip: React.ReactNode = null;
  if (saving) {
    chip = (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-[13px] font-bold text-ink-2 ring-1 ring-inset ring-line">
        <LoaderCircle className="size-3.5 animate-spin" {...ICON} />
        Saving…
      </span>
    );
  } else if (live === "going" || live === "slow") {
    chip = (
      <Link
        href="/admin/help#going-live"
        title="Your last save will show in the app in about 2 minutes."
        className="inline-flex items-center gap-2 rounded-full bg-sun-soft px-3 py-1.5 text-[13px] font-bold text-ink ring-1 ring-inset ring-sun-lip/30 hover:ring-sun-lip/60"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun-lip opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-sun-lip" />
        </span>
        {live === "slow" ? "Taking longer than usual" : "Going live…"}
      </Link>
    );
  } else if (live === "live") {
    chip = (
      <span
        title="Everything you saved is live in the app."
        className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1.5 text-[13px] font-bold text-leaf-ink"
      >
        Live
        <CircleCheck className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  return (
    <div role={announce ? "status" : undefined} className={clsx("flex items-center", className)}>
      {chip}
    </div>
  );
}

function SaveBar() {
  const { dirty, saving, save, discard, issues, changeCount, setProblemsOpen, phase } = useAdmin();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (phase !== "ready" || (!dirty && !saving)) return null;
  const problems = issues.length;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-5 lg:left-64">
        <div
          role="region"
          aria-label="Unsaved changes"
          // Dark brown in day mode; at night a lit paper bar, since a cream one would glare.
          className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-ink py-2.5 pl-4 pr-2.5 text-paper shadow-e2 sm:gap-4 sm:py-3 sm:pl-5 dark:bg-paper dark:text-ink dark:ring-1 dark:ring-listen/40"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="hidden size-2.5 shrink-0 rounded-full bg-sun sm:block" aria-hidden />
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight">
                {saving ?? (
                  <>
                    <span className="sm:hidden">Unsaved changes</span>
                    <span className="hidden sm:inline">You have unsaved changes</span>
                  </>
                )}
              </p>
              {!saving &&
                (problems ? (
                  <button
                    type="button"
                    onClick={() => setProblemsOpen(true)}
                    className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-sun underline-offset-2 hover:underline"
                  >
                    <CircleAlert className="size-3.5" {...ICON} />
                    {problems === 1 ? "1 thing to fix" : `${problems} things to fix`}
                  </button>
                ) : (
                  <p className="mt-0.5 hidden text-sm text-paper/75 sm:block dark:text-ink-2">
                    {changeCount > 1 ? `${changeCount} changes. ` : ""}Children see them after you save.
                  </p>
                ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              disabled={Boolean(saving)}
              className="min-h-11 rounded-xl px-3 font-display text-[15px] font-semibold text-paper/85 hover:bg-paper/10 hover:text-paper disabled:opacity-50 sm:px-3.5 dark:text-ink-2 dark:hover:bg-ink/10 dark:hover:text-ink"
            >
              Discard
            </button>
            <Button variant="primary" onClick={() => void save()} loading={Boolean(saving)} className="min-w-20 sm:min-w-24">
              Save
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          discard();
          setConfirmDiscard(false);
        }}
        title="Discard your changes?"
        confirmLabel="Discard changes"
      >
        Everything you changed since your last save will be lost.
      </ConfirmDialog>
    </>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useAdmin();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 flex flex-col items-center gap-2 px-3 sm:items-end sm:px-6 lg:top-20"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border border-line bg-paper py-3 pl-4 pr-2 shadow-e2"
        >
          {t.tone === "error" ? (
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-play-ink" {...ICON} />
          ) : (
            <CircleCheck className={clsx("mt-0.5 size-5 shrink-0", t.tone === "success" ? "text-leaf-ink" : "text-listen-ink")} {...ICON} />
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[15px] font-bold text-ink">{t.title}</p>
            {t.body && <p className="mt-0.5 text-sm text-ink-2">{t.body}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="-my-1 grid size-11 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ink/[0.06] hover:text-ink"
          >
            <X className="size-5" {...ICON} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ProblemsDialog({ go }: { go: (href: string) => void }) {
  const { problemsOpen, setProblemsOpen, issues } = useAdmin();
  return (
    <Dialog
      open={problemsOpen}
      onClose={() => setProblemsOpen(false)}
      wide
      title={issues.length ? "Fix these before saving" : "Ready to save"}
      description={
        issues.length
          ? "Nothing was saved yet. Fix each problem below, then press Save again."
          : "All the problems are fixed. Press Save to save your changes."
      }
      footer={<Button onClick={() => setProblemsOpen(false)}>Close</Button>}
    >
      <ul className="divide-y divide-line rounded-xl border border-line">
        {issues.map((issue, i) => {
          const href = targetHref(issue.target);
          return (
            <li key={`${issue.message}-${i}`} className="flex items-start gap-3 px-4 py-3">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-play-ink" {...ICON} />
              <p className="min-w-0 flex-1 text-[15px] text-ink">{issue.message}</p>
              {href && (
                <Button
                  size="sm"
                  onClick={() => {
                    setProblemsOpen(false);
                    go(href);
                  }}
                >
                  Fix
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

function ConflictDialog() {
  const { conflictOpen, setConflictOpen, reload, dirty } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={conflictOpen}
      onClose={() => setConflictOpen(false)}
      title="Someone else saved changes"
      description={
        <>
          Since you opened the dashboard, someone else saved changes to the stories. Reload to see them.
          {dirty && " Your unsaved changes here will be lost, so make them again after reloading."}
        </>
      }
      footer={
        <>
          <Button onClick={() => setConflictOpen(false)} disabled={busy}>
            Not now
          </Button>
          <Button
            variant="primary"
            loading={busy}
            data-autofocus
            onClick={async () => {
              setBusy(true);
              await reload();
              setBusy(false);
            }}
          >
            Reload
          </Button>
        </>
      }
    />
  );
}

/** New stories and challenges that were started but aren't added yet, shown on the other pages. */
function KeptForms() {
  const { newForms, updateNewForm } = useAdmin();
  const pathname = usePathname();
  const [throwAway, setThrowAway] = useState<NewFormKind | null>(null);
  const kept = (Object.keys(NEW_FORM) as NewFormKind[]).filter((k) => newForms[k] && pathname !== NEW_FORM[k].href);
  return (
    <>
      {kept.map((kind) => (
        <Alert
          key={kind}
          tone="info"
          className="mb-6"
          title={`Your new ${NEW_FORM[kind].noun} isn't added yet`}
          actions={
            <>
              <ButtonLink href={NEW_FORM[kind].href} size="sm" variant="primary">
                Finish it
              </ButtonLink>
              <Button size="sm" variant="ghost" onClick={() => setThrowAway(kind)}>
                Throw it away
              </Button>
            </>
          }
        >
          What you filled in is kept here until you finish it.
        </Alert>
      ))}
      <ConfirmDialog
        open={throwAway !== null}
        onCancel={() => setThrowAway(null)}
        onConfirm={() => {
          if (throwAway) updateNewForm(throwAway, () => undefined);
          setThrowAway(null);
        }}
        title={`Throw away the new ${throwAway ? NEW_FORM[throwAway].noun : "item"}?`}
        confirmLabel="Throw it away"
      >
        What you filled in will be lost.
      </ConfirmDialog>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { signOut, unsavedWork, phase, leaveGuard, updateNewForm } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  /** A page the person asked to open while a new story or challenge has input. */
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const current = NAV.find((n) => isActive(pathname, n.href));

  const open = (href: string) => {
    router.push(href);
    const hash = href.split("#")[1];
    if (hash) focusField(hash);
  };
  /** Opens a page, asking first if that would lose a half-filled new story or challenge. */
  const go = (href: string) => {
    const url = new URL(href, window.location.href);
    const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (leaveGuard && !samePage) setLeaveTo(href);
    else open(href);
  };

  // Every link (menu, back links, Cancel, the status chip) asks first while a new item has input.
  useEffect(() => {
    if (!leaveGuard) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      const href = link && leavingTo(link);
      if (!href) return;
      // Next.js links don't navigate a click whose default was prevented.
      e.preventDefault();
      setLeaveTo(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [leaveGuard]);

  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (menuOpen && !d.open) d.showModal();
    if (!menuOpen && d.open) d.close();
  }, [menuOpen]);

  const requestSignOut = () => (unsavedWork ? setConfirmSignOut(true) : void signOut());

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#admin-main"
        className="sr-only z-[60] rounded-lg bg-paper px-4 py-3 font-semibold text-ink shadow-e2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper px-3 pb-3 pt-5 lg:flex">
        <Link href="/admin" className="mb-6 flex min-h-11 items-center rounded-xl px-3" aria-label={`${brand.name} admin home`}>
          <BrandMark />
        </Link>
        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto">
          <NavList />
        </nav>
        <SidebarFooter onSignOut={requestSignOut} />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-paper px-2 sm:px-4 lg:bg-paper-2 lg:px-8">
        <IconButton
          label="Open the menu"
          icon={<Menu className="size-6" {...ICON} />}
          onClick={() => setMenuOpen(true)}
          className="lg:hidden"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
        />
        <Link href="/admin" className="flex min-h-11 items-center lg:hidden" aria-label={`${brand.name} admin home`}>
          <BrandMark />
        </Link>
        <p className="hidden items-center gap-2 text-[15px] font-semibold text-ink-2 lg:flex">
          {current && <current.icon className="size-[18px] text-ink-3" {...ICON} />}
          {current?.label}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <LiveChip />
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-ink-2 hover:bg-ink/[0.06] hover:text-ink lg:inline-flex"
          >
            Open the app
            <ExternalLink className="size-4" {...ICON} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </header>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onCancel={(e) => {
          e.preventDefault();
          setMenuOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
        className="admin-drawer m-0 h-dvh max-h-dvh w-[min(20rem,86vw)] border-r border-line bg-paper p-0 text-ink shadow-e2 backdrop:bg-black/50 lg:hidden"
      >
        {menuOpen && (
          <div className="flex h-full flex-col px-3 pb-3 pt-3">
            <div className="mb-4 flex items-center justify-between pl-3">
              <BrandMark />
              <IconButton label="Close the menu" icon={<X className="size-7" {...ICON} />} onClick={() => setMenuOpen(false)} />
            </div>
            <nav aria-label="Dashboard" className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setMenuOpen(false)} />
            </nav>
            <SidebarFooter
              onSignOut={() => {
                setMenuOpen(false);
                requestSignOut();
              }}
            />
          </div>
        )}
      </dialog>

      <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 pb-36 pt-6 focus:outline-none sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
        {phase === "loading" ? (
          <div className="flex items-center justify-center gap-3 py-24 text-ink-2" role="status">
            <LoaderCircle className="size-5 animate-spin" {...ICON} />
            <span className="font-semibold">Loading the stories…</span>
          </div>
        ) : (
          <>
            <KeptForms />
            {children}
          </>
        )}
      </main>

      <SaveBar />
      <Toasts />
      <ProblemsDialog go={go} />
      <ConflictDialog />
      <ConfirmDialog
        open={confirmSignOut}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          void signOut();
        }}
        title="Sign out without saving?"
        confirmLabel="Sign out"
      >
        You have changes that aren&apos;t saved. If you sign out now, they will be lost.
      </ConfirmDialog>
      <ConfirmDialog
        open={leaveTo !== null}
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const href = leaveTo;
          if (leaveGuard) updateNewForm(leaveGuard, () => undefined);
          setLeaveTo(null);
          if (href) open(href);
        }}
        title={`Leave without adding this ${leaveGuard ? NEW_FORM[leaveGuard].noun : "item"}?`}
        confirmLabel="Leave"
      >
        What you filled in isn&apos;t added yet. If you leave this page, it will be lost.
      </ConfirmDialog>
    </div>
  );
}
