import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUPS, type GroupDef } from "../../game/letters";
import { ACTIVITIES } from "../activities";
import { getSpokenTexts } from "../../test/setup";
import type { ActivityResult } from "../shared";

const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

const buttons = () => screen.queryAllByRole("button").filter((b) => !b.hasAttribute("disabled"));
const click = (b: Element) => fireEvent.click(b);

/** Kutu/çip düğmelerinin üzerindeki harfi okur. */
const charOf = (b: Element) => (b.textContent ?? "").trim();
const labelOf = (b: Element) => b.getAttribute("aria-label") ?? "";

/* ---------------- etkinlik çözücüler ---------------- */

/** Harf Sırası: harfleri öğrenme sırasıyla tıkla. */
async function solveOrder(group: GroupDef) {
  for (const l of group.letters) {
    const tile = buttons().find((b) => labelOf(b) === `${l.char} harfi`);
    expect(tile, `${l.char} kutusu yok`).toBeTruthy();
    click(tile!);
    await tick(20);
  }
  await tick(2200);
}

/** Harf Izgarası: hedef harfin tüm hücrelerini tıkla. */
async function solveGrid() {
  // hedef kutu salt gösterim amaçlı, bu yüzden disabled: tüm düğmelere bakılır
  const all = screen.queryAllByRole("button");
  const targetTile = all.find((b) => /^. harfi$/.test(labelOf(b)));
  const target = labelOf(targetTile!).replace(" harfi", "");
  const cells = buttons().filter((b) => charOf(b) === target && b.className.includes("aspect-square"));
  for (const c of cells) {
    click(c);
    await tick(20);
  }
  await tick(2200);
}

/**
 * Kelimeyi Diz: kelimeyi bilmeden dene-yanıl ile çöz.
 * Doğru harfte "?" kutusu azalır; yanlışta 380 ms kilit gelir.
 */
async function solveSpell() {
  const unfilled = () => screen.queryAllByText("?").length;
  let guard = 0;
  while (unfilled() > 0 && guard++ < 80) {
    const chips = buttons().filter((b) => b.className.includes("w-14 h-14"));
    let progress = false;
    for (const c of chips) {
      const before = unfilled();
      click(c);
      await tick(30);
      if (unfilled() < before) {
        progress = true;
        break;
      }
      await tick(430); // yanlış kutu kilidi açılsın
    }
    if (!progress) throw new Error("Kelimeyi Diz: hiçbir harf kabul edilmedi");
  }
  await tick(2400);
}

/** Hafıza Kartları: açılan kartın harfini okuyup hatırlayarak eşleri bul. */
async function solveMemory() {
  const known = new Map<number, string>();
  const tried = new Set<string>();
  const cards = () => screen.queryAllByRole("button").filter((b) => b.className.includes("flip-scene"));
  const closedIdx = () =>
    cards().map((c, i) => ({ c, i })).filter(({ c }) => labelOf(c) === "Kapalı kart");
  const read = (i: number) => {
    const m = labelOf(cards()[i]).match(/^(.) harfi$/);
    if (m) known.set(i, m[1]);
  };

  for (let step = 0; step < 80; step++) {
    if (closedIdx().length < 2) break;

    const closed = closedIdx();
    // 1) hatırlanan bir eş var mı?
    let pair: [number, number] | null = null;
    for (const a of closed) {
      for (const b of closed) {
        if (a.i >= b.i) continue;
        if (known.get(a.i) && known.get(a.i) === known.get(b.i)) pair = [a.i, b.i];
      }
    }
    // 2) yoksa denenmemiş bir ikili aç; önce tanınmayan kartları tercih et
    if (!pair) {
      const unknown = closed.filter((c) => !known.has(c.i));
      const pool = unknown.length >= 2 ? unknown : closed;
      for (const a of pool) {
        for (const b of pool) {
          if (a.i >= b.i) continue;
          const key = `${a.i}-${b.i}`;
          if (tried.has(key)) continue;
          tried.add(key);
          pair = [a.i, b.i];
        }
        if (pair) break;
      }
    }
    if (!pair) break; // denenecek ikili kalmadı
    const [x, y] = pair;

    click(cards()[x]);
    await tick(80);
    read(x); // kart açıkken harfini öğren
    click(cards()[y]);
    await tick(80);
    read(y);
    await tick(1600); // eşleşme (500 ms) veya sıfırlama (950 ms) + tur geçişi
  }
  await tick(2600);
}

describe("çok adımlı etkinlikler gerçekten bitirilebiliyor mu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  for (const group of GROUPS) {
    it(`${group.name}: 4 çok adımlı etkinlik de tamamlanır`, async () => {
      for (const name of ["Harf Sırası", "Harf Izgarası", "Kelimeyi Diz", "Hafıza Kartları"]) {
        const meta = ACTIVITIES.find((a) => a.name === name)!;
        const C = meta.comp;
        const results: ActivityResult[] = [];
        render(<C group={group} onExit={() => {}} onComplete={(r) => results.push(r)} />);
        await tick(200);

        for (let round = 1; round <= meta.rounds; round++) {
          if (name === "Harf Sırası") await solveOrder(group);
          else if (name === "Harf Izgarası") await solveGrid();
          else if (name === "Kelimeyi Diz") await solveSpell();
          else await solveMemory();
        }
        await tick(2500);

        expect(results, `${group.name}/${name} tamamlanmadı`).toHaveLength(1);
        expect(results[0].correct, `${group.name}/${name} doğru sayısı`).toBe(meta.rounds);
        cleanup();
      }
    }, 120000);
  }
});
