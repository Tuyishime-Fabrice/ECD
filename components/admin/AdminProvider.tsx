"use client";

/**
 * Everything the dashboard screens share: the session, the stories as last saved
 * ("base") and as being edited ("draft"), new pictures waiting to be saved, problems,
 * and whether the last save is live yet. Changes stay in the draft until Save, which
 * sends everything in one save (docs/ADMIN.md).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Challenge, Content, Episode } from "@/content/schema";
import type { Site } from "@/content/site";
import { allIds, findChallenge, findSeason, findStory, picturesIn, prepareForSave, renumberStories } from "@/lib/admin/ui-content";
import { checkDraft, locate, type Located, type Target } from "@/lib/admin/ui-issues";
import { liveState, pollDelay, type LiveState } from "@/lib/admin/ui-live";
import { draftAfterSave, notesAfterSave, type Note as SavedNote } from "@/lib/admin/ui-save";
import { summarize } from "@/lib/admin/ui-summary";
import { MAX_SAVE_UPLOAD_BYTES, MAX_UPLOADS_PER_SAVE } from "@/lib/admin/uploads";
import { api, deployedSha, type ApiFailure, type SessionInfo } from "./api";

export type Snapshot = { seasons: Content; site: Site };
export type Picture = { dataUrl: string; bytes: number; pending: boolean };
export type Phase = "checking" | "setup" | "signed-out" | "loading" | "ready" | "error";
export type Toast = { id: number; tone: "success" | "info" | "error"; title: string; body?: string };
type Publish = {
  /** The save's last commit, the one with its stories. */
  commitSha: string;
  savedAt: number;
  deployedAtSave: string | null;
  /** Commits the same save made first, with pictures only (oldest first). */
  earlier?: string[];
};
type Note = { key: string; text: string };
/** A new story or challenge that isn't added yet, with its collection. Kept only while something is filled in. */
export type NewForm<T> = { value: T; seasonId: string };
export type NewForms = { story?: NewForm<Episode>; challenge?: NewForm<Challenge> };
export type NewFormKind = keyof NewForms;
type ServerIssue = Located & { value: string };

const PUBLISH_KEY = "izuba-admin:publish";
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
  /**
   * New stories and challenges being filled in. They live here, not in the editor, so
   * being signed out (or going back with the browser) doesn't lose them.
   */
  newForms: NewForms;
  updateNewForm: <K extends NewFormKind>(kind: K, change: (form: NewForms[K]) => NewForms[K]) => void;
  /** Unsaved changes, or a new story or challenge that isn't added yet. */
  unsavedWork: boolean;
  /** Set while a screen has input that leaving would lose ("story"): links then ask first. */
  leaveGuard: NewFormKind | null;
  guardLeaving: (kind: NewFormKind) => () => void;
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
  const [notes, setNotes] = useState<Map<string, SavedNote>>(() => new Map());
  const [pictures, setPictures] = useState<Record<string, Picture>>({});
  const [serverIssues, setServerIssues] = useState<ServerIssue[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  // Read on the client only; nothing that depends on it shows before the session check.
  const [publish, setPublish] = useState<Publish | null>(() => (typeof window === "undefined" ? null : readPublish()));
  const [deployed, setDeployed] = useState<string | null>(null);
  /** The last read of /build-info.json failed (offline); `deployed` is the answer before that. */
  const [buildInfoFailed, setBuildInfoFailed] = useState(false);
  const [historyShas, setHistoryShas] = useState<string[]>([]);
  const [newForms, setNewForms] = useState<NewForms>({});
  const [leaveGuard, setLeaveGuard] = useState<NewFormKind | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const toastId = useRef(0);
  /** Numbers the change notes, so a save clears only the ones written before it started. */
  const noteSeq = useRef(0);
  const savingNow = useRef(false);
  /** The draft as it is now, for a save that finishes after more edits were made. */
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(base), [draft, base]);
  const hasDraft = draft !== null;
  const unsavedWork = dirty || Boolean(newForms.story || newForms.challenge);

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
    if (note) {
      const seq = ++noteSeq.current;
      setNotes((n) => new Map(n).set(note.key, { text: note.text, seq }));
    }
  }, []);

  const updateNewForm = useCallback(
    <K extends NewFormKind>(kind: K, change: (form: NewForms[K]) => NewForms[K]) =>
      setNewForms((all) => {
        const next = change(all[kind]);
        return next === all[kind] ? all : { ...all, [kind]: next };
      }),
    [],
  );
  const guardLeaving = useCallback((kind: NewFormKind) => {
    setLeaveGuard(kind);
    return () => setLeaveGuard((g) => (g === kind ? null : g));
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

  /** Starts waiting for `commitSha`, a save's last commit; `earlier` are its picture-only commits, oldest first. */
  const startPublish = useCallback(
    (commitSha: string, earlier: string[] = []) => {
      const value: Publish = { commitSha, savedAt: Date.now(), deployedAtSave: deployed, earlier };
      setPublish(value);
      writePublish(value);
      // Newest first, like History.
      const made = [commitSha, ...[...earlier].reverse()];
      setHistoryShas((list) => [...made, ...list.filter((sha) => !made.includes(sha))]);
      setNow(Date.now());
    },
    [deployed],
  );

  const save = useCallback(async () => {
    if (!draft || !base || !prepared || saving || savingNow.current) return;
    if (localIssues.length) {
      setProblemsOpen(true);
      return;
    }
    const used = picturesIn(prepared.seasons);
    const uploads = Object.entries(pictures)
      .filter(([path, p]) => p.pending && used.has(path))
      .map(([path, p]) => ({ path, base64: p.dataUrl, bytes: p.bytes }));
    const groups = batches(uploads);
    const summary = summarize([...notes.values()].map((n) => n.text));
    // Editing goes on during the save; what changes after this point stays unsaved, on top of it.
    const sent = draft;
    const sentNotes = noteSeq.current;
    let sha = baseSha;
    /** Every commit this save makes: the app has its stories only once it is built from the last one. */
    const commits: string[] = [];
    savingNow.current = true;
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
        if (!commits.includes(sha)) commits.push(sha);
        setPictures((all) => {
          const next = { ...all };
          for (const { path } of group) if (next[path]) next[path] = { ...next[path]!, pending: false };
          return next;
        });
        if (last) {
          const changedMeanwhile = JSON.stringify(latestDraft.current) !== JSON.stringify(sent);
          // Signing out during the save clears everything; leave it cleared.
          setBase((b) => (b ? prepared : b));
          setDraft((d) => (d ? draftAfterSave(d, sent, prepared) : d));
          setBaseSha(sha);
          setNotes((n) => notesAfterSave(n, sentNotes));
          const meanwhile = changedMeanwhile
            ? "Changes you made while it was saving aren't saved yet. Press Save again to save them."
            : undefined;
          if (res.data.unchanged && groups.length === 1) {
            toast({ tone: "info", title: "Nothing new to save.", body: meanwhile ?? "Everything here is already saved." });
          } else {
            startPublish(sha, commits.filter((c) => c !== sha));
            toast({ tone: "success", title: "Saved. Live in about 2 minutes.", body: meanwhile });
          }
        }
      }
    } finally {
      savingNow.current = false;
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
    setNewForms({});
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
  // A read that fails (offline for a moment) keeps the last answer and tries again a bit later.
  const ready = phase === "ready";
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void Promise.all([deployedSha(), api.history()]).then(([info, history]) => {
      if (cancelled) return;
      if (info.ok) setDeployed(info.sha);
      setBuildInfoFailed(!info.ok);
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
    earlier: publish?.earlier,
    now,
  });
  const waiting =
    ready && (live === "going" || live === "slow" || (live === "unknown" && buildInfoFailed && publish !== null));
  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const info = await deployedSha();
      if (cancelled) return;
      failures = info.ok ? 0 : failures + 1;
      if (info.ok) setDeployed(info.sha);
      setBuildInfoFailed(!info.ok);
      setNow(Date.now());
      timer = setTimeout(poll, pollDelay(failures));
    };
    timer = setTimeout(poll, pollDelay(0));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [waiting]);

  const publishedSha = live === "live" ? publish?.commitSha : undefined;
  useEffect(() => {
    if (publishedSha) writePublish(null);
  }, [publishedSha]);

  useEffect(() => {
    if (!unsavedWork) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsavedWork]);

  const reservedIds = useMemo(() => (base ? allIds(base.seasons) : new Set<string>()), [base]);

  const value: AdminContext = {
    phase,
    session,
    loadError,
    signedOutWithChanges: phase === "signed-out" && unsavedWork,
    newForms,
    updateNewForm,
    unsavedWork,
    leaveGuard,
    guardLeaving,
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
