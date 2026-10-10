import { describe, expect, it } from "vitest";
import { MODULES, t } from "./i18n";

describe("messages", () => {
  it("no key is defined in two modules", () => {
    const seen = new Map<string, string>();
    for (const [name, mod] of Object.entries(MODULES)) {
      for (const key of Object.keys(mod.en)) {
        expect(seen.get(key), `"${key}" is in both ${seen.get(key)} and ${name}`).toBeUndefined();
        seen.set(key, name);
      }
    }
  });
  it("every module has the same keys in both languages", () => {
    for (const mod of Object.values(MODULES)) expect(Object.keys(mod.rw).sort()).toEqual(Object.keys(mod.en).sort());
  });
  it("fills in variables", () => {
    expect(t("en", "episodeN", { n: 3 })).toMatch(/3/);
  });
});
