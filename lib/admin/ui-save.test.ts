import { describe, expect, it } from "vitest";
import { draftAfterSave, notesAfterSave, type Note } from "./ui-save";

const snap = (title: string, featured: string[] = []) => ({ title, featured });

describe("draftAfterSave", () => {
  it("shows what was saved when nothing changed during the save", () => {
    const sent = snap("Keza", ["s1e1", "gone"]);
    const saved = snap("Keza", ["s1e1"]);
    expect(draftAfterSave(structuredClone(sent), sent, saved)).toBe(saved);
  });

  it("keeps edits made while the save was running", () => {
    const sent = snap("Keza");
    const saved = snap("Keza");
    const typedMeanwhile = snap("Keza and the goats");
    expect(draftAfterSave(typedMeanwhile, sent, saved)).toBe(typedMeanwhile);
  });
});

describe("notesAfterSave", () => {
  const notes = (...entries: [string, Note][]) => new Map(entries);

  it("clears the notes that went with the save", () => {
    const before = notes(["story:s1e1", { text: "Changed story “Keza”", seq: 1 }], ["move:s1e2", { text: "Moved story", seq: 2 }]);
    expect([...notesAfterSave(before, 2)]).toEqual([]);
  });

  it("keeps notes written after Save was pressed, even for the same thing", () => {
    const after = notes(
      ["move:s1e2", { text: "Moved story", seq: 2 }],
      // Changed again during the save: same key and text, newer number.
      ["story:s1e1", { text: "Changed story “Keza”", seq: 4 }],
      ["add:s1e9", { text: "Added story “Goats”", seq: 5 }],
    );
    expect([...notesAfterSave(after, 3).keys()]).toEqual(["story:s1e1", "add:s1e9"]);
  });
});
