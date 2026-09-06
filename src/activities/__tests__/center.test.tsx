import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUPS } from "../../game/letters";
import { ActivityCenter, ACTIVITIES } from "../activities";

const tick = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };

describe("etkinlik merkezi", () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("13 kartın hepsi her grupta karttan açılıyor", async () => {
    for (const group of GROUPS) {
      let points = 0;
      render(<ActivityCenter group={group} onPoints={(n) => { points += n; }} />);
      for (const a of ACTIVITIES) {
        const card = screen.queryAllByRole("button").find((b) => (b.textContent ?? "").startsWith(a.name));
        expect(card, `${group.name}: "${a.name}" kartı yok`).toBeTruthy();
        fireEvent.click(card!);
        await tick(150);
        const body = document.body.textContent ?? "";
        expect(body, `${group.name}/${a.name}: başlık görünmüyor`).toContain(a.name);
        expect(body, `${group.name}/${a.name}: hata ekranı`).not.toContain("küçük bir şaka");
        // listeden çık ve tekrar gir (sınır durumu: aynı anahtar yeniden kullanılır)
        const back = screen.queryByRole("button", { name: "Etkinlik listesine dön" });
        expect(back, `${group.name}/${a.name}: geri düğmesi yok`).toBeTruthy();
        fireEvent.click(back!);
        await tick(100);
        const card2 = screen.queryAllByRole("button").find((b) => (b.textContent ?? "").startsWith(a.name));
        fireEvent.click(card2!);
        await tick(150);
        expect(document.body.textContent ?? "").toContain(a.name);
        fireEvent.click(screen.getByRole("button", { name: "Etkinlik listesine dön" }));
        await tick(100);
      }
      cleanup();
    }
  }, 120000);
});
