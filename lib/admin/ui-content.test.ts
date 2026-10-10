import { describe, expect, it } from "vitest";
import type { Content, Episode } from "@/content/schema";
import sample from "@/content/seasons.json";
import {
  addChallenge,
  addSeason,
  addOption,
  addStory,
  allIds,
  blankChallenge,
  blankQuestion,
  blankSeason,
  blankStory,
  changeOption,
  cleanFeatured,
  deleteItem,
  deleteSeason,
  findChallenge,
  findStory,
  hasInput,
  liveStories,
  moveInList,
  moveSeason,
  moveStory,
  moveStoryToSeason,
  newChallengeId,
  newQuestionId,
  newSeasonId,
  newSlug,
  newStoryId,
  nextOptionId,
  picturesIn,
  prepareForSave,
  removeOption,
  renumberStories,
  setPromptImage,
  sortedSeasons,
  storiesBefore,
  storiesOf,
  updateStory,
} from "./ui-content";

const content = () => structuredClone(sample) as Content;
const order = (c: Content, seasonId = "s1") =>
  c.seasons
    .find((s) => s.id === seasonId)!
    .items.map((i) => (i.type === "episode" ? `${i.episode.id}#${i.episode.number}` : i.challenge.id));

const story = (id: string): Episode => ({
  id,
  number: 99,
  title: { en: id, rw: "" },
  youtubeId: "dQw4w9WgXcQ",
  durationSec: 60,
  thumbnail: "/images/uploads/x-1.jpg",
  skills: [],
  homeActivity: { en: "Play", rw: "" },
});

describe("new ids", () => {
  const fixed = () => "k7fq";
  it("follows the sN / sNeM-xxxx / sNcM-xxxx pattern, after the highest in use", () => {
    const c = content();
    expect(newSeasonId(c)).toBe("s4");
    expect(newStoryId(c, "s1", [], fixed)).toBe("s1e9-k7fq");
    expect(newStoryId(c, "s2", [], fixed)).toBe("s2e1-k7fq");
    expect(newChallengeId(c, "s1", [], fixed)).toBe("s1c3-k7fq");
    expect(newStoryId(c, "s1")).toMatch(/^s1e9-[2-9a-z]{4}$/);
    expect(newChallengeId(c, "s1")).toMatch(/^s1c3-[2-9a-z]{4}$/);
  });
  it("never gives a story or challenge an id that was used before, even one deleted in an earlier save", () => {
    // Children's devices keep progress and stickers by id, so a new item must not inherit them.
    const saved = deleteItem(deleteItem(content(), "s1e8"), "s1c2");
    const story = newStoryId(saved, "s1");
    const challenge = newChallengeId(saved, "s1");
    expect(story).toMatch(/^s1e8-[2-9a-z]{4}$/);
    expect(challenge).toMatch(/^s1c2-[2-9a-z]{4}$/);
    expect(["s1e8", "s1c2"]).not.toContain(story);
    expect(["s1e8", "s1c2"]).not.toContain(challenge);
    // The suffix is random (31⁴ ≈ 920,000 kinds), so ids made for the same place differ.
    expect(new Set(Array.from({ length: 20 }, () => newStoryId(saved, "s1"))).size).toBeGreaterThanOrEqual(19);
  });
  it("numbers after suffixed ids too, and skips taken and reserved ids", () => {
    const c = addStory(content(), "s1", story("s1e9-k7fq"));
    expect(newStoryId(c, "s1", [], fixed)).toBe("s1e10-k7fq");
    expect(newStoryId(c, "s1", ["s1e10-k7fq"], fixed)).toBe("s1e11-k7fq");
    expect(newStoryId(content(), "s1", ["s1e9", "s1e12-abcd"], fixed)).toBe("s1e13-k7fq");
    expect(newSeasonId(content(), ["s4", "s7"])).toBe("s8");
  });
  it("uses a dash for collections with other ids, and stays unique across the file", () => {
    const c = content();
    c.seasons[1]!.id = "animals";
    expect(newStoryId(c, "animals", [], fixed)).toBe("animals-e1-k7fq");
    expect(newChallengeId(c, "animals", [], fixed)).toBe("animals-c1-k7fq");
    const taken = allIds(c);
    expect(taken.has("s1c1-q5")).toBe(true);
    expect(newQuestionId("s1c1", "q", taken)).toBe("s1c1-q6");
    expect(newQuestionId("s1e2", "p", taken)).toBe("s1e2-p1");
  });
  it("makes a unique web address name from the title", () => {
    const c = content();
    expect(newSlug(c, "Animal Stories!")).toBe("animal-stories");
    expect(newSlug(c, "Numbers")).toBe("numbers-2");
    expect(newSlug(c, "")).toBe("collection");
  });
  it("letters answers a, b, c, d", () => {
    expect(nextOptionId({ options: [{ id: "a", image: "" }] })).toBe("b");
    expect(nextOptionId({ options: [{ id: "b", image: "" }, { id: "c", image: "" }] })).toBe("a");
  });
});

describe("blank items", () => {
  it("gives a new story the next id and number", () => {
    const s = blankStory(content(), "s1");
    expect(s).toMatchObject({ id: expect.stringMatching(/^s1e9-[2-9a-z]{4}$/), number: 9, youtubeId: "", durationSec: 0, skills: [] });
  });
  it("gives a new challenge exactly 5 questions with their own ids", () => {
    const ch = blankChallenge(content(), "s1");
    expect(ch.id).toMatch(/^s1c3-[2-9a-z]{4}$/);
    expect(ch.questions.map((q) => q.id)).toEqual([1, 2, 3, 4, 5].map((n) => `${ch.id}-q${n}`));
    expect(ch.questions[0]!.options).toHaveLength(2);
    expect(ch.questions[0]!.skill).toBe("count-1-5");
  });
  it("adds a new collection at the end, Coming soon, in the next color", () => {
    const c = content();
    const season = blankSeason(c, { en: " Animal Stories ", rw: "" });
    expect(season).toMatchObject({
      id: "s4",
      slug: "animal-stories",
      order: 4,
      color: "grape",
      status: "coming_soon",
      title: { en: "Animal Stories", rw: "" },
    });
    const added = addSeason(c, season);
    expect(sortedSeasons(added).map((s) => [s.id, s.order])).toEqual([
      ["s1", 1],
      ["s2", 2],
      ["s3", 3],
      ["s4", 4],
    ]);
  });
});

describe("hasInput", () => {
  it("is false for a new story or challenge left as it started, whatever its ids", () => {
    const c = content();
    const blank = blankStory(c, "s1");
    expect(hasInput(blank, blank)).toBe(false);
    expect(hasInput({ ...blank, id: "s1e10" }, blank)).toBe(false);
    const ch = blankChallenge(c, "s1");
    const renamed = { ...ch, id: "s2c1", questions: ch.questions.map((q, i) => ({ ...q, id: `s2c1-q${i + 1}` })) };
    expect(hasInput(renamed, ch)).toBe(false);
  });
  it("is true once anything is filled in", () => {
    const c = content();
    const blank = blankStory(c, "s1");
    expect(hasInput({ ...blank, youtubeId: "dQw4w9WgXcQ" }, blank)).toBe(true);
    expect(hasInput({ ...blank, title: { en: "", rw: "Ihene" } }, blank)).toBe(true);
    const ch = blankChallenge(c, "s1");
    const labelled = { ...ch, questions: ch.questions.map((q, i) => (i === 4 ? { ...q, options: [q.options[0]!, { id: "b", image: "", label: "two" }] } : q)) };
    expect(hasInput(labelled, ch)).toBe(true);
  });
});

describe("reorder and renumber", () => {
  it("moves a story among stories and keeps challenges after every 4", () => {
    const moved = moveStory(content(), "s1e5", -1);
    expect(order(moved)).toEqual([
      "s1e1#1",
      "s1e2#2",
      "s1e3#3",
      "s1e5#4",
      "s1c1",
      "s1e4#5",
      "s1e6#6",
      "s1e7#7",
      "s1e8#8",
      "s1c2",
    ]);
    expect(order(moveStory(moved, "s1e5", 1))).toEqual(order(content()));
  });
  it("does nothing past either end", () => {
    const c = content();
    expect(moveStory(c, "s1e1", -1)).toBe(c);
    expect(moveStory(c, "s1e8", 1)).toBe(c);
    expect(moveStory(c, "nope", 1)).toBe(c);
  });
  it("leaves its input alone", () => {
    const c = content();
    const before = JSON.stringify(c);
    moveStory(c, "s1e2", 1);
    deleteItem(c, "s1e2");
    updateStory(c, "s1e2", (e) => ({ ...e, title: { en: "X", rw: "" } }));
    expect(JSON.stringify(c)).toBe(before);
  });
  it("renumbers stories after a delete", () => {
    expect(order(deleteItem(content(), "s1e2")).slice(0, 4)).toEqual(["s1e1#1", "s1e3#2", "s1e4#3", "s1c1"]);
  });
  it("renumbers numbers that are out of order", () => {
    const c = content();
    c.seasons[0]!.items.forEach((i) => {
      if (i.type === "episode") i.episode.number = 7;
    });
    expect(storiesOf(renumberStories(c).seasons[0]!).map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("adds stories and challenges at the end of a collection", () => {
    let c = addStory(content(), "s1", story("s1e9-k7fq"));
    const challenge = blankChallenge(c, "s1");
    c = addChallenge(c, "s1", challenge);
    expect(order(c).slice(-3)).toEqual(["s1c2", "s1e9-k7fq#9", challenge.id]);
    expect(storiesBefore(c.seasons[0]!, "s1c1")).toBe(4);
    expect(storiesBefore(c.seasons[0]!, challenge.id)).toBe(9);
  });
  it("moves a story to another collection", () => {
    const c = moveStoryToSeason(content(), "s1e3", "s2");
    expect(findStory(c, "s1e3")).toMatchObject({ season: { id: "s2" }, value: { number: 1 } });
    expect(storiesOf(c.seasons[0]!).map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("moves collections and keeps order 1, 2, 3", () => {
    const c = moveSeason(content(), "s3", -1);
    expect(sortedSeasons(c).map((s) => `${s.id}#${s.order}`)).toEqual(["s1#1", "s3#2", "s2#3"]);
    expect(moveSeason(c, "s1", -1)).toBe(c);
  });
  it("deletes only empty collections", () => {
    const c = content();
    expect(deleteSeason(c, "s1")).toBe(c);
    expect(sortedSeasons(deleteSeason(c, "s2")).map((s) => `${s.id}#${s.order}`)).toEqual(["s1#1", "s3#2"]);
  });
  it("moves entries of a plain list", () => {
    expect(moveInList(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveInList(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });
});

describe("featured stories", () => {
  const site = (featured: string[]) => ({ featured, contact: { whatsapp: "" } });
  it("keeps only stories in Live collections, once each, at most 6, in order", () => {
    const c = content();
    expect(cleanFeatured(site(["s1e3", "gone", "s1e1", "s1e3"]), c).featured).toEqual(["s1e3", "s1e1"]);
    const many = ["s1e1", "s1e2", "s1e3", "s1e4", "s1e5", "s1e6", "s1e7", "s1e8"];
    expect(cleanFeatured(site(many), c).featured).toEqual(many.slice(0, 6));
  });
  it("drops deleted stories and stories in Coming soon collections", () => {
    let c = moveStoryToSeason(content(), "s1e3", "s2");
    c = deleteItem(c, "s1e1");
    expect(cleanFeatured(site(["s1e1", "s1e3", "s1e5"]), c).featured).toEqual(["s1e5"]);
    expect(liveStories(c).every(({ season }) => season.status === "published")).toBe(true);
  });
  it("prepares a consistent save", () => {
    const c = content();
    c.seasons[0]!.items.forEach((i) => {
      if (i.type === "episode") i.episode.number = 1;
    });
    c.seasons[0]!.status = "coming_soon";
    const out = prepareForSave(c, site(["s1e1"]));
    expect(out.site.featured).toEqual([]);
    expect(storiesOf(out.seasons.seasons[0]!).map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("question changes", () => {
  // A picture finishes resizing after other changes were made to the question.
  const latest = () => ({
    ...blankQuestion("s1c3-q1", "count-1-5"),
    promptText: { en: "Which has 2?", rw: "" },
    correctOptionId: "b",
    options: [
      { id: "a", image: "/images/uploads/a-1.png" },
      { id: "b", image: "", label: "two" },
    ],
  });
  it("puts a picture on its answer in the latest question, keeping everything else", () => {
    const pickedForB = (q: ReturnType<typeof latest>) => changeOption(q, "b", { image: "/images/uploads/b-1.png" });
    expect(pickedForB(latest())).toEqual({
      ...latest(),
      options: [
        { id: "a", image: "/images/uploads/a-1.png" },
        { id: "b", image: "/images/uploads/b-1.png", label: "two" },
      ],
    });
  });
  it("finds the answer by id, so removing another answer meanwhile doesn't misplace it", () => {
    const q = removeOption(latest(), "a");
    expect(q.correctOptionId).toBe("b");
    expect(changeOption(q, "b", { image: "/images/uploads/b-1.png" }).options).toEqual([
      { id: "b", image: "/images/uploads/b-1.png", label: "two" },
    ]);
    expect(changeOption(q, "a", { image: "/images/uploads/x-1.png" })).toEqual(q);
  });
  it("drops a cleared label", () => {
    expect(changeOption(latest(), "b", { label: undefined }).options[1]).toEqual({ id: "b", image: "" });
  });
  it("moves the right answer when the right one is removed", () => {
    expect(removeOption(latest(), "b").correctOptionId).toBe("a");
  });
  it("adds answers with the next letter, and sets or clears the question's picture", () => {
    expect(addOption(latest()).options.map((o) => o.id)).toEqual(["a", "b", "c"]);
    const withPicture = setPromptImage(latest(), "/images/uploads/p-1.png");
    expect(withPicture.promptImage).toBe("/images/uploads/p-1.png");
    expect("promptImage" in setPromptImage(withPicture, undefined)).toBe(false);
  });
});

describe("pictures", () => {
  it("lists every picture the content uses", () => {
    const pics = picturesIn(content());
    expect(pics.has("/images/seasons/numbers.svg")).toBe(true);
    expect(pics.has("/images/thumbs/s1e1.svg")).toBe(true);
    expect(pics.has("/images/stickers/s1c1.svg")).toBe(true);
    expect(pics.has("/images/counting/mango-1.svg")).toBe(true);
    expect(pics.has("/images/counting/banana-4.svg")).toBe(true);
    expect(pics.has("")).toBe(false);
  });
  it("finds challenges", () => {
    expect(findChallenge(content(), "s1c2")).toMatchObject({ seasonIndex: 0, itemIndex: 9 });
    expect(findChallenge(content(), "s1e1")).toBeNull();
  });
});
