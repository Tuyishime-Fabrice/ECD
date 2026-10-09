/**
 * Turns whatever YouTube link the person pastes into a video id, then gets the
 * title (oEmbed) and a picture to store in the repository, so kid screens never
 * load images from YouTube.
 */
import { IMAGE_TYPES, MAX_UPLOAD_BYTES, sniffImage } from "./uploads";

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = ["youtube.com", "youtu.be", "youtube-nocookie.com"];
const PATH_ID = /^\/(?:embed|shorts|live|v|e|watch)\/([^/?#]+)/;

export const NOT_A_LINK =
  "That doesn't look like a YouTube link. On YouTube, press Share, copy the link and paste it here.";
const PLAYLIST = "This is a link to a playlist. Open one video, press Share and copy that link.";
const NOT_A_VIDEO = "This YouTube link doesn't point to one video. Open the video, press Share and copy that link.";

export type ParsedVideo = { ok: true; id: string } | { ok: false; error: string };

export function parseYouTube(input: string): ParsedVideo {
  let text = input.trim();
  // Pasted embed code: <iframe src="https://www.youtube.com/embed/…">
  const src = /\bsrc=["']([^"']+)["']/i.exec(text);
  if (src) text = src[1]!.trim();
  if (ID.test(text)) return { ok: true, id: text };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text.replace(/^\/\//, "")}`);
  } catch {
    return { ok: false, error: NOT_A_LINK };
  }
  const host = url.hostname.toLowerCase();
  if (!HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return { ok: false, error: NOT_A_LINK };

  const candidate =
    host === "youtu.be" || host.endsWith(".youtu.be")
      ? url.pathname.split("/")[1]
      : (url.searchParams.get("v") ?? PATH_ID.exec(url.pathname)?.[1]);
  if (candidate && ID.test(candidate)) return { ok: true, id: candidate };
  if (url.searchParams.has("list")) return { ok: false, error: PLAYLIST };
  return { ok: false, error: NOT_A_VIDEO };
}

export class YouTubeError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
  }
}

export type VideoInfo = { id: string; title: string; thumbnail: { base64: string; type: string } | null };
export type YouTubeUrls = { oembedUrl: string; thumbnailUrl: string };

const TIMEOUT_MS = 10_000;

async function get(fetchImpl: typeof fetch, url: string): Promise<Response | null> {
  try {
    return await fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return null;
  }
}

export async function videoTitle(id: string, urls: YouTubeUrls, fetchImpl: typeof fetch = fetch): Promise<string> {
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const res = await get(fetchImpl, `${urls.oembedUrl}?format=json&url=${encodeURIComponent(watch)}`);
  if (!res) throw new YouTubeError("Couldn't reach YouTube. Check the internet connection and try again.", 502);
  // YouTube answers 401 when the owner turned off playing the video on other sites.
  if (res.status === 401 || res.status === 403) {
    throw new YouTubeError(
      "This video can't be played inside the app: its owner doesn't allow it on other sites. Choose another video.",
      422,
    );
  }
  if (res.status === 400 || res.status === 404) {
    throw new YouTubeError("We couldn't find this video. It may be private or deleted. Check the link.", 404);
  }
  if (!res.ok) throw new YouTubeError("YouTube didn't answer properly. Try again in a minute.", 502);
  const data = (await res.json().catch(() => ({}))) as { title?: unknown };
  return typeof data.title === "string" ? data.title.trim() : "";
}

/**
 * The biggest 16:9 picture YouTube has (maxresdefault, 1280×720), else hqdefault
 * (480×360, letterboxed: crop it to 16:9). Null if neither can be fetched.
 */
export async function videoThumbnail(id: string, urls: YouTubeUrls, fetchImpl: typeof fetch = fetch) {
  for (const name of ["maxresdefault.jpg", "hqdefault.jpg"]) {
    const res = await get(fetchImpl, `${urls.thumbnailUrl}/${id}/${name}`);
    if (!res?.ok) continue;
    const bytes = new Uint8Array(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
    const type = sniffImage(bytes);
    if (!type || bytes.length > MAX_UPLOAD_BYTES) continue;
    return { base64: Buffer.from(bytes).toString("base64"), type: IMAGE_TYPES[type].mime };
  }
  return null;
}

export async function lookupVideo(
  input: string,
  urls: YouTubeUrls,
  fetchImpl: typeof fetch = fetch,
): Promise<VideoInfo> {
  const parsed = parseYouTube(input);
  if (!parsed.ok) throw new YouTubeError(parsed.error, 400);
  const [title, thumbnail] = await Promise.all([
    videoTitle(parsed.id, urls, fetchImpl),
    videoThumbnail(parsed.id, urls, fetchImpl),
  ]);
  return { id: parsed.id, title, thumbnail };
}
