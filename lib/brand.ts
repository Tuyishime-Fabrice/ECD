/**
 * All brand values live here. Change them and the whole app follows:
 * page titles, the header, the install manifest and the parent area.
 * The WhatsApp number and featured stories live in content/site.json (admin dashboard).
 *
 * Colors live in app/globals.css (the @theme block) — see README.
 */
export const brand = {
  /** Shown in the browser tab, the installed-app name and the parent area. */
  name: "ECD Imuhira",
  /** Short name under the home-screen icon (max ~12 characters). */
  shortName: "Imuhira",
  /** The logo's tagline. */
  tagline: {
    rw: "Iga · Kina · Kura",
    en: "Learn · Play · Grow",
  },
  /** One line for search results and the install prompt. */
  description: "Educative story videos for children aged 3–6, at home.",
  /** The logo mark alone (house, play button, open book): favicon and small places. */
  logo: "/brand/mark.svg",
  /** Brand colors from the logo. The app's light/dark tokens live in app/globals.css. */
  colors: { teal: "#124C4A", coral: "#EC775F", mustard: "#F2B83F", cream: "#FCEFD5", sage: "#BDCDCD" },
  /** Browser/OS chrome color: the logo's teal. */
  themeColor: "#124C4A",
  /** Splash-screen background: the page's cream. */
  backgroundColor: "#FBF6EC",
  /**
   * Prefix for everything saved on the device. Changing it starts every
   * family from zero, so leave it alone after launch (it keeps the app's first name).
   */
  storagePrefix: "izuba:",
} as const;

/**
 * Video used by every episode whose youtubeId is "DEMO".
 * PLACEHOLDER: this is the sample video from YouTube's own IFrame API docs.
 * Replace it with one of your own uploads (embedding must be allowed).
 */
export const DEMO_YOUTUBE_ID = "M7lc1UVf-VE";
