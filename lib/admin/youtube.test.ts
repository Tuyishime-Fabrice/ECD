import { describe, expect, it, vi } from "vitest";
import { lookupVideo, parseYouTube, YouTubeError } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTube", () => {
  it.each([
    ID,
    `  ${ID}\n`,
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://www.youtube.com/watch?feature=share&v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG&index=2`,
    `https://m.youtube.com/watch?v=${ID}&app=m`,
    `https://music.youtube.com/watch?v=${ID}`,
    `http://www.youtube.com/watch?v=${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `youtube.com/watch?v=${ID}`,
    `//www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=AbCdEfGhIjKlMnOp`,
    `https://youtu.be/${ID}?t=10`,
    `youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/embed/${ID}?start=30&rel=0`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}?si=xyz`,
    `https://www.youtube.com/v/${ID}?version=3`,
    `https://WWW.YOUTUBE.COM/watch?v=${ID}`,
    `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=abc" title="YouTube video player" allowfullscreen></iframe>`,
  ])("finds the id in %s", (input) => {
    expect(parseYouTube(input)).toEqual({ ok: true, id: ID });
  });

  it("keeps ids with - and _ as they are", () => {
    expect(parseYouTube("https://youtu.be/a-b_C1d2E3f")).toEqual({ ok: true, id: "a-b_C1d2E3f" });
  });

  it.each([
    ["", /doesn't look like a YouTube link/],
    ["hello world", /doesn't look like a YouTube link/],
    ["dQw4w9WgXc", /doesn't look like a YouTube link/], // 10 characters
    [`https://vimeo.com/${ID}`, /doesn't look like a YouTube link/],
    [`https://notyoutube.com/watch?v=${ID}`, /doesn't look like a YouTube link/],
    [`https://youtube.com.evil.example/watch?v=${ID}`, /doesn't look like a YouTube link/],
    ["https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG", /playlist/],
    ["https://www.youtube.com/@SomeChannel", /doesn't point to one video/],
    ["https://www.youtube.com/watch?v=short", /doesn't point to one video/],
    ["https://www.youtube.com/", /doesn't point to one video/],
  ])("refuses %j in plain words", (input, message) => {
    const result = parseYouTube(input);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
  });
});

const urls = { oembedUrl: "https://yt.test/oembed", thumbnailUrl: "https://img.test/vi" };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

/** A fetch that answers from a table of URL → Response, and 404 otherwise. */
function fakeFetch(table: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return table[url]?.() ?? new Response("nope", { status: 404 });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const oembed = `https://yt.test/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ID}`)}`;

describe("lookupVideo", () => {
  it("returns the title and the biggest picture as base64", async () => {
    const fetchImpl = fakeFetch({
      [oembed]: () => Response.json({ title: " Keza counts mangoes " }),
      [`https://img.test/vi/${ID}/maxresdefault.jpg`]: () => new Response(JPEG),
    });
    const info = await lookupVideo(`https://youtu.be/${ID}?si=x`, urls, fetchImpl);
    expect(info).toEqual({
      id: ID,
      title: "Keza counts mangoes",
      thumbnail: { base64: Buffer.from(JPEG).toString("base64"), type: "image/jpeg" },
    });
  });

  it("falls back to hqdefault when there is no maxresdefault", async () => {
    const fetchImpl = fakeFetch({
      [oembed]: () => Response.json({ title: "T" }),
      [`https://img.test/vi/${ID}/hqdefault.jpg`]: () => new Response(JPEG),
    });
    const info = await lookupVideo(ID, urls, fetchImpl);
    expect(info.thumbnail?.base64).toBe(Buffer.from(JPEG).toString("base64"));
    expect(fetchImpl.mock.calls.map((c) => String(c[0]))).toContain(`https://img.test/vi/${ID}/maxresdefault.jpg`);
  });

  it("gives no picture rather than failing when none can be fetched or it isn't an image", async () => {
    const fetchImpl = fakeFetch({
      [oembed]: () => Response.json({ title: "T" }),
      [`https://img.test/vi/${ID}/maxresdefault.jpg`]: () => new Response("<html>"),
    });
    expect((await lookupVideo(ID, urls, fetchImpl)).thumbnail).toBeNull();
  });

  it("explains a video whose owner turned off embedding", async () => {
    const fetchImpl = fakeFetch({ [oembed]: () => new Response("Unauthorized", { status: 401 }) });
    await expect(lookupVideo(ID, urls, fetchImpl)).rejects.toMatchObject({
      status: 422,
      message: expect.stringMatching(/can't be played inside the app/),
    });
  });

  it("explains a private or deleted video", async () => {
    const fetchImpl = fakeFetch({ [oembed]: () => new Response("Not Found", { status: 404 }) });
    await expect(lookupVideo(ID, urls, fetchImpl)).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/private or deleted/) });
  });

  it("says when YouTube can't be reached", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(lookupVideo(ID, urls, fetchImpl)).rejects.toMatchObject({ status: 502, message: expect.stringMatching(/Couldn't reach YouTube/) });
  });

  it("refuses a bad link before calling YouTube", async () => {
    const fetchImpl = fakeFetch({});
    await expect(lookupVideo("https://vimeo.com/1", urls, fetchImpl)).rejects.toBeInstanceOf(YouTubeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
