/**
 * Resizes a picture in the browser before it is saved, so even a big phone photo
 * stays well under the upload limits (lib/admin/uploads.ts). The sizes and the
 * maths are in lib/admin/ui-images.ts.
 */
import { ATTEMPTS, dataUrlBytes, fits, PICTURE_SPECS, planPicture, type PictureKind } from "@/lib/admin/ui-images";
import { MAX_UPLOAD_BYTES, type ImageType } from "@/lib/admin/uploads";

export type PreparedPicture = { dataUrl: string; type: ImageType; bytes: number };

export class PictureError extends Error {}

const UNREADABLE = "This file isn't a picture we can use. Choose a JPEG, PNG or WebP picture.";

async function decode(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
    } catch {
      // Some browsers can't make a bitmap from every format; an <img> may still manage.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new PictureError(UNREADABLE);
  }
}

/** True if any pixel is see-through; those pictures stay PNG so the background doesn't turn black. */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 250) return true;
  return false;
}

function toDataUrl(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new PictureError(UNREADABLE));
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new PictureError(UNREADABLE));
        reader.readAsDataURL(blob);
      },
      mime,
      quality,
    );
  });
}

export async function preparePicture(blob: Blob, kind: PictureKind): Promise<PreparedPicture> {
  if (blob.type && !blob.type.startsWith("image/")) throw new PictureError(UNREADABLE);
  const spec = PICTURE_SPECS[kind];
  const image = await decode(blob);
  try {
    const plan = planPicture(image.width, image.height, spec);
    const canvas = document.createElement("canvas");
    let transparent: boolean | null = null;
    for (let attempt = 0; attempt < ATTEMPTS.length; attempt++) {
      const { quality, scale } = ATTEMPTS[attempt]!;
      canvas.width = Math.max(1, Math.round(plan.width * scale));
      canvas.height = Math.max(1, Math.round(plan.height * scale));
      const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d", { willReadFrequently: transparent === null });
      if (!ctx) throw new PictureError("This browser can't resize pictures. Try another browser.");
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (spec.crop) {
        // Always saved as JPEG: give see-through parts a white background instead of black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const { x, y, width, height } = plan.source;
      ctx.drawImage(image.source, x, y, width, height, 0, 0, canvas.width, canvas.height);
      // JPEGs are never see-through, and stories and posters are always shown full-bleed.
      transparent ??= blob.type !== "image/jpeg" && !spec.crop && hasTransparency(ctx, canvas.width, canvas.height);
      const type: ImageType = transparent ? "png" : "jpeg";
      const dataUrl = await toDataUrl(canvas, transparent ? "image/png" : "image/jpeg", quality);
      const bytes = dataUrlBytes(dataUrl);
      if (fits(bytes, attempt, spec)) return { dataUrl, type, bytes };
    }
    throw new PictureError(`This picture is too big even after shrinking it (the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
  } finally {
    image.done();
  }
}

/** The picture the server fetched from YouTube, as a file the resizer can read. */
export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64.replace(/^data:[^,]*,/, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
