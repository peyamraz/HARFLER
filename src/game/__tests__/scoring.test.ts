import { describe, expect, it } from "vitest";
import {
  ACTIVITY_FAST_ANSWER_MS,
  BASE_POINTS,
  GAME_FAST_ANSWER_MS,
  STREAK_BONUS_FROM,
  bonusLabel,
  elapsedSeconds,
  scoreAnswer,
  starsForRatio,
  starsForScore,
} from "../scoring";

describe("scoreAnswer", () => {
  it("yalnızca doğru cevaba taban puan verir", () => {
    const r = scoreAnswer({ elapsedMs: 9999, streakBefore: 0 });
    expect(r.points).toBe(BASE_POINTS);
    expect(r.bonus).toBe(0);
    expect(r.fast).toBe(false);
    expect(r.hot).toBe(false);
  });

  it("hızlı cevaba +5 verir (sınır değeri dahil)", () => {
    expect(scoreAnswer({ elapsedMs: GAME_FAST_ANSWER_MS, streakBefore: 0 }).points).toBe(15);
    expect(scoreAnswer({ elapsedMs: GAME_FAST_ANSWER_MS + 1, streakBefore: 0 }).points).toBe(10);
  });

  it("3 ve üzeri seriye +5 verir", () => {
    expect(scoreAnswer({ elapsedMs: 9999, streakBefore: STREAK_BONUS_FROM - 1 }).points).toBe(10);
    expect(scoreAnswer({ elapsedMs: 9999, streakBefore: STREAK_BONUS_FROM }).points).toBe(15);
  });

  it("hızlı + seri birlikte +10 verir", () => {
    const r = scoreAnswer({ elapsedMs: 500, streakBefore: 4 });
    expect(r.points).toBe(20);
    expect(r.bonus).toBe(10);
    expect(r.fast).toBe(true);
    expect(r.hot).toBe(true);
  });

  it("süre ölçülemediyse hızlı saymaz (Infinity) ama seri bonusu korunur", () => {
    const r = scoreAnswer({ elapsedMs: Number.POSITIVE_INFINITY, streakBefore: 5 });
    expect(r.fast).toBe(false);
    expect(r.hot).toBe(true);
    expect(r.points).toBe(15);
  });

  it("etkinlikler kendi hızlı cevap eşiğini kullanır", () => {
    const r = scoreAnswer({
      elapsedMs: GAME_FAST_ANSWER_MS + 500,
      streakBefore: 0,
      fastMs: ACTIVITY_FAST_ANSWER_MS,
    });
    expect(r.fast).toBe(true);
    expect(r.points).toBe(15);
  });

  it("negatif süre hızlı sayılmaz", () => {
    expect(scoreAnswer({ elapsedMs: -10, streakBefore: 0 }).fast).toBe(false);
  });
});

describe("bonusLabel", () => {
  it("her bonus için ayrı metin üretir, bonus yoksa null", () => {
    expect(bonusLabel(true, true)).toContain("HIZLI + SERİ");
    expect(bonusLabel(true, false)).toContain("HIZLI KULAK");
    expect(bonusLabel(false, true)).toContain("SERİ BONUSU");
    expect(bonusLabel(false, false)).toBeNull();
  });
});

describe("elapsedSeconds", () => {
  it("ms'yi tek ondalıklı saniyeye çevirir", () => {
    expect(elapsedSeconds(1000, 2250)).toBe(1.3);
    expect(elapsedSeconds(1000, 6000)).toBe(5);
  });

  it("başlangıç yoksa null döner", () => {
    expect(elapsedSeconds(0)).toBeNull();
    expect(elapsedSeconds(Number.NaN)).toBeNull();
  });

  it("gelecek zaman damgası negatif sonuç vermez", () => {
    expect(elapsedSeconds(9999, 100)).toBe(0);
  });
});

describe("yıldızlar", () => {
  it("puana göre yıldız verir", () => {
    expect(starsForScore(0)).toBe(0);
    expect(starsForScore(50)).toBe(1);
    expect(starsForScore(100)).toBe(2);
    expect(starsForScore(160)).toBe(3);
    expect(starsForScore(200)).toBe(3);
  });

  it("doğru oranına göre yıldız verir", () => {
    expect(starsForRatio(0, 8)).toBe(0);
    expect(starsForRatio(4, 8)).toBe(1);
    expect(starsForRatio(6, 8)).toBe(2);
    expect(starsForRatio(8, 8)).toBe(3);
    expect(starsForRatio(1, 0)).toBe(0);
  });
});
