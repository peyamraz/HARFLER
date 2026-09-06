import { describe, expect, it } from "vitest";
import { GROUPS, LETTER_BY_CHAR, trUpper } from "../../game/letters";
import {
  countChar,
  ensureOpts,
  nonsenseOf,
  sample,
  syllableCount,
  wordOptions,
  wordsForAnswer,
} from "../shared";

describe("syllableCount", () => {
  it("ünlü kümelerini hece sayar", () => {
    expect(syllableCount("an")).toBe(1);
    expect(syllableCount("anne")).toBe(2);
    expect(syllableCount("anneanne")).toBe(4);
    expect(syllableCount("okul")).toBe(2);
    expect(syllableCount("papatya")).toBe(3);
  });

  it("büyük/küçük harf ve Türkçe ünlülerle çalışır", () => {
    expect(syllableCount("IŞIK")).toBe(2);
    expect(syllableCount("ÜTÜ")).toBe(2);
  });

  it("ünlü içermeyen girişte en az 1 döner", () => {
    expect(syllableCount("rst")).toBe(1);
  });
});

describe("countChar", () => {
  it("Türkçe büyük harfe göre sayar", () => {
    expect(countChar("tat", "T")).toBe(2);
    expect(countChar("kilit", "İ")).toBe(2);
    expect(countChar("kilit", "I")).toBe(0);
    expect(countChar("ışık", "I")).toBe(2);
  });
});

describe("ensureOpts / sample / wordOptions", () => {
  it("seçenekler doğru şıkkı içerir ve tekrar etmez", () => {
    for (const g of GROUPS) {
      for (const correct of g.letters) {
        const opts = ensureOpts(g, correct, 6);
        expect(opts).toContainEqual(correct);
        expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
        expect(opts.length).toBeLessThanOrEqual(g.letters.length);
      }
    }
  });

  it("wordOptions hedef kelimeyi içerir, benzer kelimeleri eler", () => {
    const g = GROUPS[0];
    const opts = wordOptions(g.words, "an", 4);
    expect(opts[0] === "an" || opts.includes("an")).toBe(true);
    expect(opts).not.toContain("ana");
    expect(opts).not.toContain("anne");
    expect(new Set(opts).size).toBe(opts.length);
  });

  it("sample istenen sayıdan fazla vermez", () => {
    expect(sample(GROUPS[0].letters, 99).length).toBe(GROUPS[0].letters.length);
  });
});

describe("wordsForAnswer", () => {
  it("cevabı seçili grupta olan kelimeleri süzer", () => {
    const g = GROUPS[0];
    const pool = wordsForAnswer(g, (w) => LETTER_BY_CHAR[trUpper(w[0])]);
    expect(pool.length).toBeGreaterThan(0);
    const ids = new Set(g.letters.map((l) => l.id));
    for (const w of pool) {
      expect(ids.has(LETTER_BY_CHAR[trUpper(w[0])].id)).toBe(true);
    }
  });

  it("son harf için de grup içinden kelime bulur", () => {
    for (const g of GROUPS) {
      const pool = wordsForAnswer(g, (w) => LETTER_BY_CHAR[trUpper(w[w.length - 1])]);
      expect(pool.length, `${g.name} için son harf kelimesi yok`).toBeGreaterThan(0);
    }
  });
});

describe("nonsenseOf", () => {
  it("grup kelimelerinden biri olmayan bir dizi üretir", () => {
    const known = new Set(GROUPS.flatMap((g) => g.words));
    for (const g of GROUPS) {
      for (let i = 0; i < 30; i++) {
        const s = nonsenseOf(g);
        expect(s.length).toBeGreaterThanOrEqual(4);
        expect(known.has(s), `"${s}" gerçek kelime`).toBe(false);
      }
    }
  });

  it("en az bir yabancı harf ikilisi içerir (gerçek kelimeye benzemez)", () => {
    for (const g of GROUPS) {
      const bigrams = new Set<string>();
      g.words.forEach((w) => {
        for (let i = 0; i < w.length - 1; i++) bigrams.add(w.slice(i, i + 2));
      });
      for (let i = 0; i < 30; i++) {
        const s = nonsenseOf(g);
        let foreign = false;
        for (let j = 0; j < s.length - 1; j++) {
          if (!bigrams.has(s.slice(j, j + 2))) foreign = true;
        }
        expect(foreign, `"${s}" grubun ikililerinden oluşuyor`).toBe(true);
      }
    }
  });
});
