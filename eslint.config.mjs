import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Images are tiny local SVGs served as-is (static export, no image optimizer),
      // so plain <img loading="lazy"> is the lighter choice.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // The service worker runs in its own global scope.
    files: ["scripts/sw-template.js"],
    languageOptions: { globals: { self: "readonly", caches: "readonly" } },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
