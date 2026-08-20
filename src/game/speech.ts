/** Türkçe ses sentezi sarmalayıcısı — tarayıcının tr-TR sesiyle okur.
 *  Tüm erişimler korunaklıdır: ses motoru hiç çalışmazsa bile oyun akmaya devam eder. */

let trVoice: SpeechSynthesisVoice | null = null;
let muted = false;
let speakTimer: number | null = null;

const supported = (() => {
  try {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    );
  } catch {
    return false;
  }
})();

/** speechSynthesis nesnesine güvenli erişim — kısıtlı ortamlarda null döner. */
function synth(): SpeechSynthesis | null {
  try {
    if (!supported) return null;
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

function pickVoice() {
  try {
    const s = synth();
    if (!s) return;
    const voices = s.getVoices();
    trVoice =
      voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith("tr")) ??
      voices.find((v) => v.default) ??
      voices[0] ??
      null;
  } catch {
    trVoice = null;
  }
}

try {
  if (supported) {
    pickVoice();
    const s = synth();
    if (s) s.onvoiceschanged = pickVoice;
    // Chrome uzun konuşmaları gizlice duraklatabilir; düzenli devam ettir.
    window.setInterval(() => {
      try {
        const s2 = synth();
        if (s2 && !muted && s2.speaking) s2.resume();
      } catch {
        /* geç */
      }
    }, 3500);
  }
} catch {
  /* ses motoru hiç yoksa oyun yine çalışır */
}

export function isSpeechSupported(): boolean {
  return supported && synth() !== null;
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) cancelSpeech();
}

export function cancelSpeech() {
  try {
    if (speakTimer !== null) {
      window.clearTimeout(speakTimer);
      speakTimer = null;
    }
    const s = synth();
    if (s) s.cancel();
  } catch {
    /* geç */
  }
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

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    try {
      onEnd?.();
    } catch {
      /* geç */
    }
  };

  const s = synth();
  if (!s || muted) {
    window.setTimeout(finish, Math.min(750, 280 + text.length * 40));
    return;
  }

  try {
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
    s.cancel();
    speakTimer = window.setTimeout(() => {
      speakTimer = null;
      try {
        s.speak(u);
      } catch {
        finish();
      }
    }, 90);
  } catch {
    finish();
  }
}

/** Kelime/cümleleri oyun temposuna göre biraz daha hızlı okur. */
export function sayQuick(text: string, onEnd?: () => void): void {
  say(text, { rate: 0.9, onEnd });
}
