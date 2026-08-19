/* Küçük WebAudio sentezi — retro bip sesleri. Harici dosya yok. */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  freq: number,
  dur = 0.08,
  type: OscillatorType = "square",
  vol = 0.045,
  when = 0,
  slideTo?: number,
) {
  const c = ac();
  if (!c || muted) return;
  try {
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  } catch {
    /* ses yoksa oyun devam eder */
  }
}

export const sfx = {
  eat() {
    blip(520, 0.07, "square", 0.05);
    blip(784, 0.09, "square", 0.04, 0.055);
  },
  bonus() {
    blip(659, 0.07, "square", 0.05);
    blip(880, 0.07, "square", 0.05, 0.06);
    blip(1319, 0.14, "square", 0.05, 0.12);
  },
  spawn() {
    blip(440, 0.06, "triangle", 0.045);
    blip(660, 0.09, "triangle", 0.045, 0.07);
  },
  die() {
    blip(300, 0.42, "sawtooth", 0.06, 0, 55);
    blip(170, 0.5, "square", 0.04, 0.06, 45);
  },
  click() {
    blip(300, 0.05, "square", 0.03);
  },
  pause() {
    blip(494, 0.06, "triangle", 0.045);
    blip(330, 0.09, "triangle", 0.045, 0.07);
  },
  resume() {
    blip(330, 0.06, "triangle", 0.045);
    blip(494, 0.09, "triangle", 0.045, 0.07);
  },
  start() {
    blip(392, 0.08, "square", 0.05);
    blip(523, 0.08, "square", 0.05, 0.09);
    blip(659, 0.14, "square", 0.05, 0.18);
  },
  record() {
    blip(523, 0.09, "square", 0.05);
    blip(659, 0.09, "square", 0.05, 0.09);
    blip(784, 0.09, "square", 0.05, 0.18);
    blip(1047, 0.22, "square", 0.055, 0.27);
  },
};
