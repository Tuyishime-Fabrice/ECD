/**
 * A fake GitHub API for trying the admin dashboard locally, without a token or
 * the internet. It keeps an in-memory git repository (real blob ids, so the
 * dashboard's "did this file change?" checks work), seeded from this working
 * tree's content/*.json and public/, and answers only the endpoints that
 * lib/admin/github.ts uses. It also stands in for YouTube's oEmbed and thumbnails.
 *
 *   node scripts/dev/fake-github.mjs            # http://127.0.0.1:4010
 *   FAKE_GITHUB_PORT=5000 node scripts/dev/fake-github.mjs
 *
 * Then run the app with GITHUB_API_URL=http://127.0.0.1:4010 GITHUB_TOKEN=test-token
 * (see docs/ADMIN.md, "Trying it locally").
 *
 * Extra endpoint for tests: POST /__fake/commit { message, files: { "content/site.json": "…text…" } }
 * commits as "someone else". Video ids starting with "NoEmbed" answer like a video
 * whose owner disabled embedding, "Missing" like a deleted one, "LowRes" have no
 * maxresdefault picture.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = new Set(["public/sw.js", "public/build-info.json"]);

/** content/*.json and every file in public/ (minus build output), as { "repo/path": Buffer }. */
export function seedFromWorkingTree(root = fileURLToPath(new URL("../../", import.meta.url))) {
  const files = {};
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  for (const full of [...walk(join(root, "public")), ...walk(join(root, "content"))]) {
    const path = relative(root, full).split(sep).join("/");
    if (SKIP.has(path) || (path.startsWith("content/") && !path.endsWith(".json"))) continue;
    files[path] = readFileSync(full);
  }
  return files;
}

const sha1 = (...parts) => {
  const hash = createHash("sha1");
  for (const p of parts) hash.update(p);
  return hash.digest("hex");
};

/**
 * @param {{ files?: Record<string, Buffer | string>, token?: string, repo?: string, branch?: string }} [options]
 */
export function createFakeGitHub(options = {}) {
  const { token = "test-token", repo = "Tuyishime-Fabrice/ECD", branch = "main" } = options;
  const blobs = new Map(); // sha → Buffer
  const trees = new Map(); // sha → [{ name, mode, type, sha }]
  const commits = new Map(); // sha → { tree, parents, message, date }
  const refs = new Map(); // branch → commit sha
  let clock = Date.parse("2026-01-01T08:00:00Z");
  /** Every API request, for tests: "METHOD /path". */
  const log = [];

  const putBlob = (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const sha = sha1(`blob ${buf.length}\0`, buf);
    blobs.set(sha, buf);
    return sha;
  };

  const putTree = (entries) => {
    // git's order: names compared as bytes, folders as if they ended in "/".
    const key = (e) => (e.type === "tree" ? `${e.name}/` : e.name);
    const sorted = [...entries].sort((a, b) => Buffer.compare(Buffer.from(key(a)), Buffer.from(key(b))));
    const body = Buffer.concat(
      sorted.map((e) => Buffer.concat([Buffer.from(`${e.mode} ${e.name}\0`), Buffer.from(e.sha, "hex")])),
    );
    const sha = sha1(`tree ${body.length}\0`, body);
    trees.set(sha, sorted);
    return sha;
  };

  /** { "a/b.txt": { sha, mode } } → nested trees; returns the root tree sha. */
  const treeFromFlat = (flat) => {
    const here = new Map();
    const sub = new Map();
    for (const [path, entry] of Object.entries(flat)) {
      const slash = path.indexOf("/");
      if (slash < 0) here.set(path, entry);
      else {
        const dir = path.slice(0, slash);
        if (!sub.has(dir)) sub.set(dir, {});
        sub.get(dir)[path.slice(slash + 1)] = entry;
      }
    }
    const entries = [...here].map(([name, e]) => ({ name, mode: e.mode, type: "blob", sha: e.sha }));
    for (const [name, inner] of sub) entries.push({ name, mode: "040000", type: "tree", sha: treeFromFlat(inner) });
    return putTree(entries);
  };

  /** Root tree sha → [{ path, mode, type, sha }] for every file and folder. */
  const walkTree = (treeSha, prefix = "") =>
    (trees.get(treeSha) ?? []).flatMap((e) => {
      const path = prefix + e.name;
      const self = { path, mode: e.mode, type: e.type, sha: e.sha };
      return e.type === "tree" ? [self, ...walkTree(e.sha, `${path}/`)] : [self];
    });

  const flatBlobs = (treeSha) =>
    Object.fromEntries(
      walkTree(treeSha)
        .filter((e) => e.type === "blob")
        .map((e) => [e.path, { sha: e.sha, mode: e.mode }]),
    );

  const putCommit = (tree, parents, message) => {
    clock += 60_000;
    const date = new Date(clock).toISOString();
    const who = `Fake <fake@example.com> ${Math.floor(clock / 1000)} +0000`;
    const parentLines = parents.map((p) => `parent ${p}\n`).join("");
    const body = `tree ${tree}\n${parentLines}author ${who}\ncommitter ${who}\n\n${message}`;
    const sha = sha1(`commit ${Buffer.byteLength(body)}\0`, body);
    commits.set(sha, { tree, parents, message, date });
    return sha;
  };

  const resolveRef = (ref) => (refs.has(ref) ? refs.get(ref) : commits.has(ref) ? ref : null);

  /** The object at `path` in a commit's tree: { type, sha, mode } or null. */
  const lookup = (commitSha, path) => {
    let entry = { type: "tree", sha: commits.get(commitSha).tree, mode: "040000" };
    for (const name of path.split("/").filter(Boolean)) {
      if (entry.type !== "tree") return null;
      entry = trees.get(entry.sha).find((e) => e.name === name);
      if (!entry) return null;
    }
    return entry;
  };

  const isAncestor = (ancestor, sha) => {
    const queue = [sha];
    const seen = new Set();
    while (queue.length) {
      const next = queue.shift();
      if (next === ancestor) return true;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(...(commits.get(next)?.parents ?? []));
    }
    return false;
  };

  const commitJson = (sha) => {
    const c = commits.get(sha);
    const person = { name: "Fake", email: "fake@example.com", date: c.date };
    const parents = c.parents.map((p) => ({ sha: p }));
    return { sha, tree: { sha: c.tree }, parents, message: c.message, author: person, committer: person };
  };

  /** Commits on top of the branch, like someone else pushing. */
  const commitOnBranch = (files, message) => {
    const head = refs.get(branch);
    const flat = flatBlobs(commits.get(head).tree);
    for (const [path, data] of Object.entries(files)) {
      if (data === null) delete flat[path];
      else flat[path] = { sha: putBlob(data), mode: "100644" };
    }
    const sha = putCommit(treeFromFlat(flat), [head], message);
    refs.set(branch, sha);
    return sha;
  };

  {
    const seed = options.files ?? seedFromWorkingTree();
    const flat = Object.fromEntries(
      Object.entries(seed).map(([p, data]) => [p, { sha: putBlob(data), mode: "100644" }]),
    );
    refs.set(branch, putCommit(treeFromFlat(flat), [], "Initial commit"));
  }

  const reply = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
  const notFound = (message = "Not Found") => reply(404, { message });

  async function handle(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = decodeURIComponent(url.pathname);

    // --- YouTube stand-ins ---
    if (path === "/oembed") {
      const id = /[?&]v=([A-Za-z0-9_-]{11})/.exec(url.searchParams.get("url") ?? "")?.[1];
      if (!id || id.startsWith("Missing")) return new Response("Not Found", { status: 404 });
      if (id.startsWith("NoEmbed")) return new Response("Unauthorized", { status: 401 });
      return reply(200, { title: `Fake video ${id}`, author_name: "Fake channel", type: "video" });
    }
    const thumb = /^\/vi\/([A-Za-z0-9_-]{11})\/(maxresdefault|hqdefault)\.jpg$/.exec(path);
    if (thumb) {
      if (thumb[2] === "maxresdefault" && thumb[1].startsWith("LowRes")) return new Response("", { status: 404 });
      // A tiny real JPEG (1×1, grey).
      const jpeg = Buffer.from(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
        "base64",
      );
      return new Response(jpeg, { status: 200, headers: { "Content-Type": "image/jpeg" } });
    }

    // --- Test helper ---
    if (path === "/__fake/commit" && method === "POST") {
      const { files = {}, message = "Someone else's change" } = await request.json();
      return reply(201, { sha: commitOnBranch(files, message) });
    }

    // --- GitHub REST ---
    const match = /^\/repos\/([^/]+\/[^/]+)(\/.*)$/.exec(path);
    if (!match) return notFound();
    if (request.headers.get("authorization") !== `Bearer ${token}`) return reply(401, { message: "Bad credentials" });
    if (match[1] !== repo) return notFound();
    const route = match[2];
    log.push(`${method} ${route}`);
    const body = method === "GET" ? null : await request.json().catch(() => null);
    let m;

    if (method === "GET" && (m = /^\/git\/ref\/heads\/(.+)$/.exec(route))) {
      const sha = refs.get(m[1]);
      return sha ? reply(200, { ref: `refs/heads/${m[1]}`, object: { sha, type: "commit" } }) : notFound();
    }
    if (method === "PATCH" && (m = /^\/git\/refs\/heads\/(.+)$/.exec(route))) {
      const current = refs.get(m[1]);
      if (!current) return reply(422, { message: "Reference does not exist" });
      if (!body?.sha || !commits.has(body.sha)) return reply(422, { message: "Object does not exist" });
      if (!body.force && !isAncestor(current, body.sha)) return reply(422, { message: "Update is not a fast forward" });
      refs.set(m[1], body.sha);
      return reply(200, { ref: `refs/heads/${m[1]}`, object: { sha: body.sha, type: "commit" } });
    }
    if (method === "GET" && (m = /^\/git\/commits\/([0-9a-f]{40})$/.exec(route))) {
      return commits.has(m[1]) ? reply(200, commitJson(m[1])) : notFound();
    }
    if (method === "POST" && route === "/git/commits") {
      const { message, tree, parents = [] } = body ?? {};
      if (!trees.has(tree) || !parents.every((p) => commits.has(p)) || typeof message !== "string") {
        return reply(422, { message: "Invalid tree or parents" });
      }
      return reply(201, commitJson(putCommit(tree, parents, message)));
    }
    if (method === "POST" && route === "/git/blobs") {
      const { content, encoding = "utf-8" } = body ?? {};
      if (typeof content !== "string") return reply(422, { message: "content is missing" });
      const sha = putBlob(Buffer.from(content, encoding === "base64" ? "base64" : "utf8"));
      return reply(201, { sha, url: `${url.origin}/repos/${repo}/git/blobs/${sha}` });
    }
    if (method === "GET" && (m = /^\/git\/blobs\/([0-9a-f]{40})$/.exec(route))) {
      const data = blobs.get(m[1]);
      return data
        ? reply(200, { sha: m[1], size: data.length, encoding: "base64", content: data.toString("base64") })
        : notFound();
    }
    if (method === "POST" && route === "/git/trees") {
      const { base_tree: baseTree, tree = [] } = body ?? {};
      if (baseTree && !trees.has(baseTree)) return reply(422, { message: "base_tree is not a tree" });
      const flat = baseTree ? flatBlobs(baseTree) : {};
      for (const e of tree) {
        if (e.sha === null) delete flat[e.path];
        else if (typeof e.content === "string") flat[e.path] = { sha: putBlob(e.content), mode: e.mode ?? "100644" };
        else if (blobs.has(e.sha)) flat[e.path] = { sha: e.sha, mode: e.mode ?? "100644" };
        else return reply(422, { message: `tree.sha ${e.sha} is not a valid blob` });
      }
      const sha = treeFromFlat(flat);
      return reply(201, { sha, tree: trees.get(sha), truncated: false });
    }
    if (method === "GET" && (m = /^\/git\/trees\/([0-9a-f]{40})$/.exec(route))) {
      if (!trees.has(m[1])) return notFound();
      const entries = url.searchParams.get("recursive")
        ? walkTree(m[1])
        : trees.get(m[1]).map((e) => ({ path: e.name, mode: e.mode, type: e.type, sha: e.sha }));
      const tree = entries.map((e) => ({ ...e, size: e.type === "blob" ? blobs.get(e.sha).length : undefined }));
      return reply(200, { sha: m[1], tree, truncated: false });
    }
    if (method === "GET" && (m = /^\/contents\/?(.*)$/.exec(route))) {
      const ref = resolveRef(url.searchParams.get("ref") ?? branch);
      if (!ref) return notFound(`No commit found for the ref ${url.searchParams.get("ref")}`);
      const entry = lookup(ref, m[1]);
      if (!entry) return notFound();
      if (entry.type === "blob") {
        const data = blobs.get(entry.sha);
        const name = m[1].split("/").pop();
        // GitHub wraps base64 at 60 characters.
        const content = data.toString("base64").replace(/.{60}/g, "$&\n");
        const size = data.length;
        return reply(200, { type: "file", name, path: m[1], sha: entry.sha, size, encoding: "base64", content });
      }
      return reply(
        200,
        trees.get(entry.sha).map((e) => ({
          type: e.type === "tree" ? "dir" : "file",
          name: e.name,
          path: m[1] ? `${m[1]}/${e.name}` : e.name,
          sha: e.sha,
          size: e.type === "blob" ? blobs.get(e.sha).length : 0,
        })),
      );
    }
    if (method === "GET" && route === "/commits") {
      let sha = resolveRef(url.searchParams.get("sha") ?? branch);
      if (!sha) return notFound();
      const filter = url.searchParams.get("path");
      const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 30), 100);
      const out = [];
      // First-parent history, keeping commits that changed `path`.
      while (sha && out.length < perPage) {
        const c = commits.get(sha);
        const parent = c.parents[0];
        const changed = !filter || lookup(sha, filter)?.sha !== (parent ? lookup(parent, filter)?.sha : undefined);
        if (changed) {
          const { author, committer, parents } = commitJson(sha);
          out.push({ sha, commit: { message: c.message, author, committer }, parents });
        }
        sha = parent;
      }
      return reply(200, out);
    }
    return notFound(`Fake GitHub does not support ${method} ${route}`);
  }

  return {
    handle,
    log,
    headSha: () => refs.get(branch),
    /** A file's text at the branch head (or any ref), or null. */
    readText(path, ref = branch) {
      const sha = resolveRef(ref);
      const entry = sha && lookup(sha, path);
      return entry && entry.type === "blob" ? blobs.get(entry.sha).toString("utf8") : null;
    },
    commitOnBranch,
  };
}

/** Serves `fake.handle` over HTTP. */
export function serveFakeGitHub(fake, port = 4010, host = "127.0.0.1") {
  const server = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const headers = new Headers();
      for (const name of ["authorization", "content-type", "accept"]) {
        if (req.headers[name]) headers.set(name, String(req.headers[name]));
      }
      const request = new Request(`http://${host}:${port}${req.url}`, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
      });
      const response = await fake.handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      console.log(`${req.method} ${req.url} → ${response.status}`);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: String(err) }));
    }
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.FAKE_GITHUB_PORT ?? 4010);
  const token = process.env.FAKE_GITHUB_TOKEN ?? "test-token";
  if (!existsSync(fileURLToPath(new URL("../../content/seasons.json", import.meta.url)))) {
    console.error("content/seasons.json was not found next to this script.");
    process.exit(1);
  }
  const fake = createFakeGitHub({
    token,
    repo: process.env.GITHUB_REPO ?? "Tuyishime-Fabrice/ECD",
    branch: process.env.GITHUB_BRANCH ?? "main",
  });
  await serveFakeGitHub(fake, port);
  console.log(`Fake GitHub on http://127.0.0.1:${port} (token "${token}", head ${fake.headSha().slice(0, 7)})`);
  console.log(
    `Run the app with: GITHUB_API_URL=http://127.0.0.1:${port} GITHUB_TOKEN=test-token ` +
      `YOUTUBE_OEMBED_URL=http://127.0.0.1:${port}/oembed YOUTUBE_THUMBNAIL_URL=http://127.0.0.1:${port}/vi`,
  );
}
