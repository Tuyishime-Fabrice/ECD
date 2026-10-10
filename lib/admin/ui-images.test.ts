import { describe, expect, it } from "vitest";
import { ATTEMPTS, dataUrlBytes, fits, PICTURE_SPECS, planPicture } from "./ui-images";
import { MAX_UPLOAD_BYTES } from "./uploads";

describe("planPicture", () => {
  it("keeps a 1280×720 YouTube picture as it is", () => {
    expect(planPicture(1280, 720, PICTURE_SPECS.story)).toEqual({
      source: { x: 0, y: 0, width: 1280, height: 720 },
      width: 1280,
      height: 720,
    });
  });
  it("cuts the black bars off a 480×360 YouTube picture", () => {
    expect(planPicture(480, 360, PICTURE_SPECS.story)).toEqual({
      source: { x: 0, y: 45, width: 480, height: 270 },
      width: 480,
      height: 270,
    });
  });
  it("crops a tall phone photo to 16:9 from the middle and shrinks it", () => {
    const plan = planPicture(3024, 4032, PICTURE_SPECS.story);
    expect(plan.source).toEqual({ x: 0, y: 1165, width: 3024, height: 1701 });
    expect([plan.width, plan.height]).toEqual([1280, 720]);
  });
  it("crops a wide picture from the middle", () => {
    expect(planPicture(4000, 1000, PICTURE_SPECS.poster).source).toEqual({ x: 1333, y: 0, width: 1333, height: 1000 });
  });
  it("fits answers and stickers inside 512×512 without cropping", () => {
    expect(planPicture(2000, 1000, PICTURE_SPECS.answer)).toEqual({
      source: { x: 0, y: 0, width: 2000, height: 1000 },
      width: 512,
      height: 256,
    });
    expect(planPicture(300, 900, PICTURE_SPECS.sticker)).toMatchObject({ width: 171, height: 512 });
  });
  it("never enlarges a small picture", () => {
    expect(planPicture(200, 120, PICTURE_SPECS.answer)).toMatchObject({ width: 200, height: 120 });
    expect(planPicture(1, 1, PICTURE_SPECS.story)).toMatchObject({ width: 1, height: 1 });
  });
});

describe("file size", () => {
  it("accepts a picture under the target at once", () => {
    expect(fits(100_000, 0, PICTURE_SPECS.answer)).toBe(true);
    expect(fits(400_000, 0, PICTURE_SPECS.answer)).toBe(false);
  });
  it("accepts anything under the hard limit on the last try", () => {
    const last = ATTEMPTS.length - 1;
    expect(fits(900_000, last, PICTURE_SPECS.answer)).toBe(true);
    expect(fits(MAX_UPLOAD_BYTES + 1, last, PICTURE_SPECS.answer)).toBe(false);
  });
  it("tries lower quality first, then fewer pixels", () => {
    expect(ATTEMPTS[0]).toEqual({ quality: 0.86, scale: 1 });
    for (let i = 1; i < ATTEMPTS.length; i++) {
      expect(ATTEMPTS[i]!.quality).toBeLessThanOrEqual(ATTEMPTS[i - 1]!.quality);
      expect(ATTEMPTS[i]!.scale).toBeLessThanOrEqual(ATTEMPTS[i - 1]!.scale);
    }
  });
  it("counts the bytes in a data URL", () => {
    expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("data:image/png;base64,AAA=")).toBe(2);
    expect(dataUrlBytes("data:image/png;base64,AA==")).toBe(1);
    expect(dataUrlBytes(`data:image/jpeg;base64,${btoa("x".repeat(1000))}`)).toBe(1000);
  });
});
