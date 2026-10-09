// NEEDS NATIVE REVIEW: the Kinyarwanda (rw) strings are a first draft.
// Watch page and end screen.

export const en = {
  replay: "Start again",
  watchAgain: "Watch again",
  doItAtHome: "Do it at home",
  forParents: "For parents",
  nextEpisode: "Next story",
  tapToPlay: "Tap to play",
  videoErrorTitle: "Oops! This story can't play right now.",
  videoErrorHint: "Check the internet connection and try again.",
} as const;

export const rw: Record<keyof typeof en, string> = {
  replay: "Tangira bundi bushya",
  watchAgain: "Ongera urebe",
  doItAtHome: "Bikore mu rugo",
  forParents: "Ku babyeyi",
  nextEpisode: "Inkuru ikurikira",
  tapToPlay: "Kanda ukine",
  videoErrorTitle: "Ihangane! Iyi nkuru ntishoboye gukina ubu.",
  videoErrorHint: "Reba niba murandasi ikora, hanyuma wongere ugerageze.",
};
