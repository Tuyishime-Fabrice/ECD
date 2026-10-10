import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Mascot, type MascotPose } from "./Mascot";

type Art = {
  Doc: new () => { defsMarkup: string };
  mascot: (doc: unknown, pose: string, prefix: string) => string;
};

// The generators are plain .mjs files without types.
async function loadArt(): Promise<Art> {
  const lib = await import(new URL("../scripts/art/lib.mjs", import.meta.url).href);
  const art = await import(new URL("../scripts/art/mascot.mjs", import.meta.url).href);
  return { Doc: lib.Doc, mascot: art.mascot };
}

/**
 * Markup reduced to what is drawn: sorted attributes, numbers as numbers, no class or style
 * (the motion), and wrapper <g>s that carry nothing else dropped.
 */
function drawing(markup: string): string {
  const out: string[] = [];
  const dropped: boolean[] = [];
  for (const [, close, name, attrs = "", selfClosing] of markup.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    if (close) {
      if (name === "g" && dropped.pop()) continue;
      out.push(`</${name}>`);
      continue;
    }
    const kept = [...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)]
      .filter(([, key]) => key !== "class" && key !== "style")
      .map(([, key, value]) => `${key}="${/^-?\d*\.?\d+$/.test(value!) ? Number(value) : value}"`)
      .sort();
    const drop = name === "g" && kept.length === 0;
    if (name === "g" && !selfClosing) dropped.push(drop);
    if (drop) continue;
    out.push(`<${name}${kept.map((a) => ` ${a}`).join("")}>`);
    if (selfClosing) out.push(`</${name}>`);
  }
  return out.join("\n");
}

const POSES: MascotPose[] = ["happy", "wave", "cheer", "oops", "sleep"];

describe("Mascot", () => {
  it.each(POSES)("draws the same %s pose as scripts/art/mascot.mjs", async (pose) => {
    const { Doc, mascot } = await loadArt();
    const doc = new Doc();
    const body = mascot(doc, pose, "m");
    const expected = drawing(doc.defsMarkup + body);

    const svg = renderToStaticMarkup(<Mascot pose={pose} />);
    const prefix = /<radialGradient id="([^"]+)f"/.exec(svg)?.[1];
    expect(prefix).toBeTruthy();
    const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replaceAll(prefix!, "m");
    expect(drawing(inner)).toBe(expected);
  });

  it("gives every mascot on a page its own gradient ids", () => {
    const html = renderToStaticMarkup(
      <>
        <Mascot />
        <Mascot pose="sleep" />
      </>,
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
