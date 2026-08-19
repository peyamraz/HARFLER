/** WebAudio ile sentezlenen net oyun sesleri — ses dosyası gerektirmez. */

let ctx: AudioContext | null = null;
let muted = false;

export function setSfxMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  when?: number;
  slideTo?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  const c = ac();
  if (!c) return;
  try {
    const { type = "sine", vol = 0.16, when = 0, slideTo } = opts;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* sessizce geç */
  }
}

export const sfx = {
  /** hafif dokunuş */
  tap() {
    tone(540, 0.06, { type: "triangle", vol: 0.12 });
  },
  /** harf / kart pop */
  pop() {
    tone(330, 0.06, { type: "square", vol: 0.1 });
    tone(660, 0.09, { type: "triangle", vol: 0.14, when: 0.05 });
  },
  /** doğru cevap — yükselen akor */
  correct() {
    tone(523.25, 0.12, { type: "triangle", vol: 0.18 });
    tone(659.25, 0.12, { type: "triangle", vol: 0.18, when: 0.09 });
    tone(783.99, 0.2, { type: "triangle", vol: 0.18, when: 0.18 });
  },
  /** yanlış — kısa vızıltı */
  wrong() {
    tone(196, 0.22, { type: "sawtooth", vol: 0.14, slideTo: 110 });
    tone(98, 0.24, { type: "square", vol: 0.08, when: 0.06 });
  },
  /** geri sayım tıkı */
  tick() {
    tone(880, 0.05, { type: "sine", vol: 0.12 });
  },
  /** kart çevirme */
  flip() {
    tone(420, 0.07, { type: "triangle", vol: 0.12, slideTo: 620 });
  },
  /** seri / parlama */
  sparkle() {
    tone(988, 0.08, { type: "sine", vol: 0.12 });
    tone(1319, 0.12, { type: "sine", vol: 0.12, when: 0.07 });
  },
  /** bitiş fanfarı */
  win() {
    tone(523.25, 0.14, { type: "triangle", vol: 0.18 });
    tone(659.25, 0.14, { type: "triangle", vol: 0.18, when: 0.12 });
    tone(783.99, 0.14, { type: "triangle", vol: 0.18, when: 0.24 });
    tone(1046.5, 0.34, { type: "triangle", vol: 0.2, when: 0.36 });
    tone(783.99, 0.3, { type: "sine", vol: 0.1, when: 0.36 });
  },
};
