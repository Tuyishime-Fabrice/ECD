import { describe, expect, it } from "vitest";
import { liveState, SLOW_AFTER_MS } from "./ui-live";

const sha = (n: number) => String(n).repeat(40).slice(0, 40);
// History is newest first.
const history = [sha(3), sha(2), sha(1)];

describe("liveState", () => {
  it("is unknown without build info (next dev)", () => {
    expect(liveState({ deployed: null, target: sha(3), history })).toBe("unknown");
    expect(liveState({ deployed: "dev", target: sha(3), history })).toBe("unknown");
  });
  it("is live when the app was built from the save", () => {
    expect(liveState({ deployed: sha(3), target: sha(3), history })).toBe("live");
  });
  it("is live when the app was built from a newer save", () => {
    expect(liveState({ deployed: sha(3), target: sha(2), history })).toBe("live");
  });
  it("is going live while the app is still built from an older save", () => {
    expect(liveState({ deployed: sha(1), target: sha(3), history, deployedAtSave: sha(1), savedAt: 0, now: 1000 })).toBe(
      "going",
    );
    expect(liveState({ deployed: sha(2), target: sha(3), history })).toBe("going");
  });
  it("says it's slow after ten minutes", () => {
    expect(
      liveState({ deployed: sha(1), target: sha(3), history, deployedAtSave: sha(1), savedAt: 0, now: SLOW_AFTER_MS + 1 }),
    ).toBe("slow");
  });
  it("handles builds of code changes, which aren't in History", () => {
    const code = "c".repeat(40);
    const other = "d".repeat(40);
    // Still the build that was there when saving.
    expect(liveState({ deployed: code, target: sha(3), history, deployedAtSave: code, savedAt: 0, now: 1 })).toBe("going");
    // A new build finished since the save.
    expect(liveState({ deployed: other, target: sha(3), history, deployedAtSave: code, savedAt: 0, now: 1 })).toBe("live");
    // No save from this browser: assume the code change came after the last save.
    expect(liveState({ deployed: code, target: sha(3), history })).toBe("live");
  });
  it("waits for the last commit of a save that was split into batches", () => {
    const pictures = "p".repeat(40);
    const stories = "c".repeat(40);
    const before = "d".repeat(40);
    // The picture batch is built first; it isn't in History yet, and it isn't the save.
    expect(
      liveState({ deployed: pictures, target: stories, history: [stories, before], deployedAtSave: before, savedAt: 0, now: 1, earlier: [pictures] }),
    ).toBe("going");
    // Once History lists both, the order says the same.
    expect(liveState({ deployed: pictures, target: stories, history: [stories, pictures, before], earlier: [pictures] })).toBe("going");
    expect(liveState({ deployed: stories, target: stories, history: [stories, pictures, before], earlier: [pictures] })).toBe("live");
  });
  it("is live when there is nothing to wait for", () => {
    expect(liveState({ deployed: sha(1), target: null, history: [] })).toBe("live");
  });
});
