import { describe, expect, it } from "vitest";
import type { Content } from "@/content/schema";
import sample from "@/content/seasons.json";
import sampleSite from "@/content/site.json";
import { blankChallenge, blankSeason, blankStory, addChallenge, addSeason, addStory } from "./ui-content";
import { checkDraft, fieldId, issueTarget, locate, problemsFor, targetHref } from "./ui-issues";

const content = () => structuredClone(sample) as Content;
const site = () => structuredClone(sampleSite);

describe("checkDraft", () => {
  it("finds nothing wrong with the sample content", () => {
    expect(checkDraft(content(), site())).toEqual([]);
  });

  it("explains an empty new story in plain words, field by field", () => {
    const c = addStory(content(), "s1", blankStory(content(), "s1"));
    const issues = checkDraft(c, site());
    const byField = Object.fromEntries(
      locate(c, issues).map((i) => [i.target.kind === "story" ? i.target.field : "?", i.problem]),
    );
    expect(byField).toMatchObject({
      "title.en": "Write the English title.",
      youtubeId: "Paste the YouTube link.",
      durationSec: "Add how long the story is.",
      thumbnail: "Add a picture.",
      "homeActivity.en": "Write the activity in English.",
    });
    expect(issues[0]!.message).toMatch(/^Collection 1 "Counting Stories" › story 9 › /);
  });

  it("explains an empty new challenge", () => {
    const c = addChallenge(content(), "s1", blankChallenge(content(), "s1"));
    const problems = problemsFor(locate(c, checkDraft(c, site())), "challenge", "s1c3");
    expect(problems.get("sticker")).toEqual(["Add a sticker picture."]);
    expect(problems.get("title.en")).toEqual(["Write the English title."]);
    expect(problems.get("questions.0.promptText.en")).toEqual(["Write the question in English."]);
    expect(problems.get("questions.4.options.1.image")).toEqual(["Add a picture for this answer."]);
  });

  it("asks for a poster on a new collection, and a story before it can be Live", () => {
    const c = addSeason(content(), blankSeason(content(), { en: "Animals", rw: "" }));
    c.seasons[3]!.status = "published";
    const problems = problemsFor(locate(c, checkDraft(c, site())), "collection", "s4");
    expect(problems.get("posterImage")).toEqual(["Add a poster picture."]);
    expect(problems.get("items")).toEqual(['A "Live" collection needs at least one story']);
  });

  it("says when the right answer is missing and when a question comes after the end", () => {
    const c = content();
    const item = c.seasons[0]!.items[0]!;
    if (item.type !== "episode") throw new Error("sample changed");
    item.episode.pausePoints![0]!.question.correctOptionId = "z";
    item.episode.pausePoints![0]!.atSec = 300;
    const problems = problemsFor(locate(c, checkDraft(c, site())), "story", "s1e1");
    expect(problems.get("pausePoints.0.question.correctOptionId")).toEqual(["Choose which answer is right"]);
    expect(problems.get("pausePoints.0.atSec")).toEqual(["The question at 5:00 comes after the story ends (4:00)"]);
  });

  it("checks the settings: featured stories and the WhatsApp number", () => {
    const c = content();
    c.seasons[0]!.status = "coming_soon";
    let problems = problemsFor(locate(c, checkDraft(c, site())), "settings");
    expect(problems.get("featured")?.[0]).toMatch(/isn't in a "Live" collection any more/);
    c.seasons[0]!.status = "published";
    const s = { ...site(), contact: { whatsapp: "call me" } };
    problems = problemsFor(locate(c, checkDraft(c, s)), "settings");
    expect(problems.get("contact.whatsapp")?.[0]).toMatch(/^Write the number with its country code/);
  });
});

describe("issueTarget", () => {
  const c = content();
  it("points at the story, challenge or collection and the field", () => {
    expect(issueTarget(c, { file: "seasons", path: ["seasons", 0, "items", 1, "episode", "title", "rw"] })).toEqual({
      kind: "story",
      id: "s1e2",
      field: "title.rw",
    });
    expect(
      issueTarget(c, { file: "seasons", path: ["seasons", 0, "items", 4, "challenge", "questions", 2, "options", 0, "image"] }),
    ).toEqual({ kind: "challenge", id: "s1c1", field: "questions.2.options.0.image" });
    expect(issueTarget(c, { file: "seasons", path: ["seasons", 1, "posterImage"] })).toEqual({
      kind: "collection",
      id: "s2",
      field: "posterImage",
    });
    expect(issueTarget(c, { file: "seasons", path: ["seasons", 2, "items"] })).toEqual({
      kind: "collection",
      id: "s3",
      field: "items",
    });
  });
  it("points at the settings, or nowhere in particular", () => {
    expect(issueTarget(c, { file: "site", path: ["featured", 2] })).toEqual({ kind: "settings", field: "featured" });
    expect(issueTarget(c, { file: "site", path: ["contact", "whatsapp"] })).toEqual({
      kind: "settings",
      field: "contact.whatsapp",
    });
    expect(issueTarget(c, { file: "uploads", path: [3] })).toEqual({ kind: "general", field: "" });
    expect(issueTarget(c, { file: "seasons", path: ["skills", "count-1-5", "en"] })).toEqual({ kind: "general", field: "" });
  });
  it("links to the field", () => {
    expect(fieldId("pausePoints.0.question.promptText.en")).toBe("f-pausePoints-0-question-promptText-en");
    expect(targetHref({ kind: "story", id: "s1e2", field: "title.en" })).toBe("/admin/stories/s1e2#f-title-en");
    expect(targetHref({ kind: "settings", field: "featured" })).toBe("/admin/settings#f-featured");
    expect(targetHref({ kind: "collection", id: "s2", field: "" })).toBe("/admin/collections/s2");
    expect(targetHref({ kind: "general", field: "" })).toBeNull();
  });
});
