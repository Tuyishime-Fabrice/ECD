import { describe, expect, it } from "vitest";
import { plainMessage, plainSiteError, whereInContent } from "./wording";

const raw = {
  skills: { "count-1-5": { rw: "", en: "Counting" } },
  seasons: [
    {
      title: { en: "Counting Stories" },
      items: [
        { type: "episode", episode: { title: { en: "One Mango" }, pausePoints: [{ question: { options: [{}, {}] } }] } },
        { type: "challenge", challenge: { title: { en: "Challenge 1" }, questions: [{}, {}] } },
        { type: "episode", episode: { title: { en: "  " } } },
      ],
    },
  ],
};

describe("whereInContent", () => {
  it.each([
    [["seasons", 0, "title", "rw"], 'Collection 1 "Counting Stories" › title › Kinyarwanda'],
    [["seasons", 0, "items", 2, "episode", "youtubeId"], 'Collection 1 "Counting Stories" › story 2 › YouTube link'],
    [
      ["seasons", 0, "items", 0, "episode", "pausePoints", 0, "question", "options", 1, "image"],
      'Collection 1 "Counting Stories" › story 1 "One Mango" › question during the story › answer 2 › picture',
    ],
    [
      ["seasons", 0, "items", 1, "challenge", "questions", 1, "correctOptionId"],
      'Collection 1 "Counting Stories" › challenge 1 "Challenge 1" › question 2 › right answer',
    ],
    [["skills", "count-1-5", "en"], 'skills › skill "count-1-5" › English'],
    [["seasons"], "collections"],
    [[], "Stories file"],
  ])("%j → %s", (path, expected) => {
    expect(whereInContent(raw, path)).toBe(expected);
  });
});

describe("plainMessage", () => {
  it("uses the dashboard's words but leaves quoted ids alone", () => {
    expect(plainMessage({ message: 'slug "season-one" is already used in Season 1' })).toBe(
      'slug "season-one" is already used in Collection 1',
    );
    expect(plainMessage({ message: "durationSec must be more than 0" })).toBe("the length must be more than 0");
    expect(plainMessage({ message: "75.5s is after the end of the episode (60s)" })).toBe(
      "the question at 1:16 comes after the story ends (1:00)",
    );
  });

  it("says what to do about a missing picture", () => {
    expect(plainMessage({ message: "x", missingPicture: "/images/uploads/a.jpg" })).toBe(
      'the picture "/images/uploads/a.jpg" isn\'t saved. Upload it again.',
    );
    expect(plainMessage({ message: "x", missingPicture: "/images/thumbs/a.svg" })).toBe(
      'the picture "/images/thumbs/a.svg" isn\'t in the app. Upload a picture instead.',
    );
  });
});

describe("plainSiteError", () => {
  it("names settings fields", () => {
    expect(plainSiteError({ path: ["contact", "whatsapp"], message: "bad" }, raw)).toBe("Settings › WhatsApp number: bad");
    expect(plainSiteError({ path: ["featured"], message: '"s1e1" is listed twice' }, raw)).toBe(
      'Settings › Featured stories: "s1e1" is listed twice',
    );
    expect(plainSiteError({ path: ["featured", 0], message: '"gone" is not a story in a published collection' }, raw)).toBe(
      'Settings › Featured stories › 1: the story "gone" isn\'t in a "Live" collection any more. Remove it from Featured stories.',
    );
  });
});
