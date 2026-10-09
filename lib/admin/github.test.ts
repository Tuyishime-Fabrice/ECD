import { execFileSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { BranchMovedError, createGitHub, gitBlobSha, GitHubError } from "./github";

const settings = { token: "tok", owner: "Tuyishime-Fabrice", repo: "ECD", branch: "main", apiUrl: "https://api.test" };
const REPO = "https://api.test/repos/Tuyishime-Fabrice/ECD";
const sha = (c: string) => c.repeat(40);

type Call = { method: string; url: string; body: unknown; headers: Record<string, string> };

/** A fetch that records each call and answers with the next queued response. */
function recorder(responses: (Response | (() => Response))[]) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? "GET",
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: init?.headers as Record<string, string>,
    });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected call ${init?.method} ${input}`);
    return typeof next === "function" ? next() : next;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("gitBlobSha", () => {
  it("matches git's own ids", () => {
    const text = "hello\n";
    const fromGit = execFileSync("git", ["hash-object", "--stdin"], { input: text }).toString().trim();
    expect(gitBlobSha(new TextEncoder().encode(text))).toBe(fromGit);
  });
});

describe("commitFiles", () => {
  const parent = { sha: sha("a"), treeSha: sha("b") };
  const files = [
    { path: "content/seasons.json", bytes: new TextEncoder().encode("{}\n") },
    { path: "public/images/uploads/x-1.png", bytes: new Uint8Array([0x89, 0x50]) },
  ];

  it("makes blobs, then a tree on the parent's tree, then a commit, then moves the branch without forcing", async () => {
    const { calls, fetchImpl } = recorder([
      Response.json({ sha: sha("1") }, { status: 201 }),
      Response.json({ sha: sha("2") }, { status: 201 }),
      Response.json({ sha: sha("3") }, { status: 201 }),
      Response.json({ sha: sha("4") }, { status: 201 }),
      Response.json({ object: { sha: sha("4") } }),
    ]);
    const result = await createGitHub(settings, fetchImpl).commitFiles({ parent, files, message: "Add a story" });

    expect(result).toBe(sha("4"));
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `POST ${REPO}/git/blobs`,
      `POST ${REPO}/git/blobs`,
      `POST ${REPO}/git/trees`,
      `POST ${REPO}/git/commits`,
      `PATCH ${REPO}/git/refs/heads/main`,
    ]);
    expect(calls[0]!.body).toEqual({ content: Buffer.from("{}\n").toString("base64"), encoding: "base64" });
    expect(calls[1]!.body).toEqual({ content: "iVA=", encoding: "base64" });
    expect(calls[2]!.body).toEqual({
      base_tree: sha("b"),
      tree: [
        { path: "content/seasons.json", mode: "100644", type: "blob", sha: sha("1") },
        { path: "public/images/uploads/x-1.png", mode: "100644", type: "blob", sha: sha("2") },
      ],
    });
    expect(calls[3]!.body).toEqual({ message: "Add a story", tree: sha("3"), parents: [sha("a")] });
    expect(calls[4]!.body).toEqual({ sha: sha("4"), force: false });
    expect(calls[0]!.headers).toMatchObject({ Authorization: "Bearer tok", "X-GitHub-Api-Version": "2022-11-28" });
  });

  it("makes no commit when the tree comes out the same", async () => {
    const { calls, fetchImpl } = recorder([
      Response.json({ sha: sha("1") }, { status: 201 }),
      Response.json({ sha: sha("b") }, { status: 201 }),
    ]);
    const result = await createGitHub(settings, fetchImpl).commitFiles({ parent, files: files.slice(0, 1), message: "m" });
    expect(result).toBeNull();
    expect(calls).toHaveLength(2);
  });

  it("makes no requests for no files", async () => {
    const { calls, fetchImpl } = recorder([]);
    expect(await createGitHub(settings, fetchImpl).commitFiles({ parent, files: [], message: "m" })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("reports a branch that moved in the meantime", async () => {
    const { fetchImpl } = recorder([
      Response.json({ sha: sha("1") }, { status: 201 }),
      Response.json({ sha: sha("3") }, { status: 201 }),
      Response.json({ sha: sha("4") }, { status: 201 }),
      Response.json({ message: "Update is not a fast forward" }, { status: 422 }),
    ]);
    await expect(
      createGitHub(settings, fetchImpl).commitFiles({ parent, files: files.slice(0, 1), message: "m" }),
    ).rejects.toBeInstanceOf(BranchMovedError);
  });
});

describe("reading", () => {
  it("reads the head commit and its tree", async () => {
    const { calls, fetchImpl } = recorder([
      Response.json({ object: { sha: sha("c") } }),
      Response.json({ sha: sha("c"), tree: { sha: sha("d") }, parents: [], message: "m" }),
    ]);
    expect(await createGitHub({ ...settings, branch: "release/v1" }, fetchImpl).headCommit()).toEqual({ sha: sha("c"), treeSha: sha("d") });
    expect(calls[0]!.url).toBe(`${REPO}/git/ref/heads/release/v1`);
  });

  it("reads a file and its blob sha at a ref, and null when it isn't there", async () => {
    const { calls, fetchImpl } = recorder([
      Response.json({ type: "file", sha: sha("e"), encoding: "base64", content: "eyJhIjox\nfQo=\n" }),
      Response.json({ message: "Not Found" }, { status: 404 }),
    ]);
    const gh = createGitHub(settings, fetchImpl);
    expect(await gh.readFile("content/site.json", sha("c"))).toEqual({ text: '{"a":1}\n', sha: sha("e") });
    expect(calls[0]!.url).toBe(`${REPO}/contents/content/site.json?ref=${sha("c")}`);
    expect(await gh.readFile("content/nope.json", "main")).toBeNull();
  });

  it("reads big files through the blob endpoint", async () => {
    const { calls, fetchImpl } = recorder([
      Response.json({ type: "file", sha: sha("e"), encoding: "none", content: "" }),
      Response.json({ content: Buffer.from("big").toString("base64") }),
    ]);
    expect(await createGitHub(settings, fetchImpl).readFile("content/seasons.json", "main")).toEqual({ text: "big", sha: sha("e") });
    expect(calls[1]!.url).toBe(`${REPO}/git/blobs/${sha("e")}`);
  });

  it("merges history for several paths, newest first, without repeats", async () => {
    const item = (s: string, date: string, message: string) => ({ sha: s, commit: { message, committer: { date } } });
    const { calls, fetchImpl } = recorder([
      Response.json([item(sha("3"), "2026-10-03T00:00:00Z", "Three\n\nbody"), item(sha("1"), "2026-10-01T00:00:00Z", "One")]),
      Response.json([item(sha("3"), "2026-10-03T00:00:00Z", "Three\n\nbody"), item(sha("2"), "2026-10-02T00:00:00Z", "Two")]),
    ]);
    const history = await createGitHub(settings, fetchImpl).recentCommits(["content/seasons.json", "public/images/uploads"], 2);
    expect(history).toEqual([
      { sha: sha("3"), summary: "Three", date: "2026-10-03T00:00:00Z" },
      { sha: sha("2"), summary: "Two", date: "2026-10-02T00:00:00Z" },
    ]);
    expect(calls[1]!.url).toBe(`${REPO}/commits?sha=main&path=public%2Fimages%2Fuploads&per_page=2`);
  });
});

describe("errors", () => {
  it("keeps the status, and spots rate limits", async () => {
    const { fetchImpl } = recorder([
      new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 }),
      new Response(JSON.stringify({ message: "API rate limit exceeded" }), { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    ]);
    const gh = createGitHub(settings, fetchImpl);
    await expect(gh.headSha()).rejects.toMatchObject({ status: 401, rateLimited: false });
    await expect(gh.headSha()).rejects.toMatchObject({ status: 403, rateLimited: true });
  });

  it("uses status 0 when GitHub can't be reached", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const err = await createGitHub(settings, fetchImpl).headSha().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect((err as GitHubError).status).toBe(0);
  });
});
