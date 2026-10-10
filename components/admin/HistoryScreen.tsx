"use client";

import { CircleCheck, History, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { friendlyDate, timeAgo } from "@/lib/admin/ui-time";
import { useDraft } from "./AdminProvider";
import { api, type HistoryEntry } from "./api";
import { Alert, Badge, Button, Card, Dialog, EmptyState, ICON, PageHeader, Spinner } from "./ui";

type Loaded = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; commits: HistoryEntry[] };

export function HistoryScreen() {
  const { handleFailure, deployed, live } = useDraft();
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [undoing, setUndoing] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await api.history();
    if (res.ok) setState({ status: "ready", commits: res.data.commits });
    else {
      if (res.status === 401) handleFailure(res);
      setState({ status: "error", error: res.error });
    }
  }, [handleFailure]);

  useEffect(() => {
    let cancelled = false;
    void api.history().then((res) => {
      if (cancelled) return;
      if (res.ok) setState({ status: "ready", commits: res.data.commits });
      else {
        if (res.status === 401) handleFailure(res);
        setState({ status: "error", error: res.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [handleFailure]);

  const commits = state.status === "ready" ? state.commits : [];
  const deployedAt = deployed ? commits.findIndex((c) => c.sha === deployed) : -1;
  const badge = (i: number) => {
    if (deployedAt >= 0) {
      if (i === deployedAt) return <Badge tone="live" icon={<CircleCheck className="size-3.5" {...ICON} />}>Live now</Badge>;
      if (i < deployedAt) return <Badge tone="warn">Going live…</Badge>;
      return null;
    }
    if (i !== 0) return null;
    if (live === "live") return <Badge tone="live" icon={<CircleCheck className="size-3.5" {...ICON} />}>Live now</Badge>;
    if (live === "going" || live === "slow") return <Badge tone="warn">Going live…</Badge>;
    return null;
  };

  return (
    <>
      <PageHeader
        title="History"
        description="Every save, newest first. Undo puts the stories and settings back to how they were before a save."
        actions={
          <Button
            icon={<RefreshCw className="size-[18px]" {...ICON} />}
            onClick={() => {
              setState({ status: "loading" });
              void load();
            }}
          >
            Refresh
          </Button>
        }
      />
      {state.status === "loading" && (
        <Card>
          <Spinner label="Loading the saves…" />
        </Card>
      )}
      {state.status === "error" && (
        <Alert tone="error" title="The history didn't load" actions={<Button onClick={() => void load()}>Try again</Button>}>
          {state.error}
        </Alert>
      )}
      {state.status === "ready" &&
        (commits.length === 0 ? (
          <EmptyState icon={<History className="size-6" {...ICON} />} title="No saves yet">
            Saves you make in the dashboard show up here.
          </EmptyState>
        ) : (
          <Card>
            <ol className="divide-y divide-line">
              {commits.map((commit, i) => (
                <li key={commit.sha} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:flex-nowrap sm:px-5">
                  <span className="relative hidden self-stretch sm:block" aria-hidden>
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line" />
                    <span className="relative mt-1.5 block size-2.5 rounded-full bg-ink-3 ring-4 ring-paper" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{commit.summary || "Saved changes"}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                      <time dateTime={commit.date} title={friendlyDate(commit.date)}>
                        {timeAgo(commit.date)}
                      </time>
                      {badge(i)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    icon={<RotateCcw className="size-[18px]" {...ICON} />}
                    onClick={() => setUndoing(i)}
                    className="ml-auto"
                  >
                    Undo this<span className="sr-only">: {commit.summary}</span>
                  </Button>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      <UndoDialog
        commits={commits}
        index={undoing}
        onClose={() => setUndoing(null)}
        onDone={() => {
          setUndoing(null);
          setState({ status: "loading" });
          void load();
        }}
      />
    </>
  );
}

function UndoDialog({
  commits,
  index,
  onClose,
  onDone,
}: {
  commits: HistoryEntry[];
  index: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { undo, dirty } = useDraft();
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const commit = index === null ? null : commits[index];
  const later = index === null ? [] : commits.slice(0, index);
  const close = () => {
    setProblems([]);
    onClose();
  };
  return (
    <Dialog
      open={commit !== null && commit !== undefined}
      onClose={busy ? () => {} : close}
      tone="danger"
      title="Undo this save?"
      description={
        <>
          {commit && (
            <span className="mb-2 block rounded-lg border border-line bg-paper-2 px-3 py-2 text-ink">
              <span className="block font-semibold">{commit.summary || "Saved changes"}</span>
              <span className="block text-sm text-ink-2">{friendlyDate(commit.date)}</span>
            </span>
          )}
          This puts the stories and settings back to how they were just before this save. Pictures you uploaded stay.
        </>
      }
      footer={
        <>
          <Button onClick={close} disabled={busy} data-autofocus>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            icon={<RotateCcw className="size-[18px]" {...ICON} />}
            onClick={async () => {
              if (!commit) return;
              setBusy(true);
              setProblems([]);
              const failure = await undo(commit.sha);
              setBusy(false);
              if (!failure) return onDone();
              if (failure.status === 409 || failure.status === 401) return close();
              setProblems(failure.errors.length ? failure.errors : [failure.error]);
            }}
          >
            {later.length ? `Undo ${later.length + 1} saves` : "Undo this save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {later.length > 0 && (
          <Alert tone="warn" title={later.length === 1 ? "The save after it is undone too" : `The ${later.length} saves after it are undone too`}>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {later.slice(0, 4).map((c) => (
                <li key={c.sha}>{c.summary || "Saved changes"}</li>
              ))}
              {later.length > 4 && <li>and {later.length - 4} more</li>}
            </ul>
          </Alert>
        )}
        {dirty && (
          <Alert tone="warn" title="Your unsaved changes will be lost">
            Save them first if you want to keep them.
          </Alert>
        )}
        <p className="text-[15px] text-ink-2">You can undo an undo from this list too. Children see the change in about 2 minutes.</p>
        {problems.length > 0 && (
          <Alert tone="error" title="This save can't be undone">
            <ul className="mt-1 space-y-1">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Alert>
        )}
      </div>
    </Dialog>
  );
}
