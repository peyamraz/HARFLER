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

    // Gereksiz/geveze söylemler ve kesilmeye açık uzun cümleler yasak.
    const NOISE = [/\u00f6rnek:/i, /kulaklar haz\u0131r/i, /haz\u0131r m\u0131/i, /sesi, .* harfi/i, /dinle ve tekrar et/i, /s\u00fcre doldu/i];
    const noisy = [...spoken].filter((t) => NOISE.some((re) => re.test(t)));
    const tooLong = [...spoken].filter((t) => t.length > 70);
    const repeated = [...spoken].filter((t) => /^(\S+)\. \1[,.]/.test(t));

    expect(problems, problems.join("\n")).toEqual([]);
    expect(badSpeech, badSpeech.join("\n")).toEqual([]);
    expect(noisy, "gereksiz söylem: " + noisy.join(" | ")).toEqual([]);
    expect(tooLong, "kesilmeye açık uzun söylem: " + tooLong.join(" | ")).toEqual([]);
    expect(repeated, "kelime iki kez söyleniyor: " + repeated.join(" | ")).toEqual([]);
    expect(spoken.size).toBeGreaterThan(50);
  }, 180000);
});
