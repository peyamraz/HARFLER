/**
 * Puanlama kuralları — saf (yan etkisiz) fonksiyonlar.
 * Hem "Ses Avı" ana oyunu hem de etkinlik motoru aynı kuralları kullanır,
 * böylece puan hesabı tek yerden yönetilir ve test edilebilir.
 */

export const BASE_POINTS = 10;
export const BONUS_POINTS = 5;
/** Bu seri sayısına ulaşınca (ve sonrasında) seri bonusu verilir. */
export const STREAK_BONUS_FROM = 3;
/** Ses Avı: cevap ekranı açıldıktan sonra bu süre içinde cevap "hızlı" sayılır. */
export const GAME_FAST_ANSWER_MS = 3000;
/** Etkinlikler: soru gösterildikten sonra bu süre içinde cevap "hızlı" sayılır. */
export const ACTIVITY_FAST_ANSWER_MS = 4000;

export interface ScoreInput {
  /** Cevap için geçen süre (ms). Süre ölçülmediyse Infinity verilebilir. */
  elapsedMs: number;
  /** Bu cevaptan ÖNCEKİ seri sayısı. */
  streakBefore: number;
  fastMs?: number;
}

export interface ScoreBreakdown {
  /** Kazanılan toplam puan (taban + bonuslar). */
  points: number;
  /** Sadece bonusların toplamı. */
  bonus: number;
  fast: boolean;
  hot: boolean;
}

export function scoreAnswer({
  elapsedMs,
  streakBefore,
  fastMs = GAME_FAST_ANSWER_MS,
}: ScoreInput): ScoreBreakdown {
  const fast = Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs <= fastMs;
  const hot = streakBefore >= STREAK_BONUS_FROM;
  const bonus = (fast ? BONUS_POINTS : 0) + (hot ? BONUS_POINTS : 0);
  return { points: BASE_POINTS + bonus, bonus, fast, hot };
}

/** Çocuk için kısa kutlama metni; bonus yoksa null. */
export function bonusLabel(fast: boolean, hot: boolean): string | null {
  if (fast && hot) return "HIZLI + SERİ = EKSTRA PUAN!";
  if (fast) return `HIZLI KULAK! EKSTRA +${BONUS_POINTS}`;
  if (hot) return `SERİ BONUSU! EKSTRA +${BONUS_POINTS}`;
  return null;
}

/** Geçen süreyi saniyeye (tek ondalık) çevirir; başlangıç yoksa null. */
export function elapsedSeconds(startedAt: number, now: number = Date.now()): number | null {
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
  const ms = Math.max(0, now - startedAt);
  return Math.round(ms / 100) / 10;
}

/** Ses Avı bitiş yıldızları (puan bazlı; 10 tur × en fazla 20 puan = 200). */
export function starsForScore(score: number): number {
  if (score >= 160) return 3;
  if (score >= 100) return 2;
  if (score >= 50) return 1;
  return 0;
}

/** Etkinlik bitiş yıldızları (doğru oranı bazlı). */
export function starsForRatio(correct: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.65) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}
