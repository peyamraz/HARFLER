/** Türkçe ses sentezi sarmalayıcısı — tarayıcının tr-TR sesiyle okur. */

let trVoice: SpeechSynthesisVoice | null = null;
let muted = false;
let speakTimer: number | null = null;

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof SpeechSynthesisUtterance !== "undefined";

function pickVoice() {
  if (!supported) return;
  const voices = window.speechSynthesis.getVoices();
  trVoice =
    voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith("tr")) ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null;
}

if (supported) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
  // Chrome uzun konuşmaları gizlice duraklatabilir; düzenli devam ettir.
  window.setInterval(() => {
    if (!muted && window.speechSynthesis.speaking) window.speechSynthesis.resume();
  }, 3500);
}

export function isSpeechSupported(): boolean {
  return supported;
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) cancelSpeech();
}

export function cancelSpeech() {
  if (!supported) return;
  if (speakTimer !== null) {
    window.clearTimeout(speakTimer);
    speakTimer = null;
  }
  window.speechSynthesis.cancel();
}

/**
 * Metni sesli okur.
 * - cancel() sonrası speak() Chrome'da sessizce yutulabildiği için
 *   konuşma küçük bir gecikmeyle başlatılır.
 * - TTS yoksa/sessizse bile akış aksamaz: onEnd tahmini sürede çağrılır.
 */
export function say(
  text: string,
  opts?: { rate?: number; pitch?: number; onEnd?: () => void },
): void {
  const { rate = 0.82, pitch = 1.12, onEnd } = opts ?? {};
  if (!supported || muted) {
    if (onEnd) window.setTimeout(onEnd, Math.min(750, 280 + text.length * 40));
    return;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd?.();
  };

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "tr-TR";
  if (trVoice) u.voice = trVoice;
  u.rate = rate;
  u.pitch = pitch;
  u.volume = 1;
  u.onend = finish;
  u.onerror = finish;
  // güvenlik: bazı tarayıcılarda onend hiç/geç gelebiliyor
  window.setTimeout(finish, 1800 + text.length * 120);

  if (speakTimer !== null) window.clearTimeout(speakTimer);
  window.speechSynthesis.cancel();
  speakTimer = window.setTimeout(() => {
    speakTimer = null;
    try {
      window.speechSynthesis.speak(u);
    } catch {
      finish();
    }
  }, 90);
}

/** Kelime/cümleleri oyun temposuna göre biraz daha hızlı okur. */
export function sayQuick(text: string, onEnd?: () => void): void {
  say(text, { rate: 0.9, onEnd });
}
