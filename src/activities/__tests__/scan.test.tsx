import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUPS } from "../../game/letters";
import { ACTIVITIES } from "../activities";
import { clearSpokenTexts, getSpokenTexts } from "../../test/setup";

/**
 * 65 kombinasyonun (5 grup × 13 etkinlik) taraması:
 * hiçbir etkinlik çökmemeli, hata ekranı açılmamalı ve konuşulan metinlerde
 * "undefined" gibi bozuk parçalar bulunmamalı.
 */
const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

/** Kaba kuvvetle çözülemeyen (sıralı/hafızalı) etkinlikler. */
const MULTI_STEP = new Set(["Harf Sırası", "Harf Izgarası", "Kelimeyi Diz", "Hafıza Kartları"]);

describe("etkinlik taraması", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    clearSpokenTexts();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("hiçbir grup/etkinlik kombinasyonu çökmez ve konuşmalar bozulmaz", async () => {
    const problems: string[] = [];
    const spoken = new Set<string>();

    for (const group of GROUPS) {
      for (const a of ACTIVITIES) {
        const C = a.comp;
        let renderError: string | null = null;
        clearSpokenTexts();
        try {
          render(<C group={group} onExit={() => {}} onComplete={() => {}} />);
        } catch (e) {
          renderError = String(e);
        }

        for (let round = 0; round < a.rounds + 2; round++) {
          try {
            const clickable = screen
              .queryAllByRole("button")
              .filter((b) => !b.hasAttribute("disabled") && (b.textContent ?? "").trim() !== "");
            for (const b of clickable) if (b.isConnected) fireEvent.click(b);
          } catch (e) {
            problems.push(`${group.name}/${a.name}: tıklama hatası ${String(e).slice(0, 140)}`);
            break;
          }
          await tick(4000);
        }

        getSpokenTexts().forEach((t) => spoken.add(t));
        const body = document.body.textContent ?? "";
        if (renderError) problems.push(`${group.name}/${a.name}: RENDER HATASI ${renderError.slice(0, 180)}`);
        else if (body.includes("küçük bir şaka")) problems.push(`${group.name}/${a.name}: hata ekranı`);
        cleanup();
      }
    }

    const badSpeech = [...spoken].filter(
      (t) => !t.trim() || /undefined|NaN|\[object |null/.test(t) || t.length > 200,
    );

    expect(problems, problems.join("\n")).toEqual([]);
    expect(badSpeech, badSpeech.join("\n")).toEqual([]);
    expect(spoken.size).toBeGreaterThan(50);
  }, 180000);
});
