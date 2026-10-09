/**
 * Rules for pictures uploaded from the dashboard. No Node imports: the browser
 * can use the same helpers to name files and check them before saving.
 */

export const UPLOAD_DIR = "/images/uploads/";
/** One picture, after the browser has resized it. */
export const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;
/** All pictures in one save. Vercel refuses request bodies over 4.5 MB, and base64 adds a third. */
export const MAX_SAVE_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_UPLOADS_PER_SAVE = 40;

export type ImageType = "jpeg" | "png" | "webp";

export const IMAGE_TYPES: Record<ImageType, { mime: string; extensions: string[]; label: string }> = {
  jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"], label: "JPEG" },
  png: { mime: "image/png", extensions: ["png"], label: "PNG" },
  webp: { mime: "image/webp", extensions: ["webp"], label: "WebP" },
};

const UPLOAD_PATH = /^\/images\/uploads\/[a-z0-9][a-z0-9-]{0,79}\.(jpe?g|png|webp)$/;

/** Reads the first bytes of the file; the name and the browser's claimed type are not trusted. */
export function sniffImage(bytes: Uint8Array): ImageType | null {
  const at = (i: number, ...values: number[]) => values.every((v, k) => bytes[i + k] === v);
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp"; // "RIFF" … "WEBP"
  return null;
}

/** "Keza's One Mango!" → "kezas-one-mango" */
export function slugify(text: string, maxLength = 40): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
}

function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A fresh public path for a new picture, e.g. "/images/uploads/kezas-one-mango-3f9a1c0b.jpg". */
export function uploadPath(name: string, type: ImageType, suffix = randomSuffix()): string {
  return `${UPLOAD_DIR}${slugify(name) || "picture"}-${slugify(suffix, 16)}.${IMAGE_TYPES[type].extensions[0]}`;
}

/** Accepts "/images/uploads/x.png" or "public/images/uploads/x.png"; null if it isn't a safe upload path. */
export function normalizeUploadPath(path: string): string | null {
  const publicPath = path.startsWith("public/") ? path.slice("public".length) : path;
  return UPLOAD_PATH.test(publicPath) ? publicPath : null;
}

export const extensionType = (publicPath: string): ImageType | null => {
  const ext = publicPath.slice(publicPath.lastIndexOf(".") + 1);
  return (Object.keys(IMAGE_TYPES) as ImageType[]).find((t) => IMAGE_TYPES[t].extensions.includes(ext)) ?? null;
};

/** Strict base64 (a "data:…;base64," prefix is allowed); null if it isn't. */
export function decodeBase64(text: string): Uint8Array | null {
  const data = text.replace(/^data:[\w/+.-]+;base64,/, "").replace(/\s+/g, "");
  if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Roughly how many bytes a base64 string holds, without decoding it. */
export const base64Size = (text: string) => Math.floor((text.replace(/^data:[^,]*,/, "").length * 3) / 4);

export const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
