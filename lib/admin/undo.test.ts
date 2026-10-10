import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFakeGitHub, seedFromWorkingTree } from "../../scripts/dev/fake-github.mjs";
import { createGitHub, gitBlobSha } from "./github";
import { CONFLICT_MESSAGE, saveContent, SEASONS_FILE, SITE_FILE } from "./save";
import { parseUndoRequest, planUndo, undoMessage, undoSave } from "./undo";

const seasonsText = readFileSync(new URL("../../content/seasons.json", import.meta.url), "utf8");
const siteText = readFileSync(new URL("../../content/site.json", import.meta.url), "utf8");
const seed = seedFromWorkingTree();
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

function setup() {
  const fake = createFakeGitHub({ files: seed });
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) => fake.handle(new Request(input, init))) as typeof fetch;
  const gh = createGitHub(
    { token: "test-token", owner: "Tuyishime-Fabrice", repo: "ECD", branch: "main", apiUrl: "http://fake.test" },
    fetchImpl,
  );
  return { fake, gh };
}

/** A dashboard save that sets the WhatsApp number; returns its commit sha. */
async function saveNumber(fake: ReturnType<typeof setup>["fake"], gh: ReturnType<typeof setup>["gh"], number: string) {
  const site = JSON.parse(fake.readText(SITE_FILE)!);
  site.contact.whatsapp = number;
  const seasons = JSON.parse(fake.readText(SEASONS_FILE)!);
  const outcome = await saveContent(gh, { seasons, site, uploads: [], summary: `Number ${number}`, baseSha: fake.headSha() });
  expect(outcome.status).toBe(200);
  return outcome.body.commitSha as string;
}

describe("undoSave", () => {
  it("puts the files back exactly as they were before the save, as a new commit", async () => {
    const { fake, gh } = setup();
    const save = await saveNumber(fake, gh, "+250 781 234 567");
    const outcome = await undoSave(gh, { sha: save });
    expect(outcome.status).toBe(200);
    expect(outcome.body.commitSha).toBe(fake.headSha());
    expect(fake.readText(SITE_FILE)).toBe(siteText);
    expect(fake.readText(SEASONS_FILE)).toBe(seasonsText);
    // A new commit on top, not a rewrite.
    expect(fake.readText(SITE_FILE, save)).toContain("+250 781 234 567");
  });

  it("names the save in the commit message", async () => {
    const { fake, gh } = setup();
    const save = await saveNumber(fake, gh, "+250 781 234 567");
    await undoSave(gh, { sha: save });
    const history = await gh.recentCommits([SITE_FILE], 1);
    expect(history[0]!.summary).toBe('Undo "Number +250 781 234 567"');
  });

  it("also undoes later saves, since the files go back as a whole", async () => {
    const { fake, gh } = setup();
    const first = await saveNumber(fake, gh, "+250 700 000 001");
    await saveNumber(fake, gh, "+250 700 000 002");
    expect((await undoSave(gh, { sha: first })).status).toBe(200);
    expect(fake.readText(SITE_FILE)).toBe(siteText);
  });

  it("can undo an undo", async () => {
    const { fake, gh } = setup();
    const save = await saveNumber(fake, gh, "+250 781 234 567");
    const undo = await undoSave(gh, { sha: save });
    expect((await undoSave(gh, { sha: undo.body.commitSha as string })).status).toBe(200);
    expect(JSON.parse(fake.readText(SITE_FILE)!).contact.whatsapp).toBe("+250 781 234 567");
  });

  it("says when there is nothing left to undo", async () => {
    const { fake, gh } = setup();
    const save = await saveNumber(fake, gh, "+250 781 234 567");
    await undoSave(gh, { sha: save });
    const head = fake.headSha();
    expect(await undoSave(gh, { sha: save })).toEqual({
      status: 422,
      body: { errors: ["Nothing to undo: the stories and settings are already the way they were before this save."] },
    });
    expect(fake.headSha()).toBe(head);
  });

  it("refuses commits that didn't change the content, the very first commit, and unknown ones", async () => {
    const { fake, gh } = setup();
    const root = fake.headSha();
    const code = fake.commitOnBranch({ "README.md": "changed" }, "Code change");
    expect(await undoSave(gh, { sha: code })).toMatchObject({ status: 422, body: { errors: [expect.stringMatching(/didn't change any stories/)] } });
    expect(await undoSave(gh, { sha: root })).toMatchObject({ status: 422, body: { errors: [expect.stringMatching(/very first version/)] } });
    expect(await undoSave(gh, { sha: "f".repeat(40) })).toMatchObject({ status: 404 });
  });

  it("refuses when the old version uses a picture that has since been deleted", async () => {
    const { fake, gh } = setup();
    const seasons = JSON.parse(seasonsText);
    seasons.seasons[0].items[0].episode.thumbnail = "/images/uploads/old-1.jpg";
    fake.commitOnBranch(
      { [SEASONS_FILE]: `${JSON.stringify(seasons, null, 2)}\n`, "public/images/uploads/old-1.jpg": JPEG },
      "Story with an uploaded picture",
    );
    seasons.seasons[0].items[0].episode.thumbnail = "/images/thumbs/s1e1.svg";
    const save = await saveContent(gh, { seasons, site: JSON.parse(siteText), uploads: [], summary: "Back to the drawing", baseSha: fake.headSha() });
    fake.commitOnBranch({ "public/images/uploads/old-1.jpg": null }, "Clean up pictures");
    const head = fake.headSha();
    const outcome = await undoSave(gh, { sha: save.body.commitSha as string });
    expect(outcome.status).toBe(422);
    expect(outcome.body.errors).toEqual([expect.stringContaining('the picture "/images/uploads/old-1.jpg" isn\'t saved')]);
    expect(fake.headSha()).toBe(head);
  });

  it("refuses with 409 when given a baseSha and the content moved since", async () => {
    const { fake, gh } = setup();
    const save = await saveNumber(fake, gh, "+250 700 000 001");
    const base = fake.headSha();
    fake.commitOnBranch({ [SITE_FILE]: siteText.replace('"whatsapp": ""', '"whatsapp": "+250 799 999 999"') }, "Someone else");
    expect(await undoSave(gh, { sha: save, baseSha: base })).toEqual({ status: 409, body: { error: CONFLICT_MESSAGE } });
  });
});

describe("undo helpers", () => {
  it("plans only the files that differ", () => {
    const repo = new Map([[SITE_FILE, gitBlobSha(new TextEncoder().encode("same"))]]);
    const plan = planUndo(
      [
        { path: SITE_FILE, text: "same" },
        { path: SEASONS_FILE, text: "old" },
      ],
      repo,
    );
    expect(plan.map((f) => f.path)).toEqual([SEASONS_FILE]);
  });

  it("writes a short message", () => {
    expect(undoMessage("Add story\nmore", "0123456789".repeat(4))).toBe(
      'Undo "Add story more"\n\nPuts the stories and settings back to how they were before 0123456.',
    );
  });

  it("checks the request", () => {
    expect(parseUndoRequest({ sha: "a".repeat(40) })).toEqual({ ok: true, request: { sha: "a".repeat(40), baseSha: undefined } });
    expect(parseUndoRequest({ sha: "abc" }).ok).toBe(false);
    expect(parseUndoRequest(null).ok).toBe(false);
    expect(parseUndoRequest({ sha: "a".repeat(40), baseSha: 1 }).ok).toBe(false);
  });
});
