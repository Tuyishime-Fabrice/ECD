import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateContent } from "./validate";

const raw = JSON.parse(readFileSync(new URL("./seasons.json", import.meta.url), "utf8"));
const publicDir = new URL("../public", import.meta.url).pathname;
const exists = (p: string) => existsSync(publicDir + p);

/** Deep copy of the real content that a test can break. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const copy = (): any => structuredClone(raw);
const challenge1 = (c: ReturnType<typeof copy>) => c.seasons[0].items[4].challenge;

function errorsFor(content: unknown): string[] {
  const result = validateContent(content, exists);
  return result.ok ? [] : result.errors;
}

describe("validateContent", () => {
  it("accepts the sample content", () => {
    const result = validateContent(raw, exists);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok && result.content.seasons).toHaveLength(3);
  });

  it("lists missing audio as warnings, not errors", () => {
    const result = validateContent(raw, exists);
    expect(result.ok).toBe(true);
    expect(result.missingAudio).toContain("/audio/s1c1-q1.rw.mp3");
  });

  it("reports duplicate ids with both places", () => {
    const c = copy();
    c.seasons[0].items[1].episode.id = "s1e1";
    const errors = errorsFor(c);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('item 2 (episode "s1e1")');
    expect(errors[0]).toContain('episode id "s1e1" is already used in Season 1 › item 1');
  });

  it("reports a correctOptionId that matches no option", () => {
    const c = copy();
    challenge1(c).questions[2].correctOptionId = "z";
    expect(errorsFor(c)).toEqual([
      'Season 1 "numbers" › item 5 (challenge "s1c1") › question 3 "s1c1-q3" › correctOptionId: "z" is not one of this question\'s options (a, b, c, d)',
    ]);
  });

  it("requires 2 to 4 options", () => {
    const c = copy();
    challenge1(c).questions[0].options = [challenge1(c).questions[0].options[1]];
    challenge1(c).questions[2].options.push({ id: "e", image: "/images/numbers/6.svg" });
    const errors = errorsFor(c);
    expect(errors.some((e) => e.includes('question 1 "s1c1-q1" › options: a question needs at least 2 options'))).toBe(true);
    expect(errors.some((e) => e.includes('question 3 "s1c1-q3" › options: a question can have at most 4 options'))).toBe(true);
  });

  it("requires exactly 5 questions per challenge", () => {
    const c = copy();
    challenge1(c).questions.pop();
    expect(errorsFor(c)).toEqual([
      'Season 1 "numbers" › item 5 (challenge "s1c1") › questions: a challenge needs exactly 5 questions (found 4)',
    ]);
  });

  it("rejects malformed YouTube ids and explains pasted links", () => {
    const c = copy();
    c.seasons[0].items[0].episode.youtubeId = "abc";
    c.seasons[0].items[1].episode.youtubeId = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const errors = errorsFor(c);
    expect(errors[0]).toMatch(/item 1 \(episode "s1e1"\) › youtubeId: "abc" is not a YouTube video ID/);
    expect(errors[1]).toMatch(/use only the video ID "dQw4w9WgXcQ"/);
  });

  it("reports missing pictures with the expected file location", () => {
    const c = copy();
    c.seasons[0].items[0].episode.thumbnail = "/images/thumbs/nope.svg";
    expect(errorsFor(c)).toEqual([
      'Season 1 "numbers" › item 1 (episode "s1e1") › thumbnail: picture "/images/thumbs/nope.svg" was not found (expected the file public/images/thumbs/nope.svg)',
    ]);
  });

  it("reports unknown skills and typos in field names", () => {
    const c = copy();
    challenge1(c).questions[0].skill = "count-1-50";
    expect(errorsFor(c)[0]).toContain('skill "count-1-50" is not listed in "skills"');

    const d = copy();
    d.seasons[0].items[0].episode.youtubeID = "DEMO";
    expect(errorsFor(d)[0]).toContain('Unrecognized key: "youtubeID"');
  });

  it("explains a malformed thumbnail", () => {
    const c = copy();
    c.seasons[0].items[0].episode.thumbnail = "images/thumbs/s1e1.svg";
    expect(errorsFor(c)).toEqual([
      'Season 1 "numbers" › item 1 (episode "s1e1") › thumbnail: must look like "/images/thumbs/picture.svg" or be a full https:// link',
    ]);
  });

  it("says when a required field is missing", () => {
    const c = copy();
    delete c.seasons[0].items[0].episode.homeActivity;
    expect(errorsFor(c)).toEqual(['Season 1 "numbers" › item 1 (episode "s1e1") › homeActivity: is missing']);
  });
});
