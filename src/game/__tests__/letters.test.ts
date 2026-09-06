import { describe, expect, it } from "vitest";
import { GROUPS, LETTER_BY_CHAR, trUpper, trLower, trVowelChars, shuffle } from "../letters";

describe("ses grubu verisi", () => {
  it("5 grup ve 29 ses tanımlı", () => {
    expect(GROUPS).toHaveLength(5);
    expect(GROUPS.reduce((n, g) => n + g.letters.length, 0)).toBe(29);
  });

  it("grup numaraları 1'den başlayıp sıralı", () => {
    expect(GROUPS.map((g) => g.no)).toEqual([1, 2, 3, 4, 5]);
  });

  it("her harf tek bir grupta ve LETTER_BY_CHAR'a kayıtlı", () => {
    const seen = new Set<string>();
    for (const g of GROUPS) {
      for (const l of g.letters) {
        expect(seen.has(l.id), `${l.id} birden fazla grupta`).toBe(false);
        seen.add(l.id);
        expect(LETTER_BY_CHAR[l.id]).toBe(l);
      }
    }
    expect(seen.size).toBe(29);
  });

  it("her grubun kelimeleri ve cümleleri benzersiz (React key çakışmasın)", () => {
    for (const g of GROUPS) {
      expect(new Set(g.words).size, `${g.name} kelimelerinde tekrar var`).toBe(g.words.length);
      expect(new Set(g.sentences).size, `${g.name} cümlelerinde tekrar var`).toBe(g.sentences.length);
      expect(g.words.length).toBeGreaterThan(10);
      expect(g.sentences.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("her harfin örnek kelimesi dolu", () => {
    for (const g of GROUPS) {
      for (const l of g.letters) {
        expect(l.word.length, `${l.id} örnek kelimesi boş`).toBeGreaterThan(0);
        expect(l.say.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Türkçe harf dönüşümü", () => {
  it("i → İ, ı → I (noktalı/noktasız karışmaz)", () => {
    expect(trUpper("i")).toBe("İ");
    expect(trUpper("ı")).toBe("I");
    expect(trLower("İ")).toBe("i");
    expect(trLower("I")).toBe("ı");
  });

  it("kelimenin ilk harfi harf tablosunda bulunur", () => {
    for (const g of GROUPS) {
      for (const w of g.words) {
        const def = LETTER_BY_CHAR[trUpper(w[0])];
        expect(def, `"${w}" ilk harfi tabloda yok`).toBeTruthy();
      }
    }
  });

  it("ünlü kümesi Türkçe ünlüleri içerir", () => {
    expect([...trVowelChars].sort().join("")).toBe("aeiıouüö".split("").sort().join(""));
  });
});

describe("shuffle", () => {
  it("elemanları korur, kaynağı değiştirmez", () => {
    const src = [1, 2, 3, 4, 5, 6, 7];
    const copy = [...src];
    const out = shuffle(src);
    expect(out.sort()).toEqual(copy.sort());
    expect(src).toEqual(copy);
  });
});
