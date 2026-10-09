/**
 * Layout for a collection's path map: stones climb a winding road from the
 * bottom of the page (story 1) to the summit (the last item). Pure, so it is
 * unit-tested and the same on the server and in the browser.
 *
 * x is a fraction of the map width (0–1). y is in px from the top of the map.
 * The road is drawn in a viewBox that is DESIGN_WIDTH wide and scaled to the
 * real width (with non-scaling strokes), so stones and road always line up.
 */
export const DESIGN_WIDTH = 400;

export type PathInput = { id: string; kind: "story" | "challenge"; current: boolean };
export type PathNode = PathInput & { x: number; y: number; size: number };
export type PathLayout = { nodes: PathNode[]; height: number; road: string; walked: string };

const SIZE = { story: 72, challenge: 92, current: 100 } as const;
const GAP = { story: 116, challenge: 138 } as const;
/** Extra room around the current stone: the mascot stands above it, the title pill sits below. */
const CURRENT_ROOM = { above: 70, below: 46 };
const BOTTOM = 150;
const TOP = 210;
/** The road swings left and right of the middle by this fraction of the width. */
const SWING = 0.24;

export function layoutPath(items: PathInput[]): PathLayout {
  if (!items.length) return { nodes: [], height: BOTTOM + TOP, road: "", walked: "" };

  // Distance of each stone's centre from the bottom of the map.
  const fromBottom: number[] = [];
  let y = BOTTOM;
  items.forEach((item, i) => {
    if (i > 0) {
      y += GAP[item.kind];
      if (items[i - 1]!.current) y += CURRENT_ROOM.above;
    }
    if (item.current) y += CURRENT_ROOM.below;
    fromBottom.push(y);
  });
  const height = y + TOP + (items.at(-1)!.current ? CURRENT_ROOM.above : 0);

  const nodes = items.map((item, i) => ({
    ...item,
    // Gentle serpentine, starting in the middle.
    x: 0.5 + SWING * Math.sin((i * Math.PI) / 2.4),
    y: height - fromBottom[i]!,
    size: item.current ? SIZE.current : SIZE[item.kind],
  }));

  const points = nodes.map((n) => [n.x * DESIGN_WIDTH, n.y] as const);
  const first = points[0]!;
  const last = points.at(-1)!;
  // The road enters from the bottom edge and leaves toward the summit.
  const road = smoothPath([[first[0], height + 20], ...points, [last[0], Math.max(0, last[1] - 120)]]);

  const currentIndex = nodes.findIndex((n) => n.current);
  const walkedTo = currentIndex >= 0 ? currentIndex : -1;
  const walked = walkedTo >= 0 ? smoothPath([[first[0], height + 20], ...points.slice(0, walkedTo + 1)]) : "";

  return { nodes, height, road, walked };
}

/** Catmull-Rom spline through the points, as cubic Bézier segments. */
export function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return "";
  const p = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))]!;
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M${r(p(0)[0])} ${r(p(0)[1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r(c1[0]!)} ${r(c1[1]!)} ${r(c2[0]!)} ${r(c2[1]!)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}
