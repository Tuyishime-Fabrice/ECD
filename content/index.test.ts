import { describe, expect, it } from "vitest";
import { DEMO_YOUTUBE_ID } from "@/lib/brand";
import { getChallenge, getEpisode, getSeasons, getSkills, getStickerSlots, skillLabel } from "./index";

describe("content loader", () => {
  it("orders season 1 as 4 episodes, challenge, 4 episodes, challenge", () => {
    const [s1] = getSeasons();
    expect(s1?.items.map((i) => i.id)).toEqual([
      "s1e1", "s1e2", "s1e3", "s1e4", "s1c1", "s1e5", "s1e6", "s1e7", "s1e8", "s1c2",
    ]);
  });

  it("lists two coming-soon seasons with no items", () => {
    const soon = getSeasons().filter((s) => s.status === "coming_soon");
    expect(soon.map((s) => s.slug)).toEqual(["colors-shapes", "body-hygiene"]);
    expect(soon.every((s) => s.items.length === 0)).toBe(true);
  });

  it("makes each challenge require the episodes since the previous challenge", () => {
    expect(getChallenge("s1c1")?.challenge.requires).toEqual(["s1e1", "s1e2", "s1e3", "s1e4"]);
    expect(getChallenge("s1c2")?.challenge.requires).toEqual(["s1e5", "s1e6", "s1e7", "s1e8"]);
    expect(getChallenge("s1c2")?.challenge.number).toBe(2);
  });

  it("resolves DEMO videos and keeps the pause point at 20 s", () => {
    const e1 = getEpisode("s1e1")?.episode;
    expect(e1?.videoId).toBe(DEMO_YOUTUBE_ID);
    expect(e1?.pausePoints.map((p) => p.atSec)).toEqual([20]);
  });

  it("drops audio files that are not recorded yet", () => {
    const q = getChallenge("s1c1")?.challenge.questions[0];
    expect(q?.promptAudio).toBeUndefined();
  });

  it("collects skills and sticker slots", () => {
    expect(getSkills().map((s) => s.id)).toEqual([
      "count-1-5", "match-1-5", "numerals-1-5", "count-6-10", "match-6-10", "numerals-6-10",
    ]);
    expect(getStickerSlots().map((s) => s.challengeId)).toEqual(["s1c1", "s1c2"]);
  });

  it("labels skills only from the listed ones, never from what every object has", () => {
    const listed = { "count-1-5": { en: "Counting 1–5", rw: "Kubara 1–5" } };
    expect(skillLabel(listed, "count-1-5")).toEqual(listed["count-1-5"]);
    // The Object function here can't be sent to the parents' page, and failed the build.
    expect(skillLabel(listed, "constructor")).toEqual({ en: "constructor", rw: "constructor" });
  });
});
