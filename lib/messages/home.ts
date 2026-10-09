// NEEDS NATIVE REVIEW: the Kinyarwanda (rw) strings are a first draft.
// Home.

export const en = {
  hello: "Hello!",
  continue: "Continue",
} as const;

export const rw: Record<keyof typeof en, string> = {
  hello: "Muraho!",
  continue: "Komeza",
};
