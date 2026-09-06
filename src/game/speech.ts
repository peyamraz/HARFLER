/** Türkçe ses sentezi sarmalayıcısı — tarayıcının tr-TR sesiyle okur. */

let trVoice: SpeechSynthesisVoice | null = null;
let voiceKnown = false; // ses listesi en az bir kez geldi mi (Chrome bunu geç yükler)
let muted = false;
let speakTimer: number | null = null;

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof SpeechSynthesisUtterance !== "undefined";

export interface VoiceState {
  /** Tarayıcıda konuşma sentezi API'si var mı? */
  supported: boolean;
  /** Ses listesi yüklendi mi? (yüklendiyse turkish bilgisi güvenilirdir) */
  ready: boolean;
  /** Türkçe bir ses bulundu mu? */
  turkish: boolean;
  /** Kullanılacak sesin adı (tanı koymak için arayüzde gösterilir). */
  name: string | null;
}

type Listener = (s: VoiceState) => void;
const listeners = new Set<Listener>();

function currentState(): VoiceState {
  const turkish = trVoice !== null && isTurkish(trVoice);
  return { supported, ready: voiceKnown, turkish, name: turkish ? trVoice!.name : null };
}

function notify() {
  const s = currentState();
  listeners.forEach((l) => l(s));
}

function isTurkish(v: SpeechSynthesisVoice): boolean {
  return !!v.lang && v.lang.toLowerCase().replace("_", "-").startsWith("tr");
}

function pickVoice() {
  if (!supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) voiceKnown = true;
  // YALNIZCA Türkçe ses atanır: Türkçe olmayan bir ses (ör. İngilizce) Türkçe
  // metne verilirse kelimeler yanlış telaffuzla okunur. Türkçe ses yoksa voice
  // alanı boş bırakılır, tarayıcı u.lang = "tr-TR" ile kendi seçsin.
  trVoice = voices.find(isTurkish) ?? null;
  notify();
}

if (supported) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
  // Chrome uzun konuşmaları gizlice duraklatabilir. Yalnızca gerçekten
  // durakladıysa devam ettir: konuşurken resume() bazı tarayıcılarda
  // cümlenin başa sarmasına/takılmasına yol açabiliyor.
  window.setInterval(() => {
    if (muted) return;
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch {
      /* yoksay */
    }
  }, 3500);
}

export function isSpeechSupported(): boolean {
  return supported;
}

/** Anlık ses durumu + değişiklik dinleyicisi (Türkçe ses yoksa arayüz uyarır). */
export function getVoiceState(): VoiceState {
  return currentState();
}

export function onVoiceStateChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) cancelSpeech();
}

export function isMuted(): boolean {
  return muted;
}

interface ActiveSpeech {
  /** Güvenlik zamanlayıcısı (onend gelmezse akış tıkanmasın). */
  watchdog: number | null;
  pending: number | null;
  done: boolean;
  onEnd?: () => void;
}

let active: ActiveSpeech | null = null;

function closeActive(runOnEnd: boolean) {
  const a = active;
  active = null;
  if (!a) return;
  if (a.watchdog !== null) window.clearTimeout(a.watchdog);
  if (a.pending !== null) window.clearTimeout(a.pending);
  if (!a.done) {
    a.done = true;
    // Kesintiye uğrayan konuşma "bitti" sayılır: oyun akışı takılı kalmasın.
    if (runOnEnd) a.onEnd?.();
  }
}

/** Konuşmayı dışarıdan durdurur (oyun durdu, ses kapatıldı): onEnd ÇAĞRILMAZ. */
export function cancelSpeech() {
  closeActive(false);
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
 * - Yeni bir konuşma öncekini keserse önceki onEnd yine çağrılır
 *   (aksi hâlde tur akışı "dinle" aşamasında takılı kalırdı).
 */
export function say(
  text: string,
  opts?: { rate?: number; pitch?: number; onEnd?: () => void },
): void {
  const { rate = 0.82, pitch = 1.12, onEnd } = opts ?? {};

  // önceki konuşmayı kapat (onEnd'i çalıştırarak)
  closeActive(true);

  if (!supported || muted) {
    if (onEnd) window.setTimeout(onEnd, Math.min(750, 280 + text.length * 40));
    return;
  }

  const entry: ActiveSpeech = { watchdog: null, pending: null, done: false, onEnd };
  active = entry;

  const finish = () => {
    if (entry.done) return;
    closeActive(false);
    onEnd?.();
  };

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
    entry.watchdog = window.setTimeout(finish, 1800 + text.length * 120);

    if (speakTimer !== null) window.clearTimeout(speakTimer);
    window.speechSynthesis.cancel();
    speakTimer = window.setTimeout(() => {
      speakTimer = null;
      entry.pending = null;
      try {
        window.speechSynthesis.speak(u);
      } catch {
        finish();
      }
    }, 90);
    entry.pending = speakTimer;
  } catch {
    finish();
  }
}

/** Kelime/cümleleri oyun temposuna göre biraz daha hızlı okur. */
export function sayQuick(text: string, onEnd?: () => void): void {
  say(text, { rate: 0.9, onEnd });
}
