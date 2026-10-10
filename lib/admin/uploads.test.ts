import { describe, expect, it } from "vitest";
import { decodeBase64, normalizeUploadPath, slugify, sniffImage, uploadPath } from "./uploads";

describe("uploads", () => {
  it("sniffs JPEG, PNG and WebP from their first bytes only", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xdb]))).toBe("jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8L"))).toBe("webp");
    expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WAVEfmt "))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });

  it("makes safe, unique file names", () => {
    expect(slugify("Keza’s One Mango!")).toBe("kezas-one-mango");
    expect(slugify("Umwembe w'umukecuru — Ubwiza")).toBe("umwembe-wumukecuru-ubwiza");
    expect(slugify("Café à Kigali")).toBe("cafe-a-kigali");
    expect(uploadPath("Keza's One Mango", "jpeg", "3f9a1c0b")).toBe("/images/uploads/kezas-one-mango-3f9a1c0b.jpg");
    expect(uploadPath("!!!", "webp", "ab")).toBe("/images/uploads/picture-ab.webp");
    const random = uploadPath("x", "png");
    expect(random).toMatch(/^\/images\/uploads\/x-[0-9a-f]{8}\.png$/);
    expect(normalizeUploadPath(random)).toBe(random);
    expect(uploadPath("x", "png")).not.toBe(random);
  });

  it("decodes strict base64 only", () => {
    expect(decodeBase64("aGk=")).toEqual(new Uint8Array([104, 105]));
    expect(decodeBase64("data:image/png;base64,aGk=")).toEqual(new Uint8Array([104, 105]));
    expect(decodeBase64("aG\nk=")).toEqual(new Uint8Array([104, 105]));
    for (const bad of ["", "aGk", "a$k=", "aGk=aGk="]) expect(decodeBase64(bad)).toBeNull();
  });
});
