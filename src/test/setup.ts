/**
 * Test ortamı: jsdom'da bulunmayan konuşma sentezi API'sini taklit eder.
 * Gerçek Chrome davranışına sadık kalır: cancel() çağrısı konuşmanın
 * onend olayını TETİKLER (oyun akışındaki iptal yarışını test edebilmek için).
 */

class MockUtterance {
  text: string;
  lang = "";
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text?: string) {
    this.text = text ?? "";
  }
}

const SPEECH_MS = 300;

let currentUtterance: MockUtterance | null = null;
let speakTimer: ReturnType<typeof setTimeout> | null = null;
const spoken: string[] = [];

/** Testlerin "ne söylendi?" diye bakabilmesi için. */
export function getSpokenTexts(): string[] {
  return spoken;
}

export function clearSpokenTexts(): void {
  spoken.length = 0;
}

const synth = {
  speaking: false,
  paused: false,
  pending: false,
  onvoiceschanged: null as null | (() => void),
  getVoices: () => [
    { name: "Türkçe Test Sesi", lang: "tr-TR", default: true, voiceURI: "tr-TR-test" },
  ],
  speak(u: MockUtterance) {
    spoken.push(u.text);
    currentUtterance = u;
    this.speaking = true;
    speakTimer = setTimeout(() => {
      speakTimer = null;
      currentUtterance = null;
      this.speaking = false;
      u.onend?.();
    }, SPEECH_MS);
  },
  cancel() {
    if (speakTimer !== null) {
      clearTimeout(speakTimer);
      speakTimer = null;
    }
    const u = currentUtterance;
    currentUtterance = null;
    this.speaking = false;
    if (u) u.onend?.();
  },
  pause() {},
  resume() {},
  addEventListener() {},
  removeEventListener() {},
};

Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  value: MockUtterance,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "speechSynthesis", {
  value: synth,
  writable: true,
  configurable: true,
});
Object.defineProperty(window, "speechSynthesis", {
  value: synth,
  writable: true,
  configurable: true,
});

/** Konuşma süresi (testlerin zamanlayıcı ilerletme adımları buna göre). */
export const MOCK_SPEECH_MS = SPEECH_MS;
