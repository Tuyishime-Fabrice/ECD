/**
 * The few GitHub REST calls the dashboard needs, over plain fetch. The base URL
 * comes from GITHUB_API_URL so tests can point it at scripts/dev/fake-github.mjs.
 */
import { createHash } from "node:crypto";
import type { GitHubSettings } from "./env";

export class GitHubError extends Error {
  /** 0 when GitHub could not be reached at all. */
  readonly status: number;
  readonly rateLimited: boolean;
  constructor(message: string, status: number, rateLimited = false) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

/** The branch moved between reading it and updating it: someone else committed in between. */
export class BranchMovedError extends GitHubError {
  constructor() {
    super("The branch moved during the save", 409);
    this.name = "BranchMovedError";
  }
}

export type Head = { sha: string; treeSha: string };
export type CommitInfo = Head & { parents: string[]; message: string };
export type TreeEntry = { path: string; type: "blob" | "tree" | "commit"; sha: string; mode: string };
export type DirEntry = { name: string; path: string; sha: string; type: string };
export type NewFile = { path: string; bytes: Uint8Array };
export type HistoryEntry = { sha: string; summary: string; date: string };

/** The id git gives a file's content, so we can tell whether a file really changed without uploading it. */
export function gitBlobSha(bytes: Uint8Array): string {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");
const firstLine = (message: string) => message.split("\n", 1)[0]!.trim();
const TIMEOUT_MS = 20_000;

export function createGitHub(settings: GitHubSettings, fetchImpl: typeof fetch = fetch) {
  const { apiUrl, owner, repo, branch, token } = settings;
  const base = `${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "izuba-admin",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new GitHubError(`Could not reach GitHub: ${(err as Error).message}`, 0);
    }
    if (response.ok) return (await response.json()) as T;
    const detail = await response.json().then((j: { message?: string }) => j.message ?? "", () => "");
    const rateLimited =
      response.status === 429 ||
      (response.status === 403 &&
        (response.headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(detail)));
    const summary = `GitHub ${method} ${path}: ${response.status} ${detail}`.trim();
    throw new GitHubError(summary, response.status, rateLimited);
  }

  /** Runs `request`, turning "not found" into null. GitHub answers 422 for a ref that isn't a commit. */
  async function orNull<T>(request: Promise<T>): Promise<T | null> {
    try {
      return await request;
    } catch (err) {
      if (err instanceof GitHubError && (err.status === 404 || err.status === 422)) return null;
      throw err;
    }
  }

  async function headSha(): Promise<string> {
    const ref = await call<{ object: { sha: string } }>("GET", `/git/ref/heads/${encodePath(branch)}`);
    return ref.object.sha;
  }

  async function commitInfo(sha: string): Promise<CommitInfo | null> {
    const c = await orNull(
      call<{ sha: string; tree: { sha: string }; parents: { sha: string }[]; message: string }>(
        "GET",
        `/git/commits/${encodeURIComponent(sha)}`,
      ),
    );
    return c && { sha: c.sha, treeSha: c.tree.sha, parents: c.parents.map((p) => p.sha), message: c.message };
  }

  return {
    branch,

    headSha,
    commitInfo,

    async headCommit(): Promise<Head> {
      const sha = await headSha();
      const info = await commitInfo(sha);
      if (!info) throw new GitHubError(`GitHub: head commit ${sha} not found`, 404);
      return { sha, treeSha: info.treeSha };
    },

    /** A text file and its blob sha at a branch, tag or commit; null if it isn't there. */
    async readFile(path: string, ref: string): Promise<{ text: string; sha: string } | null> {
      const file = await orNull(
        call<{ type?: string; sha: string; content?: string; encoding?: string }>(
          "GET",
          `/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
        ),
      );
      if (!file || Array.isArray(file) || file.type !== "file") return null;
      let content = file.content ?? "";
      // Files over 1 MB come without content; the blob endpoint has it.
      if (file.encoding !== "base64" || !content) {
        const blob = await call<{ content: string }>("GET", `/git/blobs/${file.sha}`);
        content = blob.content;
      }
      return { text: Buffer.from(content, "base64").toString("utf8"), sha: file.sha };
    },

    /** The entries of a folder at a ref; null if the folder or ref isn't there. */
    async listDir(path: string, ref: string): Promise<DirEntry[] | null> {
      const list = await orNull(
        call<DirEntry[] | object>("GET", `/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`),
      );
      return Array.isArray(list) ? list.map(({ name, path, sha, type }) => ({ name, path, sha, type })) : null;
    },

    /** Every file and folder in a tree, recursively. */
    async tree(treeSha: string): Promise<TreeEntry[]> {
      const { tree, truncated } = await call<{ tree: TreeEntry[]; truncated: boolean }>(
        "GET",
        `/git/trees/${encodeURIComponent(treeSha)}?recursive=1`,
      );
      if (truncated) throw new GitHubError("GitHub: the repository has too many files to list", 413);
      return tree.map(({ path, type, sha, mode }) => ({ path, type, sha, mode }));
    },

    /**
     * One commit on top of `parent` with all `files`: blobs → tree (on the parent's tree)
     * → commit → move the branch, never forced. Returns the new commit sha, or null if
     * the files are already exactly like that.
     */
    async commitFiles({ parent, files, message }: { parent: Head; files: NewFile[]; message: string }) {
      if (!files.length) return null;
      const entries = [];
      for (const file of files) {
        const blob = await call<{ sha: string }>("POST", "/git/blobs", {
          content: Buffer.from(file.bytes).toString("base64"),
          encoding: "base64",
        });
        entries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      const tree = await call<{ sha: string }>("POST", "/git/trees", { base_tree: parent.treeSha, tree: entries });
      if (tree.sha === parent.treeSha) return null;
      const commit = await call<{ sha: string }>("POST", "/git/commits", {
        message,
        tree: tree.sha,
        parents: [parent.sha],
      });
      try {
        await call("PATCH", `/git/refs/heads/${encodePath(branch)}`, { sha: commit.sha, force: false });
      } catch (err) {
        // 422 "Update is not a fast forward"; some servers say 409.
        if (err instanceof GitHubError && (err.status === 422 || err.status === 409)) throw new BranchMovedError();
        throw err;
      }
      return commit.sha;
    },

    /** The newest commits on the branch that touched any of `paths`, newest first. */
    async recentCommits(paths: string[], limit = 30): Promise<HistoryEntry[]> {
      type Item = {
        sha: string;
        commit: { message: string; committer?: { date?: string }; author?: { date?: string } };
      };
      const lists = await Promise.all(
        paths.map((path) =>
          call<Item[]>(
            "GET",
            `/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`,
          ),
        ),
      );
      const bySha = new Map<string, HistoryEntry>();
      for (const item of lists.flat()) {
        const date = item.commit.committer?.date ?? item.commit.author?.date ?? "";
        bySha.set(item.sha, { sha: item.sha, summary: firstLine(item.commit.message), date });
      }
      return [...bySha.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, limit);
    },
  };
}

export type GitHub = ReturnType<typeof createGitHub>;
