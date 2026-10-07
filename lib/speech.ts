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
  letsPlay: { audio: {} as Partial<Record<Lang, string>>, text: "Let's play!" },
};
export type VoiceLine = keyof typeof VOICE_LINES;

let current: HTMLAudioElement | null = null;

export function stopVoice() {
  if (current) {
    current.pause();
    current = null;
  }
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
  const fallback = () => {
    if (opts.placeholderVoice) speakEnglish(fallbackText);
  };
  if (!src) {
    fallback();
    return;
  }
  const audio = new Audio(src);
  current = audio;
  audio.addEventListener("error", fallback, { once: true });
  audio.play().catch((err: unknown) => {
    // NotAllowedError = no tap yet; anything else = file problem.
    if (!(err instanceof DOMException && err.name === "NotAllowedError")) fallback();
  });
}

export function playPrompt(question: Question, opts: VoiceOptions) {
  play(question.promptAudio?.[opts.lang], question.promptText.en, opts);
}

export function sayLine(line: VoiceLine, opts: VoiceOptions) {
  const { audio, text } = VOICE_LINES[line];
  play(audio[opts.lang], text, opts);
}
