import { describe, expect, it } from "vitest";
import { MAX_SUMMARY, quoteTitle, summarize } from "./ui-summary";

describe("summarize", () => {
  it("has a default", () => {
    expect(summarize([])).toBe("Update stories");
    expect(summarize([" ", ""])).toBe("Update stories");
  });
  it("joins a few changes in order, once each", () => {
    expect(summarize(["Added story “A”"])).toBe("Added story “A”");
    expect(summarize(["Added story “A”", "Moved stories"])).toBe("Added story “A” and moved stories");
    expect(summarize(["Added story “A”", "Moved stories", "Added story “A”", "Changed settings"])).toBe(
      "Added story “A”, moved stories and changed settings",
    );
  });
  it("counts the rest when there are many", () => {
    expect(summarize(["One", "Two", "Three", "Four", "Five"])).toBe("One, two, three and 2 more changes");
    expect(summarize(["One", "Two", "Three", "Four"])).toBe("One, two, three and 1 more change");
  });
  it("stays short enough for History and Undo", () => {
    const long = Array.from({ length: 5 }, (_, i) => `Changed story ${quoteTitle(`A rather long story title number ${i}`)}`);
    const text = summarize(long);
    expect(text.length).toBeLessThanOrEqual(MAX_SUMMARY);
    expect(text).toMatch(/^Changed story “A rather long story title number 0” and 4 more changes$/);
    expect(summarize(["x".repeat(150)])).toHaveLength(MAX_SUMMARY);
  });
});

describe("quoteTitle", () => {
  it("quotes and shortens titles", () => {
    expect(quoteTitle("Keza's One Mango")).toBe("“Keza's One Mango”");
    expect(quoteTitle("  ")).toBe("“untitled”");
    expect(quoteTitle("abcdefghij", "", 5)).toBe("“abcd…”");
  });
});
