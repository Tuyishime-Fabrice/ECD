/**
 * The real /api/admin route handlers, with fetch going to the in-memory fake GitHub.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as content } from "@/app/api/admin/content/route";
import { GET as history } from "@/app/api/admin/history/route";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { POST as save } from "@/app/api/admin/save/route";
import { GET as session } from "@/app/api/admin/session/route";
import { POST as undo } from "@/app/api/admin/undo/route";
import { GET as youtube } from "@/app/api/admin/youtube/route";
import { createFakeGitHub, seedFromWorkingTree, type FakeGitHub } from "../../scripts/dev/fake-github.mjs";
import { createSessionToken } from "./session";

const PASSWORD = "correct horse battery";
const ORIGIN = "http://localhost:4173";
const seed = seedFromWorkingTree();
let fake: FakeGitHub;

beforeEach(() => {
  fake = createFakeGitHub({ files: seed });
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => fake.handle(new Request(input, init)));
  vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
  vi.stubEnv("ADMIN_SESSION_SECRET", "");
  vi.stubEnv("GITHUB_TOKEN", "test-token");
  vi.stubEnv("GITHUB_API_URL", "http://fake.test");
  vi.stubEnv("YOUTUBE_OEMBED_URL", "http://fake.test/oembed");
  vi.stubEnv("YOUTUBE_THUMBNAIL_URL", "http://fake.test/vi");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function request(method: string, path: string, options: { body?: unknown; cookie?: string; origin?: string | null; type?: string } = {}) {
  const headers: Record<string, string> = { host: "localhost:4173" };
  if (options.cookie) headers.cookie = options.cookie;
  if (method !== "GET") {
    if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
    headers["content-type"] = options.type ?? "application/json";
  }
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: options.body === undefined ? (method === "GET" ? undefined : "{}") : JSON.stringify(options.body),
  });
}

async function signIn(): Promise<string> {
  const res = await login(request("POST", "/api/admin/login", { body: { password: PASSWORD } }));
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0]!;
}

describe("admin API", () => {
  it("runs the whole flow: sign in → content → save → history → undo", async () => {
    const cookie = await signIn();

    const loaded = await content(request("GET", "/api/admin/content", { cookie }));
    expect(loaded.status).toBe(200);
    const { seasons, site, baseSha } = await loaded.json();
    expect(baseSha).toBe(fake.headSha());
    expect(seasons.seasons.length).toBeGreaterThan(0);

    site.contact.whatsapp = "+250 781 234 567";
    const saved = await save(request("POST", "/api/admin/save", { cookie, body: { seasons, site, uploads: [], summary: "Add the WhatsApp number", baseSha } }));
    expect(saved.status).toBe(200);
    const { commitSha } = await saved.json();
    expect(commitSha).toBe(fake.headSha());

    const listed = await (await history(request("GET", "/api/admin/history", { cookie }))).json();
    expect(listed.commits[0]).toEqual({ sha: commitSha, summary: "Add the WhatsApp number", date: expect.any(String) });

    const undone = await undo(request("POST", "/api/admin/undo", { cookie, body: { sha: commitSha } }));
    expect(undone.status).toBe(200);
    const after = await (await content(request("GET", "/api/admin/content", { cookie }))).json();
    expect(after.site.contact.whatsapp).toBe("");
    expect(after.baseSha).toBe((await undone.json()).commitSha);
  });

  it("marks every reply no-store", async () => {
    const cookie = await signIn();
    const replies = await Promise.all([
      session(request("GET", "/api/admin/session")),
      content(request("GET", "/api/admin/content")),
      content(request("GET", "/api/admin/content", { cookie })),
      save(request("POST", "/api/admin/save", { cookie, origin: "https://evil.example" })),
      logout(request("POST", "/api/admin/logout")),
    ]);
    for (const res of replies) expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses everything but login and session without a valid cookie", async () => {
    const expired = `izuba_admin=${createSessionToken(`izuba-admin-session\n${PASSWORD}`, Date.now() - 8 * 86400_000)}`;
    for (const cookie of [undefined, "izuba_admin=forged.value", expired]) {
      const replies = await Promise.all([
        content(request("GET", "/api/admin/content", { cookie })),
        history(request("GET", "/api/admin/history", { cookie })),
        youtube(request("GET", "/api/admin/youtube?url=x", { cookie })),
        save(request("POST", "/api/admin/save", { cookie })),
        undo(request("POST", "/api/admin/undo", { cookie })),
      ]);
      for (const res of replies) {
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "Please sign in again." });
      }
    }
    expect(fake.log).toEqual([]);
  });

  it("needs same-origin JSON for anything that changes state", async () => {
    const cookie = await signIn();
    const cases = [
      { origin: "https://evil.example", status: 403 },
      { origin: null, status: 403 },
      { origin: "http://localhost:4173.evil.example", status: 403 },
      { type: "text/plain", status: 415 },
      { type: "application/x-www-form-urlencoded", status: 415 },
    ];
    for (const { status, ...options } of cases) {
      for (const handler of [save, undo, logout, login]) {
        const res = await handler(request("POST", "/api/admin/x", { cookie, ...options }));
        expect(res.status, JSON.stringify(options)).toBe(status);
      }
    }
  });

  it("waits before answering a wrong password and sets no cookie", async () => {
    vi.useFakeTimers();
    const pending = login(request("POST", "/api/admin/login", { body: { password: "nope" } }));
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(799);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const res = await pending;
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.json()).toEqual({ error: "That password isn't right. Try again." });
  });

  it("sets a strict, HttpOnly cookie and reports the session", async () => {
    const res = await login(request("POST", "/api/admin/login", { body: { password: PASSWORD } }));
    expect(res.headers.get("set-cookie")).toMatch(/^izuba_admin=[\w-]+\.[\w-]{43}; Path=\/; Max-Age=604800; HttpOnly; SameSite=Strict$/);
    const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
    expect(await (await session(request("GET", "/api/admin/session", { cookie }))).json()).toEqual({
      loggedIn: true,
      setup: { password: true, github: true, problems: [] },
    });
    const out = await logout(request("POST", "/api/admin/logout", { cookie }));
    expect(out.headers.get("set-cookie")).toMatch(/^izuba_admin=; Path=\/; Max-Age=0;/);
  });

  it("marks the cookie Secure in production, except on localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const local = await login(request("POST", "/api/admin/login", { body: { password: PASSWORD } }));
    expect(local.headers.get("set-cookie")).not.toMatch(/Secure/);
    const live = await login(
      new Request("https://izuba.example/api/admin/login", {
        method: "POST",
        headers: { host: "izuba.example", origin: "https://izuba.example", "content-type": "application/json" },
        body: JSON.stringify({ password: PASSWORD }),
      }),
    );
    expect(live.status).toBe(200);
    expect(live.headers.get("set-cookie")).toMatch(/; Secure$/);
  });

  it("explains what is missing before setup is done", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("GITHUB_TOKEN", "");
    const state = await (await session(request("GET", "/api/admin/session"))).json();
    expect(state).toEqual({
      loggedIn: false,
      setup: { password: false, github: false, problems: [expect.stringMatching(/^ADMIN_PASSWORD is not set/), expect.stringMatching(/^GITHUB_TOKEN is not set/)] },
    });
    const res = await login(request("POST", "/api/admin/login", { body: { password: "anything" } }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/isn't set up yet\. ADMIN_PASSWORD is not set/);
  });

  it("returns 422 with plain reasons for a broken save, and 409 when someone else saved first", async () => {
    const cookie = await signIn();
    const { seasons, site, baseSha } = await (await content(request("GET", "/api/admin/content", { cookie }))).json();
    seasons.seasons[0].items[0].episode.youtubeId = "";
    const refused = await save(request("POST", "/api/admin/save", { cookie, body: { seasons, site, uploads: [], summary: "x", baseSha } }));
    expect(refused.status).toBe(422);
    const body = await refused.json();
    expect(body.errors[0]).toMatch(/^Collection 1 ".+" › story 1 ".+" › YouTube link: /);
    expect(body.issues[0]).toMatchObject({ file: "seasons", path: ["seasons", 0, "items", 0, "episode", "youtubeId"] });

    fake.commitOnBranch({ "content/site.json": `${JSON.stringify({ ...site, featured: [] }, null, 2)}\n` }, "Someone else");
    seasons.seasons[0].items[0].episode.youtubeId = "DEMO";
    const late = await save(request("POST", "/api/admin/save", { cookie, body: { seasons, site, uploads: [], summary: "x", baseSha } }));
    expect(late.status).toBe(409);
    expect(await late.json()).toEqual({ error: "Someone else saved changes. Reload to see them." });
  });

  it("refuses a malformed save body with 400", async () => {
    const cookie = await signIn();
    const res = await save(request("POST", "/api/admin/save", { cookie, body: { seasons: {} } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/settings/);
  });

  it("looks up a YouTube link", async () => {
    const cookie = await signIn();
    const res = await youtube(request("GET", `/api/admin/youtube?url=${encodeURIComponent("https://youtu.be/dQw4w9WgXcQ?si=1")}`, { cookie }));
    expect(res.status).toBe(200);
    const info = await res.json();
    expect(info).toMatchObject({ id: "dQw4w9WgXcQ", title: "Fake video dQw4w9WgXcQ", thumbnail: { type: "image/jpeg" } });
    const blocked = await youtube(request("GET", "/api/admin/youtube?url=NoEmbed0000", { cookie }));
    expect(blocked.status).toBe(422);
    const bad = await youtube(request("GET", "/api/admin/youtube?url=https%3A%2F%2Fvimeo.com%2F1", { cookie }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/doesn't look like a YouTube link/);
  });

  it("turns GitHub failures into plain words", async () => {
    const cookie = await signIn();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("GITHUB_TOKEN", "wrong-token");
    const res = await content(request("GET", "/api/admin/content", { cookie }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/GitHub didn't accept the token/);
    // The server log gets the details; the token itself is never in them.
    expect(String(logged.mock.calls[0])).toMatch(/401 Bad credentials/);
    expect(String(logged.mock.calls[0])).not.toMatch(/wrong-token/);
    logged.mockRestore();
  });
});
