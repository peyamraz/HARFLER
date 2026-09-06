import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEngine } from "../shared";

describe("useEngine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hızlı doğru cevap 15 puan verir ve sonucu kaydeder", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useEngine(2, onComplete));

    act(() => {
      result.current.arm();
      result.current.settle(true, "doğru", "yanlış");
    });

    expect(result.current.score).toBe(15);
    expect(result.current.correct).toBe(1);
    expect(result.current.streak).toBe(1);
    expect(result.current.results).toEqual([true]);
    expect(result.current.feedback?.msg).toContain("doğru");
    expect(result.current.feedback?.msg).toContain("EKSTRA +5");
  });

  it("yavaş cevap yalnızca taban puan verir", () => {
    const { result } = renderHook(() => useEngine(3, vi.fn()));
    act(() => result.current.arm());
    act(() => void vi.advanceTimersByTime(5000));
    act(() => result.current.settle(true, "doğru", "yanlış"));

    expect(result.current.score).toBe(10);
    expect(result.current.feedback?.msg).not.toContain("EKSTRA");
  });

  it("yanlış cevap seriyi sıfırlar ve turun sonucunu false yazar", () => {
    const { result } = renderHook(() => useEngine(4, vi.fn()));
    act(() => {
      result.current.arm();
      result.current.settle(false, "", "yanlış");
    });
    expect(result.current.streak).toBe(0);
    expect(result.current.score).toBe(0);
    expect(result.current.results).toEqual([false]);
  });

  it("turlar ilerler ve bitişte yıldız + sonuç raporlanır", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useEngine(2, onComplete));

    act(() => {
      result.current.arm();
      result.current.settle(true, "d1", "y1");
    });
    act(() => void vi.advanceTimersByTime(1600));
    expect(result.current.round).toBe(2);
    expect(result.current.done).toBe(false);

    act(() => {
      result.current.arm();
      result.current.settle(true, "d2", "y2");
    });
    act(() => void vi.advanceTimersByTime(1600));

    expect(result.current.done).toBe(true);
    expect(result.current.stars).toBe(3);
    expect(onComplete).toHaveBeenCalledWith({ score: 30, correct: 2, total: 2, stars: 3 });
    expect(result.current.results).toEqual([true, true]);
  });

  it("aynı turda ikinci kez settle edilmez (çift tıklama koruması)", () => {
    const { result } = renderHook(() => useEngine(3, vi.fn()));
    act(() => {
      result.current.arm();
      result.current.settle(true, "d", "y");
    });
    act(() => result.current.settle(true, "d", "y"));
    expect(result.current.score).toBe(15);
    expect(result.current.results).toEqual([true]);
  });

  it("reset puanı, turu ve sonuçları sıfırlar", () => {
    const { result } = renderHook(() => useEngine(2, vi.fn()));
    act(() => {
      result.current.arm();
      result.current.settle(true, "d", "y");
    });
    act(() => void vi.advanceTimersByTime(1600));

    act(() => result.current.reset());

    expect(result.current.round).toBe(1);
    expect(result.current.score).toBe(0);
    expect(result.current.correct).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.feedback).toBeNull();
    expect(result.current.runId).toBe(1);
  });

  it("reset sonrası bekleyen zamanlayıcı turu ilerletmez", () => {
    const { result } = renderHook(() => useEngine(3, vi.fn()));
    act(() => {
      result.current.arm();
      result.current.settle(true, "d", "y");
    });
    act(() => result.current.reset());
    act(() => void vi.advanceTimersByTime(3000));

    expect(result.current.round).toBe(1);
    expect(result.current.results).toEqual([]);
  });
});
