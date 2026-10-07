/**
 * Short UI sounds made on the fly with the Web Audio API — no audio files,
 * no licensing questions. All of them respect the parent's sound setting.
 */

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a tap handler so later sounds are allowed to play on mobile. */
export function unlockAudio() {
  audio();
}

function tone(
  freq: number,
  { at = 0, dur = 0.15, type = "sine" as Wave, gain = 0.18, slideTo }: { at?: number; dur?: number; type?: Wave; gain?: number; slideTo?: number } = {},
) {
  const ac = audio();
  if (!ac || !enabled) return;
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Light tap feedback. */
export function playPop() {
  tone(520, { dur: 0.09, slideTo: 880, gain: 0.16 });
}

/** Happy rising arpeggio for correct answers and finished episodes. */
export function playCheer() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, type: "triangle", gain: 0.2 }));
  tone(1568, { at: 0.38, dur: 0.3, gain: 0.08 });
}

/** Soft, neutral "hmm" for a wrong answer — never a buzzer. */
export function playTryAgain() {
  tone(392, { dur: 0.16, type: "sine", gain: 0.14 });
  tone(349.23, { at: 0.14, dur: 0.22, type: "sine", gain: 0.12 });
}

/** Gentle "not yet" for locked or coming-soon cards. */
export function playLocked() {
  tone(262, { dur: 0.1, type: "triangle", gain: 0.12 });
  tone(262, { at: 0.13, dur: 0.12, type: "triangle", gain: 0.1 });
}

/** Sparkly glissando for stickers. */
export function playSparkle() {
  [880, 1174.66, 1396.91, 1760].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.18, gain: 0.1 }));
}
