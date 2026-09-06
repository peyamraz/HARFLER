import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUPS } from "../letters";
import { clearSpokenTexts, getSpokenTexts } from "../../test/setup";
import { REMEMBER_SECONDS, TOTAL_ROUNDS, useSoundGame } from "../useSoundGame";

/** Test konuşma motorunun zamanlaması: 90 ms gecikme + 300 ms konuşma. */
const SPEECH_FLOW_MS = 90 + 300;
const COUNTDOWN_MS = REMEMBER_SECONDS * 1000;
const FEEDBACK_MS = 3400;

/** startGame → 1. turun cevap ekranı. */
function startToAnswer(hook: { current: ReturnType<typeof useSoundGame> }) {
  act(() => hook.current.startGame());
  act(() => void vi.advanceTimersByTime(400)); // playRound(1)
  act(() => void vi.advanceTimersByTime(SPEECH_FLOW_MS)); // "dinle" biter
  expect(hook.current.status).toBe("remember");
  act(() => void vi.advanceTimersByTime(COUNTDOWN_MS));
  expect(hook.current.status).toBe("answer");
}

/** feedback → sonraki turun cevap ekranı. */
function nextToAnswer(hook: { current: ReturnType<typeof useSoundGame> }) {
  act(() => void vi.advanceTimersByTime(FEEDBACK_MS)); // advanceRound
  expect(hook.current.status).toBe("playing");
  act(() => void vi.advanceTimersByTime(SPEECH_FLOW_MS));
  expect(hook.current.status).toBe("remember");
  act(() => void vi.advanceTimersByTime(COUNTDOWN_MS));
  expect(hook.current.status).toBe("answer");
}

describe("useSoundGame", () => {
  /* ---- söylemler kısa ve tek işli olmalı (uzun cümleler kesiliyor) ---- */
  it("tur söylemi yalnızca harfin sesi — komut kelimesi yok", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    clearSpokenTexts();
    act(() => result.current.startGame());
    act(() => void vi.advanceTimersByTime(400 + SPEECH_FLOW_MS)); // playRound(1) + sesin kaydı

    const texts = getSpokenTexts();
    expect(texts, "tur başında birden çok söylem var").toHaveLength(1);
    expect(texts[0], "tur başında komut kelimesi söylenmemeli").toBe(
      result.current.target!.say,
    );
    expect(texts[0]).not.toMatch(/dinle|kulaklar|s\u0131ra|\u00f6rnek|haz\u0131r m\u0131/i);
  });

  it("doğru cevapta yalnızca harfin sesi okunur", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    act(() => result.current.startGame());
    act(() => void vi.advanceTimersByTime(400));
    act(() => void vi.advanceTimersByTime(SPEECH_FLOW_MS));
    act(() => void vi.advanceTimersByTime(COUNTDOWN_MS));

    const target = result.current.target!;
    clearSpokenTexts();
    act(() => result.current.pick(target, undefined));
    act(() => void vi.advanceTimersByTime(SPEECH_FLOW_MS));

    expect(getSpokenTexts()).toEqual([target.say]);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("başlangıçta oyun kapalıdır", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    expect(result.current.status).toBe("start");
    expect(result.current.score).toBe(0);
    expect(result.current.round).toBe(0);
  });

  it("tur akışı: dinle → hatırla → cevap", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    act(() => result.current.startGame());
    expect(result.current.status).toBe("playing");

    act(() => void vi.advanceTimersByTime(400));
    expect(result.current.round).toBe(1);
    expect(result.current.target).not.toBeNull();
    expect(result.current.tiles).toHaveLength(GROUPS[0].letters.length);

    act(() => void vi.advanceTimersByTime(SPEECH_FLOW_MS));
    expect(result.current.status).toBe("remember");
    expect(result.current.rememberLeft).toBe(REMEMBER_SECONDS);

    act(() => void vi.advanceTimersByTime(COUNTDOWN_MS / 2));
    expect(result.current.status).toBe("remember");
    expect(result.current.rememberLeft).toBeLessThanOrEqual(REMEMBER_SECONDS / 2 + 0.2);

    act(() => void vi.advanceTimersByTime(COUNTDOWN_MS));
    expect(result.current.status).toBe("answer");
  });

  it("hızlı doğru cevap taban puan + hızlı bonusu verir (15)", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    const target = result.current.target!;
    act(() => result.current.pick(target));

    expect(result.current.status).toBe("feedback");
    expect(result.current.score).toBe(15);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.bonusText).toContain("HIZLI");
    expect(result.current.answeredIn).not.toBeNull();
    expect(result.current.answeredIn!).toBeLessThan(3);
  });

  it("yavaş doğru cevap yalnızca taban puan verir (10)", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    act(() => void vi.advanceTimersByTime(3200));
    const target = result.current.target!;
    act(() => result.current.pick(target));

    expect(result.current.score).toBe(10);
    expect(result.current.bonusText).toBeNull();
    expect(result.current.answeredIn).toBeCloseTo(3.2, 1);
  });

  it("3. seriden sonra seri bonusu eklenir (20 puan)", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    for (let round = 1; round <= 4; round++) {
      const target = result.current.target!;
      act(() => result.current.pick(target));
      if (round < 4) nextToAnswer(result);
    }

    // 15 + 15 + 15 + 20 (hızlı + seri)
    expect(result.current.score).toBe(65);
    expect(result.current.streak).toBe(4);
    expect(result.current.bestStreak).toBe(4);
    expect(result.current.bonusText).toContain("SERİ");
  });

  it("yanlış cevap puan vermez, seriyi sıfırlar ve turda tutar", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    const wrong = result.current.tiles.find((t) => t.id !== result.current.target!.id)!;
    act(() => result.current.pick(wrong));

    expect(result.current.status).toBe("answer");
    expect(result.current.score).toBe(0);
    expect(result.current.streak).toBe(0);
    expect(result.current.wrongId).toBe(wrong.id);

    act(() => void vi.advanceTimersByTime(600));
    expect(result.current.wrongId).toBeNull();

    act(() => result.current.pick(result.current.target!));
    expect(result.current.score).toBe(15);
  });

  it("süre dolunca doğru ses gösterilir, puan verilmez", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    const target = result.current.target!;
    act(() => result.current.reveal());

    expect(result.current.status).toBe("feedback");
    expect(result.current.correctId).toBe(target.id);
    expect(result.current.score).toBe(0);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.streak).toBe(0);
  });

  it("klavye: 1-6 tuşları ilgili kutuyu seçer", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    const target = result.current.target!;
    const key = String(result.current.tiles.findIndex((t) => t.id === target.id) + 1);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    });

    expect(result.current.status).toBe("feedback");
    expect(result.current.score).toBe(15);
  });

  it("oyun durdurulunca tur kendiliğinden geri gelmez", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    act(() => result.current.startGame());
    act(() => void vi.advanceTimersByTime(400)); // "dinle" aşaması
    expect(result.current.status).toBe("playing");

    act(() => result.current.stopGame());
    act(() => void vi.advanceTimersByTime(COUNTDOWN_MS * 3));

    expect(result.current.status).toBe("start");
    expect(result.current.round).toBe(0);
  });

  it("hatırla aşamasında durdurulunca cevap ekranı açılmaz", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    act(() => result.current.startGame());
    act(() => void vi.advanceTimersByTime(400));
    act(() => void vi.advanceTimersByTime(SPEECH_FLOW_MS));
    expect(result.current.status).toBe("remember");

    act(() => result.current.stopGame());
    act(() => void vi.advanceTimersByTime(COUNTDOWN_MS * 2));

    expect(result.current.status).toBe("start");
    expect(result.current.round).toBe(0);
  });

  it("tam oyun rekoru kaydeder ve bitti durumuna geçer", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    startToAnswer(result);

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      act(() => result.current.pick(result.current.target!));
      if (round < TOTAL_ROUNDS) nextToAnswer(result);
    }
    act(() => void vi.advanceTimersByTime(FEEDBACK_MS));

    expect(result.current.status).toBe("done");
    expect(result.current.round).toBe(TOTAL_ROUNDS);
    expect(result.current.correctCount).toBe(TOTAL_ROUNDS);
    expect(result.current.score).toBe(10 * 15 + 7 * 5); // ilk 3 tur seri bonusuz
    expect(result.current.newRecord).toBe(true);
    expect(result.current.record).toBe(result.current.score);
    expect(Number(localStorage.getItem("ses-avi-rekor-anetil"))).toBe(result.current.score);
  });

  it("rekor yalnızca geçilince yenilenir", () => {
    localStorage.setItem("ses-avi-rekor-anetil", "9999");
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    expect(result.current.record).toBe(9999);

    startToAnswer(result);
    act(() => result.current.pick(result.current.target!));
    act(() => void vi.advanceTimersByTime(FEEDBACK_MS));
    expect(result.current.record).toBe(9999);
  });

  it("sessizlik tercihi cihaza yazılır", () => {
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    expect(result.current.muted).toBe(false);

    act(() => result.current.toggleMute());
    expect(result.current.muted).toBe(true);
    expect(localStorage.getItem("ses-avi-sessiz")).toBe("1");

    act(() => result.current.toggleMute());
    expect(result.current.muted).toBe(false);
    expect(localStorage.getItem("ses-avi-sessiz")).toBe("0");
  });

  it("kayıtlı sessizlik açılışta uygulanır", () => {
    localStorage.setItem("ses-avi-sessiz", "1");
    const { result } = renderHook(() => useSoundGame(GROUPS[0]));
    expect(result.current.muted).toBe(true);
  });

  it("grup değişince oyun durur ve o grubun rekoru yüklenir", () => {
    localStorage.setItem("ses-avi-rekor-okurim", "42");
    const { result, rerender } = renderHook(({ g }: { g: (typeof GROUPS)[number] }) => useSoundGame(g), {
      initialProps: { g: GROUPS[0] },
    });
    startToAnswer(result);
    expect(result.current.status).toBe("answer");

    rerender({ g: GROUPS[1] });
    expect(result.current.status).toBe("start");
    expect(result.current.record).toBe(42);
  });
});
