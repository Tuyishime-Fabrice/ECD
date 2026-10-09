import { describe, expect, it } from "vitest";
import { layoutPath, smoothPath } from "./path-layout";

const items = (n: number, current = -1) =>
  Array.from({ length: n }, (_, i) => ({
    id: `i${i}`,
    kind: (i + 1) % 5 === 0 ? ("challenge" as const) : ("story" as const),
    current: i === current,
  }));

describe("layoutPath", () => {
  it("climbs: the first item is at the bottom, the last at the top", () => {
    const { nodes, height } = layoutPath(items(10));
    expect(nodes[0]!.y).toBeGreaterThan(nodes.at(-1)!.y);
    for (let i = 1; i < nodes.length; i++) expect(nodes[i]!.y).toBeLessThan(nodes[i - 1]!.y);
    expect(nodes.at(-1)!.y).toBeGreaterThan(0);
    expect(nodes[0]!.y).toBeLessThan(height);
  });

  it("keeps stones inside the map and at least 64px", () => {
    for (const n of layoutPath(items(30, 7)).nodes) {
      expect(n.x).toBeGreaterThan(0.2);
      expect(n.x).toBeLessThan(0.8);
      expect(n.size).toBeGreaterThanOrEqual(64);
    }
  });

  it("gives the current stone room for the mascot and its title", () => {
    const plain = layoutPath(items(6));
    const withCurrent = layoutPath(items(6, 2));
    expect(withCurrent.height).toBeGreaterThan(plain.height);
    const n = withCurrent.nodes;
    expect(n[2]!.size).toBe(100);
    expect(n[2]!.y - n[3]!.y).toBeGreaterThan(plain.nodes[2]!.y - plain.nodes[3]!.y);
  });

  it("draws the walked road only up to the current stone", () => {
    expect(layoutPath(items(6)).walked).toBe("");
    const { walked, road } = layoutPath(items(6, 3));
    expect(walked.split("C").length).toBeLessThan(road.split("C").length);
  });

  it("handles an empty or one-item collection", () => {
    expect(layoutPath([]).nodes).toEqual([]);
    expect(layoutPath(items(1, 0)).nodes).toHaveLength(1);
  });
});

describe("smoothPath", () => {
  it("passes through every point", () => {
    const d = smoothPath([
      [0, 0],
      [10, 10],
      [20, 0],
    ]);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d).toContain(" 10 10");
    expect(d.endsWith(" 20 0")).toBe(true);
  });
});
