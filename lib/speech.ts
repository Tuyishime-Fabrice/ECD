/**
 * Spoken instructions. Plays the recorded file for the current language
 * when there is one; otherwise, in demo mode, reads the English text with
 * the device's built-in voice (to be replaced by real recordings).
 */
import type { Question } from "@/content/types";
import type { Lang } from "./progress";

export type VoiceOptions = { lang: Lang; placeholderVoice: boolean };

/**
 * Short spoken lines used by the app itself. Add recordings to /public/audio/ui
 * and fill in the paths, e.g. tryAgain: { rw: "/audio/ui/try-again.rw.mp3" }.
 */
export const VOICE_LINES = {
  tryAgain: { audio: {} as Partial<Record<Lang, string>>, text: "Try again!" },
  great: { audio: {} as Partial<Record<Lang, string>>, text: "Great job!" },
};
export type VoiceLine = keyof typeof VOICE_LINES;

/** 10 ms of silence, used once to unlock audio on the first tap. */
const SILENCE =
  "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

/**
 * One audio element for every prompt. Safari only lets an element play
 * sound once a tap has started it, so it is unlocked once (primeVoice) and
 * then reused — new elements created later, e.g. after a timer, stay silent.
 */
let voiceEl: HTMLAudioElement | null = null;
/** The source currently meant to be heard; anything else finishing or failing is ignored. */
let currentSrc: string | null = null;
let primed = false;

function element(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  voiceEl ??= new Audio();
  return voiceEl;
}

/** Call from a tap: unlocks the shared audio element and the speech engine. */
export function primeVoice() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const el = element();
  if (el && !currentSrc) {
    el.src = SILENCE;
    el.play().catch(() => {});
  }
  if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
}

export function stopVoice() {
  currentSrc = null;
  voiceEl?.pause();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("en"));
  if (voice) utterance.voice = voice;
  synth.cancel();
  synth.speak(utterance);
}

function play(src: string | undefined, fallbackText: string, opts: VoiceOptions) {
  stopVoice();
  const el = element();
  if (!src || !el) {
    if (opts.placeholderVoice) speakEnglish(fallbackText);
    return;
  }
  currentSrc = src;
  // Only a recording that is still wanted may fall back to the placeholder voice:
  // a prompt cut short by an answer, or by the next question, stays quiet.
  const fallback = () => {
    if (currentSrc === src && opts.placeholderVoice) speakEnglish(fallbackText);
  };
  el.onerror = fallback;
  el.src = src;
  el.play().catch((err: unknown) => {
    // AbortError: interrupted on purpose. NotAllowedError: no tap yet. Anything else: file problem.
    if (err instanceof DOMException && (err.name === "AbortError" || err.name === "NotAllowedError")) return;
    fallback();
  });
}

export function playPrompt(question: Question, opts: VoiceOptions) {
  play(question.promptAudio?.[opts.lang], question.promptText.en, opts);
}

export function sayLine(line: VoiceLine, opts: VoiceOptions) {
  const { audio, text } = VOICE_LINES[line];
  play(audio[opts.lang], text, opts);
}
