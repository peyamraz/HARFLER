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

const PREF_KEY = "harfler-ses-tercihi";

function readPref(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}
function writePref(name: string | null): void {
  try {
    if (name) localStorage.setItem(PREF_KEY, name);
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* depolama kapalıysa tercih oturumluk kalır */
  }
}

/**
 * Türkçe sesler arasında kalite sıralaması. Aynı cihazda birden çok Türkçe ses
 * olabiliyor ve aralarında ciddi fark var: Chrome'un çevrimiçi (Google) sesi ve
 * "Natural/Neural" adlı sesler, eski Windows SAPI seslerinden çok daha anlaşılır.
 * Çocuk "net gelmiyor" diyorsa genelde neden düşük kaliteli sesin seçilmesidir.
 */
function voiceScore(v: SpeechSynthesisVoice): number {
  const name = (v.name ?? "").toLowerCase();
  const lang = (v.lang ?? "").toLowerCase().replace("_", "-");
  let score = 0;
  if (lang === "tr-tr") score += 4;
  else if (lang.startsWith("tr")) score += 2;
  if (name.includes("google")) score += 6;
  if (/(natural|neural|online|premium|enhanced|studio)/.test(name)) score += 5;
  if (v.localService === false) score += 3; // ağ üzerinden gelen motor
  if (/(sapi|microsoft)/.test(name)) score -= 2; // eski Windows sesleri robotik
  if (v.default) score += 1;
  return score;
}

let allTurkish: SpeechSynthesisVoice[] = [];

function pickVoice() {
  if (!supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) voiceKnown = true;
  // YALNIZCA Türkçe ses atanır: Türkçe olmayan bir ses (ör. İngilizce) Türkçe
  // metne verilirse kelimeler yanlış telaffuzla okunur. Türkçe ses yoksa voice
  // alanı boş bırakılır, tarayıcı u.lang = "tr-TR" ile kendi seçsin.
  allTurkish = voices.filter(isTurkish).sort((a, b) => voiceScore(b) - voiceScore(a));
  const pref = readPref();
  trVoice = (pref ? allTurkish.find((v) => v.name === pref) : undefined) ?? allTurkish[0] ?? null;
  notify();
}

/** Cihazdaki Türkçe sesler (kaliteye göre sıralı) — arayüzdeki seçici için. */
export function getTurkishVoices(): { name: string; label: string }[] {
  return allTurkish.map((v) => ({
    name: v.name,
    label: `${v.name}${v.localService === false ? " · çevrimiçi" : ""}`,
  }));
}

/** Sesi elle seç; null verilirse otomatik (en kaliteli) seçime dönülür. */
export function setPreferredVoice(name: string | null): void {
  writePref(name);
  cancelSpeech();
  pickVoice();
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
  /** speak() gerçekten başladı mı diye bakılan denetim. */
  startCheck: number | null;
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
  if (a.startCheck !== null) window.clearTimeout(a.startCheck);
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

  const entry: ActiveSpeech = {
    watchdog: null,
    pending: null,
    startCheck: null,
    done: false,
    onEnd,
  };
  active = entry;

  const finish = () => {
    if (entry.done) return;
    closeActive(false);
    onEnd?.();
  };

  let retried = false;

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
        return;
      }
      // Chrome cancel() sonrası ilk speak()'i bazen sessizce yutar: ses hiç
      // başlamaz, çocuk hiçbir şey duymaz. Başlamadıysa bir kez daha dene.
      entry.startCheck = window.setTimeout(() => {
        entry.startCheck = null;
        if (entry.done) return;
        try {
          const s = window.speechSynthesis;
          if (!s.speaking && !s.pending) {
            retried = true;
            s.speak(u);
          }
        } catch {
          /* yoksay */
        }
      }, 300);
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
