/**
 * All brand values live here. Change them and the whole app follows:
 * page titles, the header, the install manifest and the parent area.
 *
 * Colors live in app/globals.css (the @theme block) — see README.
 */
export const brand = {
  /** Shown in the header, browser tab and installed-app name. PLACEHOLDER name. */
  name: "Izuba",
  /** Short name under the home-screen icon (max ~12 characters). */
  shortName: "Izuba",
  tagline: {
    rw: "Twige intambwe ku yindi",
    en: "Learning, one step at a time",
  },
  /** Square logo used in the header and as the favicon. */
  logo: "/icons/logo.svg",
  /** Browser/OS chrome color (sky-700). */
  themeColor: "#1572A8",
  /** Splash-screen background (cream-50). */
  backgroundColor: "#FFF9EE",
  /**
   * Parent area only. The Contact card stays hidden while this is empty.
   * Fill in your WhatsApp number to show it, e.g.
   *   contactLink: "https://wa.me/250781234567",
   *   contactLabel: "+250 781 234 567",
   */
  contactLink: "",
  contactLabel: "",
  /**
   * Prefix for everything saved on the device. Changing it starts every
   * family from zero, so leave it alone after launch.
   */
  storagePrefix: "izuba:",
} as const;

/**
 * Video used by every episode whose youtubeId is "DEMO".
 * PLACEHOLDER: this is the sample video from YouTube's own IFrame API docs.
 * Replace it with one of your own uploads (embedding must be allowed).
 */
export const DEMO_YOUTUBE_ID = "M7lc1UVf-VE";
