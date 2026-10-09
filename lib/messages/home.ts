// NEEDS NATIVE REVIEW: the Kinyarwanda (rw) strings are a first draft.
// Home.

export const en = {
  hello: "Hello!",
  continue: "Continue",
  keepWatching: "Keep watching",
  watch: "Watch",
  upNext: "Up next",
  storiesProgress: "{n} of {m} stories",
  path: "Path",
  storyPath: "Your story path",
  openPath: "Open the path",
  comingSoonHeading: "Coming soon",
  prevSlide: "Previous story",
  nextSlide: "Next story",
  goToSlide: "Show story {n}",
  featured: "Featured stories",
} as const;

export const rw: Record<keyof typeof en, string> = {
  hello: "Muraho!",
  continue: "Komeza",
  keepWatching: "Komeza urebe",
  watch: "Reba",
  upNext: "Ikurikira",
  storiesProgress: "Inkuru {n} kuri {m}",
  path: "Inzira",
  storyPath: "Inzira y'inkuru zawe",
  openPath: "Fungura inzira",
  comingSoonHeading: "Biraza vuba",
  prevSlide: "Inkuru ibanza",
  nextSlide: "Inkuru ikurikiraho",
  goToSlide: "Erekana inkuru ya {n}",
  featured: "Inkuru zatoranyijwe",
};
