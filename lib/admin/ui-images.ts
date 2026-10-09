/**
 * Sizes for pictures the dashboard uploads. The browser resizes every picture
 * with a canvas before saving (components/admin/pictures.ts); the maths lives
 * here so it can be tested. Limits come from lib/admin/uploads.ts.
 */
import { MAX_UPLOAD_BYTES } from "./uploads";

export type PictureKind = "story" | "poster" | "sticker" | "answer";

export type PictureSpec = {
  width: number;
  height: number;
  /** Cut to exactly this shape (cover); otherwise keep the shape and fit inside. */
  crop: boolean;
  /** Aim for this many bytes so several pictures fit in one save. */
  targetBytes: number;
};

export const PICTURE_SPECS: Record<PictureKind, PictureSpec> = {
  // Story cards and the Home slider are 16:9.
  story: { width: 1280, height: 720, crop: true, targetBytes: 450_000 },
  // Collection posters are 4:3, like the built-in ones.
  poster: { width: 800, height: 600, crop: true, targetBytes: 350_000 },
  sticker: { width: 512, height: 512, crop: false, targetBytes: 300_000 },
  answer: { width: 512, height: 512, crop: false, targetBytes: 250_000 },
};

export type Rect = { x: number; y: number; width: number; height: number };
export type Plan = { source: Rect; width: number; height: number };

/**
 * Which part of the source to draw, and how big. Never enlarges a small picture.
 * Cropping keeps the middle (a 4:3 YouTube picture with black bars loses the bars).
 */
export function planPicture(sourceWidth: number, sourceHeight: number, spec: Pick<PictureSpec, "width" | "height" | "crop">): Plan {
  const w = Math.max(1, Math.round(sourceWidth));
  const h = Math.max(1, Math.round(sourceHeight));
  let source: Rect = { x: 0, y: 0, width: w, height: h };
  if (spec.crop) {
    const aspect = spec.width / spec.height;
    if (w / h > aspect) {
      const width = Math.round(h * aspect);
      source = { x: Math.floor((w - width) / 2), y: 0, width, height: h };
    } else {
      const height = Math.round(w / aspect);
      source = { x: 0, y: Math.floor((h - height) / 2), width: w, height };
    }
  }
  const scale = Math.min(1, spec.width / source.width, spec.height / source.height);
  return {
    source,
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

/**
 * Ways to make the file smaller, tried in order until it fits: lower JPEG quality
 * first, then fewer pixels. A PNG (kept for see-through pictures) only shrinks.
 */
export const ATTEMPTS: { quality: number; scale: number }[] = [
  { quality: 0.86, scale: 1 },
  { quality: 0.78, scale: 1 },
  { quality: 0.7, scale: 1 },
  { quality: 0.7, scale: 0.8 },
  { quality: 0.62, scale: 0.64 },
  { quality: 0.55, scale: 0.5 },
];

/** True when the file is small enough to keep: under the target, or the last try and under the hard limit. */
export function fits(bytes: number, attempt: number, spec: Pick<PictureSpec, "targetBytes">): boolean {
  if (bytes <= spec.targetBytes) return true;
  return attempt >= ATTEMPTS.length - 1 && bytes <= MAX_UPLOAD_BYTES;
}

/** Bytes of a base64 data URL ("data:image/jpeg;base64,…"). */
export function dataUrlBytes(dataUrl: string): number {
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
}
