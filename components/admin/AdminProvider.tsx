"use client";

/**
 * Everything the dashboard screens share: the session, the stories as last saved
 * ("base") and as being edited ("draft"), new pictures waiting to be saved, problems,
 * and whether the last save is live yet. Changes stay in the draft until Save, which
 * sends everything in one save (docs/ADMIN.md).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Content } from "@/content/schema";
import type { Site } from "@/content/site";
import { allIds, findChallenge, findSeason, findStory, picturesIn, prepareForSave, renumberStories } from "@/lib/admin/ui-content";
import { checkDraft, locate, type Located, type Target } from "@/lib/admin/ui-issues";
import { liveState, type LiveState } from "@/lib/admin/ui-live";
import { summarize } from "@/lib/admin/ui-summary";
import { MAX_SAVE_UPLOAD_BYTES, MAX_UPLOADS_PER_SAVE } from "@/lib/admin/uploads";
import { api, deployedSha, type ApiFailure, type SessionInfo } from "./api";

export type Snapshot = { seasons: Content; site: Site };
export type Picture = { dataUrl: string; bytes: number; pending: boolean };
export type Phase = "checking" | "setup" | "signed-out" | "loading" | "ready" | "error";
export type Toast = { id: number; tone: "success" | "info" | "error"; title: string; body?: string };
type Publish = { commitSha: string; savedAt: number; deployedAtSave: string | null };
type Note = { key: string; text: string };
type ServerIssue = Located & { value: string };

const PUBLISH_KEY = "izuba-admin:publish";
const POLL_MS = 10_000;
/** Below the server's 3 MB, to leave room for rounding. */
const BATCH_BYTES = MAX_SAVE_UPLOAD_BYTES - 200_000;

const readPublish = (): Publish | null => {
  try {
    const value = JSON.parse(localStorage.getItem(PUBLISH_KEY) ?? "null") as Publish | null;
    // A save from more than a day ago is live by now, or something else went wrong that History shows.
    return value && Date.now() - value.savedAt < 86_400_000 ? value : null;
  } catch {
    return null;
  }
};
const writePublish = (value: Publish | null) => {
  try {
    if (value) localStorage.setItem(PUBLISH_KEY, JSON.stringify(value));
    else localStorage.removeItem(PUBLISH_KEY);
  } catch {
    // Private browsing: the status lasts until the page is reloaded.
  }
};

const valueAt = (root: unknown, path: (string | number)[]): unknown =>
  path.reduce<unknown>(
    (node, key) => (node && typeof node === "object" ? (node as Record<string | number, unknown>)[key] : undefined),
    root,
  );

/** The value of the field a problem is about, so a problem disappears once that field changes. */
function fieldValue(s: Snapshot, target: Target): string {
  const root =
    target.kind === "story"
      ? findStory(s.seasons, target.id)?.value
      : target.kind === "challenge"
        ? findChallenge(s.seasons, target.id)?.value
        : target.kind === "collection"
          ? findSeason(s.seasons, target.id)
          : target.kind === "settings"
            ? s.site
            : null;
  const path = target.field ? target.field.split(".").map((k) => (/^\d+$/.test(k) ? Number(k) : k)) : [];
  return JSON.stringify(valueAt(root, path)) ?? "";
}

/** Splits new pictures into groups one save can carry. */
function batches<T extends { bytes: number }>(list: T[]): T[][] {
  const out: T[][] = [[]];
  let size = 0;
  for (const item of list) {
    const current = out.at(-1)!;
    if (current.length && (current.length >= MAX_UPLOADS_PER_SAVE || size + item.bytes > BATCH_BYTES)) {
      out.push([item]);
      size = item.bytes;
    } else {
      current.push(item);
      size += item.bytes;
    }
  }
  return out;
}

type AdminContext = {
  phase: Phase;
  session: SessionInfo | null;
  loadError: string;
  /** True when the session ran out while there were unsaved changes. */
  signedOutWithChanges: boolean;
  base: Snapshot | null;
  draft: Snapshot | null;
  dirty: boolean;
  changeCount: number;
  saving: string | null;
  /** Problems with the draft (checked in the browser) plus those the server reported at the last save. */
  issues: Located[];
  live: LiveState;
  lastSavedAt: number | null;
  deployed: string | null;
  pictures: Record<string, Picture>;
  reservedIds: Set<string>;
  toasts: Toast[];
  problemsOpen: boolean;
  conflictOpen: boolean;
  edit: (change: (s: Snapshot) => Snapshot, note?: Note) => void;
  addPicture: (path: string, picture: Omit<Picture, "pending">) => void;
  pictureSrc: (path: string) => string;
  save: () => Promise<void>;
  discard: () => void;
  reload: () => Promise<void>;
  signIn: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  undo: (sha: string) => Promise<ApiFailure | null>;
  recheck: () => Promise<void>;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  setProblemsOpen: (open: boolean) => void;
  setConflictOpen: (open: boolean) => void;
  handleFailure: (failure: ApiFailure) => void;
};

const Context = createContext<AdminContext | null>(null);

export function useAdmin(): AdminContext {
  const value = useContext(Context);
  if (!value) throw new Error("useAdmin must be used inside <AdminProvider>");
  return value;
}

/** For screens that only render once the content has loaded. */
export function useDraft(): AdminContext & { draft: Snapshot; base: Snapshot } {
  const admin = useAdmin();
  if (!admin.draft || !admin.base) throw new Error("useDraft before the content loaded");
  return admin as AdminContext & { draft: Snapshot; base: Snapshot };
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [base, setBase] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<Snapshot | null>(null);
  const [baseSha, setBaseSha] = useState("");
  const [notes, setNotes] = useState<Map<string, string>>(() => new Map());
  const [pictures, setPictures] = useState<Record<string, Picture>>({});
  const [serverIssues, setServerIssues] = useState<ServerIssue[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  // Read on the client only; nothing that depends on it shows before the session check.
  const [publish, setPublish] = useState<Publish | null>(() => (typeof window === "undefined" ? null : readPublish()));
  const [deployed, setDeployed] = useState<string | null>(null);
  const [historyShas, setHistoryShas] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const toastId = useRef(0);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(base), [draft, base]);
  const hasDraft = draft !== null;

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.tone === "error" ? 10_000 : 6_000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const loadContent = useCallback(async () => {
    const res = await api.content();
    if (res.ok) {
      const loaded = { seasons: res.data.seasons, site: res.data.site };
      setBase(loaded);
      setDraft(loaded);
      setBaseSha(res.data.baseSha);
      setNotes(new Map());
      setServerIssues([]);
      setPhase("ready");
      return;
    }
    if (res.status === 401) setPhase("signed-out");
    else if (res.status === 503 && /set up/i.test(res.error)) setPhase("setup");
    else {
      setLoadError(res.error);
      setPhase("error");
    }
  }, []);

  const applySession = useCallback(
    async (res: Awaited<ReturnType<typeof api.session>>) => {
      if (!res.ok) {
        setLoadError(res.error);
        setPhase("error");
        return;
      }
      setSession(res.data);
      const { loggedIn, setup } = res.data;
      if (!setup.password) setPhase("setup");
      else if (!loggedIn) setPhase("signed-out");
      else if (!setup.github) setPhase("setup");
      else if (!hasDraft) {
        setPhase("loading");
        await loadContent();
      } else setPhase("ready");
    },
    [hasDraft, loadContent],
  );
  const recheck = useCallback(async () => applySession(await api.session()), [applySession]);

  useEffect(() => {
    void api.session().then(applySession);
    // Only once, when the dashboard opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** What every screen does with a failed request it doesn't handle itself. */
  const handleFailure = useCallback(
    (failure: ApiFailure) => {
      if (failure.status === 401) setPhase("signed-out");
      else if (failure.status === 409) setConflictOpen(true);
      else toast({ tone: "error", title: failure.error });
    },
    [toast],
  );

  const edit = useCallback((change: (s: Snapshot) => Snapshot, note?: Note) => {
    setDraft((d) => {
      if (!d) return d;
      const next = change(d);
      return next === d ? d : { seasons: renumberStories(next.seasons), site: next.site };
    });
    if (note) setNotes((n) => new Map(n).set(note.key, note.text));
  }, []);

  const addPicture = useCallback((path: string, picture: Omit<Picture, "pending">) => {
    setPictures((all) => ({ ...all, [path]: { ...picture, pending: true } }));
  }, []);

  const pictureSrc = useCallback((path: string) => pictures[path]?.dataUrl ?? path, [pictures]);

  const prepared = useMemo(() => (draft ? prepareForSave(draft.seasons, draft.site) : null), [draft]);
  const localIssues = useMemo(
    () => (prepared ? locate(prepared.seasons, checkDraft(prepared.seasons, prepared.site)) : []),
    [prepared],
  );
  const issues = useMemo(() => {
    if (!draft) return [];
    const seen = new Set(localIssues.map((i) => `${JSON.stringify(i.target)}${i.problem}`));
    const stillTrue = serverIssues.filter(
      (i) => fieldValue(draft, i.target) === i.value && !seen.has(`${JSON.stringify(i.target)}${i.problem}`),
    );
    return [...localIssues, ...stillTrue];
  }, [draft, localIssues, serverIssues]);

  const startPublish = useCallback(
    (commitSha: string) => {
      const value = { commitSha, savedAt: Date.now(), deployedAtSave: deployed };
      setPublish(value);
      writePublish(value);
      setHistoryShas((list) => (list.includes(commitSha) ? list : [commitSha, ...list]));
      setNow(Date.now());
    },
    [deployed],
  );

  const save = useCallback(async () => {
    if (!draft || !base || !prepared || saving) return;
    if (localIssues.length) {
      setProblemsOpen(true);
      return;
    }
    const used = picturesIn(prepared.seasons);
    const uploads = Object.entries(pictures)
      .filter(([path, p]) => p.pending && used.has(path))
      .map(([path, p]) => ({ path, base64: p.dataUrl, bytes: p.bytes }));
    const groups = batches(uploads);
    const summary = summarize([...notes.values()]);
    let sha = baseSha;
    setServerIssues([]);
    try {
      for (const [i, group] of groups.entries()) {
        const last = i === groups.length - 1;
        setSaving(last ? "Saving…" : `Saving pictures (${i + 1} of ${groups.length})…`);
        // Pictures that don't fit in one save go first, with the stories as they are now.
        const content = last ? prepared : base;
        const res = await api.save({
          seasons: content.seasons,
          site: content.site,
          uploads: group.map(({ path, base64 }) => ({ path, base64 })),
          summary: last ? summary : `Add pictures for “${summary}”`,
          baseSha: sha,
        });
        if (!res.ok) {
          if (res.status === 422) {
            const reported = res.issues.length
              ? res.issues
              : res.errors.map((message) => ({ file: "uploads" as const, path: [], message, problem: message }));
            setServerIssues(
              locate(content.seasons, reported).map((issue) => ({ ...issue, value: fieldValue(draft, issue.target) })),
            );
            setProblemsOpen(true);
          } else if (res.status === 413) {
            toast({ tone: "error", title: "This save is too big.", body: res.error });
          } else handleFailure(res);
          if (i > 0) setBaseSha(sha);
          return;
        }
        sha = res.data.commitSha;
        setPictures((all) => {
          const next = { ...all };
          for (const { path } of group) if (next[path]) next[path] = { ...next[path]!, pending: false };
          return next;
        });
        if (last) {
          setBase(prepared);
          setDraft(prepared);
          setBaseSha(sha);
          setNotes(new Map());
          if (res.data.unchanged && groups.length === 1) {
            toast({ tone: "info", title: "Nothing new to save.", body: "Everything here is already saved." });
          } else {
            startPublish(sha);
            toast({ tone: "success", title: "Saved. Live in about 2 minutes." });
          }
        }
      }
    } finally {
      setSaving(null);
    }
  }, [draft, base, prepared, saving, localIssues, pictures, notes, baseSha, toast, handleFailure, startPublish]);

  const discard = useCallback(() => {
    setDraft(base);
    setNotes(new Map());
    setServerIssues([]);
  }, [base]);

  const reload = useCallback(async () => {
    setConflictOpen(false);
    setPhase("loading");
    await loadContent();
    toast({ tone: "info", title: "Showing the latest saved stories." });
  }, [loadContent, toast]);

  const signIn = useCallback(
    async (password: string) => {
      const res = await api.login(password);
      if (!res.ok) {
        if (res.status === 503) await recheck();
        return res.error;
      }
      if (hasDraft) setPhase("ready");
      else {
        setPhase("loading");
        await loadContent();
      }
      return null;
    },
    [hasDraft, loadContent, recheck],
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setBase(null);
    setDraft(null);
    setNotes(new Map());
    setPictures({});
    setServerIssues([]);
    setPhase("signed-out");
  }, []);

  const undo = useCallback(
    async (sha: string) => {
      const res = await api.undo(sha, baseSha);
      if (!res.ok) {
        if (res.status === 401 || res.status === 409) handleFailure(res);
        return res;
      }
      startPublish(res.data.commitSha);
      await loadContent();
      toast({ tone: "success", title: "Undone. Live in about 2 minutes." });
      return null;
    },
    [baseSha, handleFailure, loadContent, startPublish, toast],
  );

  // Is the latest save live? Checked when the dashboard opens, then every 10 seconds until it is.
  const ready = phase === "ready";
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void Promise.all([deployedSha(), api.history()]).then(([sha, history]) => {
      if (cancelled) return;
      setDeployed(sha);
      if (history.ok) setHistoryShas(history.data.commits.map((c) => c.sha));
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const target = publish?.commitSha ?? historyShas[0] ?? null;
  const live = liveState({
    deployed,
    target,
    history: historyShas,
    deployedAtSave: publish?.deployedAtSave,
    savedAt: publish?.savedAt,
    now,
  });
  const waiting = ready && (live === "going" || live === "slow");
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      void deployedSha().then((sha) => {
        setDeployed(sha);
        setNow(Date.now());
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting]);

  const publishedSha = live === "live" ? publish?.commitSha : undefined;
  useEffect(() => {
    if (publishedSha) writePublish(null);
  }, [publishedSha]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const reservedIds = useMemo(() => (base ? allIds(base.seasons) : new Set<string>()), [base]);

  const value: AdminContext = {
    phase,
    session,
    loadError,
    signedOutWithChanges: phase === "signed-out" && dirty,
    base,
    draft,
    dirty,
    changeCount: notes.size,
    saving,
    issues,
    live,
    lastSavedAt: publish?.savedAt ?? null,
    deployed,
    pictures,
    reservedIds,
    toasts,
    problemsOpen,
    conflictOpen,
    edit,
    addPicture,
    pictureSrc,
    save,
    discard,
    reload,
    signIn,
    signOut,
    undo,
    recheck,
    toast,
    dismissToast,
    setProblemsOpen,
    setConflictOpen,
    handleFailure,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
