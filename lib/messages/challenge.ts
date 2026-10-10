// NEEDS NATIVE REVIEW: the Kinyarwanda (rw) strings are a first draft.
// Challenges, questions and stickers.

export const en = {
  starsN: "{n} stars",
  wellDone: "Well done!",
  letsPlay: "Let's play!",
  start: "Start",
  listenAgain: "Listen again",
  tryAgain: "Try again!",
  great: "Great job!",
  questionNofM: "Question {n} of {m}",
  newSticker: "New sticker!",
  stickerLocked: "Play the challenge to earn this sticker",
  watchFirst: "Watch these stories first",
} as const;

export const rw: Record<keyof typeof en, string> = {
  starsN: "Inyenyeri {n}",
  wellDone: "Wabikoze neza!",
  letsPlay: "Reka dukine!",
  start: "Tangira",
  listenAgain: "Ongera wumve",
  tryAgain: "Ongera ugerageze!",
  great: "Ni byiza cyane!",
  questionNofM: "Ikibazo {n} kuri {m}",
  newSticker: "Igihembo gishya!",
  stickerLocked: "Kina umukino ubone iki gihembo",
  watchFirst: "Banza urebe izi nkuru",
};
