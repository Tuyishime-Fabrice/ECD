/**
 * Undo a save: a new commit that puts content/seasons.json and content/site.json
 * back exactly as they were just before that save. Saves made after it are undone
 * too, since the files go back as a whole. Uploaded pictures stay.
 */
import { BranchMovedError, gitBlobSha, type GitHub, type NewFile } from "./github";
import {
  blobShas,
  checkSave,
  conflict,
  CONTENT_FILES,
  contentChanged,
  contentMovedSince,
  SEASONS_FILE,
  SHA,
  SITE_FILE,
  type Outcome,
} from "./save";

export type UndoRequest = { sha: string; baseSha?: string };

export function parseUndoRequest(body: unknown): { ok: true; request: UndoRequest } | { ok: false; error: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof b.sha !== "string" || !SHA.test(b.sha)) {
    return { ok: false, error: "Say which save to undo (its full sha)." };
  }
  if (b.baseSha !== undefined && (typeof b.baseSha !== "string" || !SHA.test(b.baseSha))) {
    return { ok: false, error: "baseSha must be a full commit sha." };
  }
  return { ok: true, request: { sha: b.sha, baseSha: b.baseSha as string | undefined } };
}

/** The files to write: the old versions that differ from what is in the repository now. */
export function planUndo(
  restored: { path: string; text: string }[],
  repoFiles: ReadonlyMap<string, string>,
): NewFile[] {
  return restored
    .map((f) => ({ path: f.path, bytes: new TextEncoder().encode(f.text) }))
    .filter((f) => repoFiles.get(f.path) !== gitBlobSha(f.bytes));
}

export function undoMessage(summary: string, sha: string): string {
  const what = summary.replace(/\s+/g, " ").trim().slice(0, 80);
  return `Undo "${what}"\n\nPuts the stories and settings back to how they were before ${sha.slice(0, 7)}.`;
}

const refuse = (error: string): Outcome => ({ status: 422, body: { errors: [error] } });

export async function undoSave(gh: GitHub, { sha, baseSha }: UndoRequest): Promise<Outcome> {
  const target = await gh.commitInfo(sha);
  if (!target) return { status: 404, body: { error: "That save wasn't found. Reload the history and try again." } };
  const parent = target.parents[0];
  if (!parent) return refuse("This is the very first version, so there is nothing before it to go back to.");

  const [before, at] = await Promise.all([gh.listDir("content", parent), gh.listDir("content", sha)]);
  if (!before || !at || !contentChanged(before, at)) {
    return refuse("This save didn't change any stories or settings, so there is nothing to undo.");
  }
  const restored = (
    await Promise.all(CONTENT_FILES.map(async (path) => ({ path, file: await gh.readFile(path, parent) })))
  ).flatMap(({ path, file }) => (file ? [{ path, text: file.text }] : []));

  for (let attempt = 1; ; attempt++) {
    const head = await gh.headCommit();
    if (baseSha && (await contentMovedSince(gh, baseSha, head.sha))) return conflict();
    const repoFiles = blobShas(await gh.tree(head.treeSha));
    const files = planUndo(restored, repoFiles);
    if (!files.length) {
      return refuse("Nothing to undo: the stories and settings are already the way they were before this save.");
    }

    // The old version must still pass every check (a picture it uses may be gone now).
    const after = new Map(restored.map((f) => [f.path, f.text]));
    for (const path of CONTENT_FILES) {
      if (!after.has(path)) after.set(path, (await gh.readFile(path, head.sha))?.text ?? "null");
    }
    let seasons: unknown;
    let site: unknown;
    try {
      seasons = JSON.parse(after.get(SEASONS_FILE)!);
      site = JSON.parse(after.get(SITE_FILE)!);
    } catch {
      return refuse("The old version of the stories can't be read, so it can't be put back.");
    }
    const checked = checkSave({ seasons, site, uploads: [] }, repoFiles);
    if (!checked.ok) return { status: 422, body: { errors: checked.errors, issues: checked.issues } };

    try {
      const message = undoMessage(target.message.split("\n", 1)[0]!, sha);
      const commitSha = await gh.commitFiles({ parent: head, files, message });
      return { status: 200, body: { commitSha: commitSha ?? head.sha } };
    } catch (err) {
      if (!(err instanceof BranchMovedError)) throw err;
      if (attempt >= 2) return conflict();
    }
  }
}
