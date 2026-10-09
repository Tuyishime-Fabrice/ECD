import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFakeGitHub, seedFromWorkingTree } from "../../scripts/dev/fake-github.mjs";
import { createGitHub, gitBlobSha } from "./github";
import {
  checkSave,
  checkUploads,
  commitMessage,
  CONFLICT_MESSAGE,
  contentChanged,
  parseSaveRequest,
  saveContent,
  SEASONS_FILE,
  SITE_FILE,
  type SaveRequest,
} from "./save";
import { MAX_UPLOAD_BYTES } from "./uploads";

const seasonsText = readFileSync(new URL("../../content/seasons.json", import.meta.url), "utf8");
const siteText = readFileSync(new URL("../../content/site.json", import.meta.url), "utf8");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const seasons = (): any => JSON.parse(seasonsText);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const site = (): any => JSON.parse(siteText);

const seed = seedFromWorkingTree();
const repoFiles = new Map(Object.entries(seed).map(([path, data]) => [path, gitBlobSha(data)]));

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const WEBP = Buffer.from("RIFF\x10\x00\x00\x00WEBPVP8 ", "latin1");
const b64 = (bytes: Buffer) => bytes.toString("base64");

const errorsOf = (result: ReturnType<typeof checkSave>) => (result.ok ? [] : result.errors);

describe("checkSave", () => {
  it("accepts the current content and commits only what changed", () => {
    const result = checkSave({ seasons: seasons(), site: site(), uploads: [] }, repoFiles);
    expect(errorsOf(result)).toEqual([]);
    // seasons.json is already written exactly as the dashboard writes it, so it isn't re-committed.
    expect(result.ok && result.files.map((f) => f.path)).not.toContain(SEASONS_FILE);
  });

  it("accepts a story whose picture is uploaded in the same save", () => {
    const c = seasons();
    c.seasons[0].items[0].episode.thumbnail = "/images/uploads/kezas-mango-1a2b.png";
    const result = checkSave(
      { seasons: c, site: site(), uploads: [{ path: "/images/uploads/kezas-mango-1a2b.png", base64: b64(PNG) }] },
      repoFiles,
    );
    expect(errorsOf(result)).toEqual([]);
    const files = result.ok ? result.files : [];
    expect(files.map((f) => f.path)).toEqual(expect.arrayContaining([SEASONS_FILE, "public/images/uploads/kezas-mango-1a2b.png"]));
    expect(Buffer.from(files.find((f) => f.path.endsWith(".png"))!.bytes)).toEqual(PNG);
  });

  it("explains a missing picture in plain words, with where it is", () => {
    const c = seasons();
    const story = c.seasons[0].items[1].episode;
    story.thumbnail = "/images/uploads/two-bananas-9f.jpg";
    const result = checkSave({ seasons: c, site: site(), uploads: [] }, repoFiles);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      `Collection 1 "${c.seasons[0].title.en}" › story 2 "${story.title.en}" › picture: the picture "/images/uploads/two-bananas-9f.jpg" isn't saved. Upload it again.`,
    ]);
    expect(result.issues).toEqual([
      {
        file: "seasons",
        path: ["seasons", 0, "items", 1, "episode", "thumbnail"],
        message: result.errors[0],
        problem: 'the picture "/images/uploads/two-bananas-9f.jpg" isn\'t saved. Upload it again.',
      },
    ]);
  });

  it("rejects broken content with readable reasons", () => {
    const c = seasons();
    const season = c.seasons[0];
    const first = season.items[0].episode;
    first.title.en = "";
    first.pausePoints[0].atSec = 300;
    const challenge = season.items[4].challenge;
    challenge.questions.pop();
    challenge.questions[1].correctOptionId = "z";
    const errors = errorsOf(checkSave({ seasons: c, site: site(), uploads: [] }, repoFiles));
    const where = `Collection 1 "${season.title.en}"`;
    expect(errors).toEqual(
      expect.arrayContaining([
        `${where} › story 1 › title › English: English text is required (it is used when Kinyarwanda is missing)`,
        `${where} › story 1 › question during the story › time: the question at 5:00 comes after the story ends (4:00)`,
        `${where} › challenge 1 "${challenge.title.en}" › questions: a challenge needs exactly 5 questions (found 4)`,
        `${where} › challenge 1 "${challenge.title.en}" › question 2 › right answer: choose which answer is right`,
      ]),
    );
    expect(errors).toHaveLength(4);
    for (const e of errors) expect(e).not.toMatch(/season|episode|durationSec|atSec|correctOptionId/);
  });

  it("checks references only once the shape is right, then names unknown skills", () => {
    const c = seasons();
    c.seasons[0].items[0].episode.skills.push("not-a-skill");
    expect(errorsOf(checkSave({ seasons: c, site: site(), uploads: [] }, repoFiles))).toEqual([
      `Collection 1 "${c.seasons[0].title.en}" › story 1 "${c.seasons[0].items[0].episode.title.en}" › skill 3: skill "not-a-skill" doesn't exist. Pick skills from the list.`,
    ]);
  });

  it("refuses featured stories that aren't live, by their title", () => {
    const c = seasons();
    c.seasons[0].status = "coming_soon";
    const s = site();
    const title = c.seasons[0].items[0].episode.title.en;
    const result = checkSave({ seasons: c, site: { ...s, featured: ["s1e1"] }, uploads: [] }, repoFiles);
    expect(errorsOf(result)).toEqual([
      `Settings › Featured stories › 1: "${title}" isn't in a "Live" collection any more. Remove it from Featured stories.`,
    ]);
    expect(!result.ok && result.issues[0]).toMatchObject({ file: "site", path: ["featured", 0] });
  });

  it("checks the WhatsApp number", () => {
    const errors = errorsOf(checkSave({ seasons: seasons(), site: { ...site(), contact: { whatsapp: "call me" } }, uploads: [] }, repoFiles));
    expect(errors).toEqual([
      'Settings › WhatsApp number: must be a phone number with country code, like "+250781234567", or empty',
    ]);
  });

  it("still checks the settings' shape when the stories are broken", () => {
    const c = seasons();
    delete c.seasons;
    const errors = errorsOf(checkSave({ seasons: c, site: { featured: "s1e1", contact: { whatsapp: "" } }, uploads: [] }, repoFiles));
    expect(errors.some((e) => e.startsWith("collections: "))).toBe(true);
    expect(errors.some((e) => e.startsWith("Settings › Featured stories: "))).toBe(true);
  });
});

describe("checkUploads", () => {
  const check = (uploads: { path: string; base64: string }[], files = repoFiles) => checkUploads(uploads, files);
  const messages = (uploads: { path: string; base64: string }[]) => check(uploads).issues.map((i) => i.message);

  it("accepts JPEG, PNG and WebP, a data: prefix and a public/ prefix", () => {
    const { files, issues } = check([
      { path: "/images/uploads/a.jpg", base64: `data:image/jpeg;base64,${b64(JPEG)}` },
      { path: "/images/uploads/b.jpeg", base64: b64(JPEG) },
      { path: "public/images/uploads/c-2.png", base64: b64(PNG) },
      { path: "/images/uploads/d.webp", base64: b64(WEBP) },
    ]);
    expect(issues).toEqual([]);
    expect(files.map((f) => f.repoPath)).toEqual([
      "public/images/uploads/a.jpg",
      "public/images/uploads/b.jpeg",
      "public/images/uploads/c-2.png",
      "public/images/uploads/d.webp",
    ]);
  });

  it("only writes safe names inside public/images/uploads/", () => {
    for (const path of [
      "/images/uploads/../../app/page.tsx",
      "/images/uploads/sub/x.png",
      "/images/thumbs/x.png",
      "/images/uploads/X.png",
      "/images/uploads/my picture.png",
      "/images/uploads/x.svg",
      "/images/uploads/-x.png",
      "images/uploads/x.png",
      "/images/uploads/.png",
    ]) {
      expect(messages([{ path, base64: b64(PNG) }])[0], path).toMatch(/this file name can't be used/);
    }
  });

  it("sniffs the bytes instead of trusting the name", () => {
    expect(messages([{ path: "/images/uploads/x.png", base64: b64(Buffer.from("<svg onload=alert(1)>")) }])).toEqual([
      'Picture "x.png" isn\'t a JPEG, PNG or WebP picture.',
    ]);
    expect(messages([{ path: "/images/uploads/x.jpg", base64: b64(PNG) }])).toEqual([
      'Picture "x.jpg" is a PNG picture, but its name doesn\'t end in ".png".',
    ]);
  });

  it("refuses pictures over 1.5 MB, unreadable data and repeats", () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_BYTES)]);
    expect(messages([{ path: "/images/uploads/big.jpg", base64: b64(big) }])[0]).toMatch(/^Picture "big.jpg" is too big \(1.5 MB\)\. Pictures can be up to 1.5 MB\.$/);
    expect(messages([{ path: "/images/uploads/x.jpg", base64: "not base64!" }])).toEqual(['Picture "x.jpg" couldn\'t be read. Add it again.']);
    expect(messages([{ path: "/images/uploads/x.jpg", base64: "" }])).toEqual(['Picture "x.jpg" couldn\'t be read. Add it again.']);
    expect(
      messages([
        { path: "/images/uploads/x.jpg", base64: b64(JPEG) },
        { path: "public/images/uploads/x.jpg", base64: b64(JPEG) },
      ]),
    ).toEqual(['Picture "x.jpg" was added twice.']);
  });

  it("never replaces a different picture, but lets the same one through", () => {
    const files = new Map([["public/images/uploads/x.jpg", gitBlobSha(JPEG)]]);
    expect(check([{ path: "/images/uploads/x.jpg", base64: b64(JPEG) }], files).issues).toEqual([]);
    expect(check([{ path: "/images/uploads/x.jpg", base64: b64(Buffer.concat([JPEG, Buffer.from([1])])) }], files).issues[0]?.message).toBe(
      'A different picture is already saved as "x.jpg". Add it again under a new name.',
    );
  });

  it("limits the whole save to what Vercel accepts", () => {
    const almost = b64(Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_BYTES - JPEG.length - 10)]));
    const uploads = ["a", "b", "c"].map((n) => ({ path: `/images/uploads/${n}.jpg`, base64: almost }));
    expect(messages(uploads)).toEqual([
      "The new pictures add up to 4.5 MB; one save can carry up to 3.0 MB. Save fewer pictures at a time.",
    ]);
  });

  it("puts each problem on the picture it is about", () => {
    const { issues } = check([
      { path: "/images/uploads/ok.jpg", base64: b64(JPEG) },
      { path: "/images/uploads/bad.jpg", base64: b64(PNG) },
    ]);
    expect(issues.map((i) => i.path)).toEqual([[1]]);
  });
});

describe("parseSaveRequest", () => {
  const good = { seasons: {}, site: {}, uploads: [], summary: "Add a story", baseSha: "a".repeat(40) };
  it("accepts a well-formed body and fills defaults", () => {
    const { uploads, summary, ...rest } = good;
    void uploads;
    void summary;
    expect(parseSaveRequest(rest)).toEqual({ ok: true, request: { ...good, summary: "" } });
  });
  it.each([
    [null, /Send/],
    [{ ...good, seasons: [] }, /stories/],
    [{ ...good, site: undefined }, /settings/],
    [{ ...good, baseSha: "abc" }, /baseSha/],
    [{ ...good, uploads: [{ path: "x" }] }, /path and its base64/],
    [{ ...good, summary: 5 }, /summary/],
  ])("refuses %j", (body, message) => {
    const result = parseSaveRequest(body);
    expect(!result.ok && result.error).toMatch(message);
  });
});

describe("conflicts", () => {
  const listing = (seasonsSha: string, siteSha: string, other = "x") => [
    { name: "seasons.json", path: SEASONS_FILE, sha: seasonsSha, type: "file" },
    { name: "site.json", path: SITE_FILE, sha: siteSha, type: "file" },
    { name: "schema.ts", path: "content/schema.ts", sha: other, type: "file" },
  ];

  it("sees a change to either content file, and ignores the others", () => {
    expect(contentChanged(listing("1", "2"), listing("1", "2", "y"))).toBe(false);
    expect(contentChanged(listing("1", "2"), listing("9", "2"))).toBe(true);
    expect(contentChanged(listing("1", "2"), listing("1", "9"))).toBe(true);
    expect(contentChanged(listing("1", "2"), listing("1", "2").slice(0, 1))).toBe(true);
  });
});

describe("commitMessage", () => {
  it("keeps the summary as the first line", () => {
    expect(commitMessage("  Add story\n“Two Bananas”  ")).toBe("Add story “Two Bananas”\n\nSaved from the admin dashboard.");
    expect(commitMessage("")).toMatch(/^Update stories\n/);
    expect(commitMessage("x".repeat(300)).split("\n")[0]).toHaveLength(100);
  });
});

describe("saveContent against the fake GitHub", () => {
  function setup() {
    const fake = createFakeGitHub({ files: seed });
    const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) => fake.handle(new Request(input, init))) as typeof fetch;
    const gh = createGitHub(
      { token: "test-token", owner: "Tuyishime-Fabrice", repo: "ECD", branch: "main", apiUrl: "http://fake.test" },
      fetchImpl,
    );
    return { fake, gh };
  }
  const request = (baseSha: string, patch: Partial<SaveRequest> = {}): SaveRequest => {
    const s = site();
    s.contact.whatsapp = "+250 781 234 567";
    return { seasons: seasons(), site: s, uploads: [], summary: "Add WhatsApp number", baseSha, ...patch };
  };

  it("commits on the head it started from", async () => {
    const { fake, gh } = setup();
    const base = fake.headSha();
    const outcome = await saveContent(gh, request(base));
    expect(outcome.status).toBe(200);
    expect(outcome.body.commitSha).toBe(fake.headSha());
    expect(JSON.parse(fake.readText(SITE_FILE)!).contact.whatsapp).toBe("+250 781 234 567");
    expect(fake.readText(SEASONS_FILE)).toBe(seasonsText);
  });

  it("says when nothing changed, without a commit", async () => {
    const { fake, gh } = setup();
    const base = fake.headSha();
    await saveContent(gh, request(base));
    const head = fake.headSha();
    const again = await saveContent(gh, request(head));
    expect(again).toEqual({ status: 200, body: { commitSha: head, unchanged: true } });
    expect(fake.headSha()).toBe(head);
  });

  it("refuses with 409 when someone else changed the content since it was loaded", async () => {
    const { fake, gh } = setup();
    const base = fake.headSha();
    fake.commitOnBranch({ [SITE_FILE]: siteText.replace('"whatsapp": ""', '"whatsapp": "+250 700 000 000"') }, "Other save");
    const head = fake.headSha();
    expect(await saveContent(gh, request(base))).toEqual({ status: 409, body: { error: CONFLICT_MESSAGE } });
    expect(fake.headSha()).toBe(head);
  });

  it("saves on top when only other files changed since it was loaded", async () => {
    const { fake, gh } = setup();
    const base = fake.headSha();
    const codeChange = fake.commitOnBranch({ "README.md": "hi" }, "Code change");
    const outcome = await saveContent(gh, request(base));
    expect(outcome.status).toBe(200);
    expect(fake.readText("README.md")).toBe("hi");
    expect(fake.headSha()).not.toBe(codeChange);
  });

  it("starts over once when the branch moves during the commit", async () => {
    const { fake } = setup();
    let raced = false;
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH" && !raced) {
        raced = true;
        fake.commitOnBranch({ "README.md": "racing" }, "A commit that lands mid-save");
      }
      return fake.handle(new Request(input, init));
    }) as typeof fetch;
    const gh = createGitHub({ token: "test-token", owner: "Tuyishime-Fabrice", repo: "ECD", branch: "main", apiUrl: "http://fake.test" }, fetchImpl);
    const outcome = await saveContent(gh, request(fake.headSha()));
    expect(outcome.status).toBe(200);
    expect(fake.readText("README.md")).toBe("racing");
    expect(JSON.parse(fake.readText(SITE_FILE)!).contact.whatsapp).toBe("+250 781 234 567");
  });

  it("returns 422 with reasons and commits nothing when the content is broken", async () => {
    const { fake, gh } = setup();
    const base = fake.headSha();
    const c = seasons();
    c.seasons[0].items[0].episode.thumbnail = "/images/uploads/nope.jpg";
    const outcome = await saveContent(gh, request(base, { seasons: c }));
    expect(outcome.status).toBe(422);
    expect(outcome.body.errors).toEqual([expect.stringContaining('the picture "/images/uploads/nope.jpg" isn\'t saved')]);
    expect(fake.headSha()).toBe(base);
  });

  it("commits uploads and content together in one commit", async () => {
    const { fake, gh } = setup();
    const base = fake.headSha();
    const c = seasons();
    c.seasons[0].items[0].episode.thumbnail = "/images/uploads/mango-1.jpg";
    const outcome = await saveContent(gh, request(base, { seasons: c, uploads: [{ path: "/images/uploads/mango-1.jpg", base64: b64(JPEG) }] }));
    expect(outcome.status).toBe(200);
    expect(fake.log.filter((l) => l.startsWith("POST /git/commits"))).toHaveLength(1);
    expect(fake.readText("public/images/uploads/mango-1.jpg")).toBe(JPEG.toString("utf8"));
  });
});
