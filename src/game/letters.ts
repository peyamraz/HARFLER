export interface LetterDef {
  id: string;
  char: string; // gösterilen harf
  say: string; // ses motoruna okutulacak metin (harf adı)
  word: string; // örnek kelime
  bg: string; // tailwind arka plan sınıfı
  fg: string;
  chip: string; // küçük rozet rengi (hex)
}

/** MEB 2024-25 Maarif Modeli 1. grup sesleri: A - N - E - T - İ - L */
export const LETTERS: LetterDef[] = [
  { id: "A", char: "A", say: "a", word: "arı", bg: "bg-coral", fg: "text-white", chip: "#ff6b6b" },
  { id: "N", char: "N", say: "ne", word: "nane", bg: "bg-amber", fg: "text-ink", chip: "#ffc145" },
  { id: "E", char: "E", say: "e", word: "el", bg: "bg-leaf", fg: "text-white", chip: "#6bcb77" },
  { id: "T", char: "T", say: "te", word: "tat", bg: "bg-sky", fg: "text-white", chip: "#4d96ff" },
  { id: "İ", char: "İ", say: "i", word: "inat", bg: "bg-grape", fg: "text-white", chip: "#b983ff" },
  { id: "L", char: "L", say: "le", word: "tel", bg: "bg-teal2", fg: "text-white", chip: "#2ec4b6" },
];

export const WORDS = [
  "anne",
  "ana",
  "ata",
  "nane",
  "nine",
  "inat",
  "ilan",
  "tel",
  "tat",
  "el",
  "et",
  "net",
  "ant",
  "an",
];

export const SENTENCES = ["Anne nane al.", "Ata et ye.", "Nil inat etme."];

export const GROUPS = ["ANETİL", "OKURIM", "ÜSOYDZ", "ÇBGCŞ", "PHVĞVJ"];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
