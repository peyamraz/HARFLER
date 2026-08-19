export interface LetterDef {
  id: string;
  char: string; // gösterilen harf
  say: string; // ses motoruna okutulacak metin (ses adı)
  word: string; // örnek kelime
  bg: string; // tailwind arka plan sınıfı
  fg: string;
  chip: string; // rozet rengi (hex)
}

export interface GroupDef {
  id: string;
  no: number;
  name: string; // kısaltma: ANETİL, OKURIM...
  letters: LetterDef[];
  words: string[]; // kelime bahçesi (önceki grup sesleriyle de kurulabilir)
  sentences: string[];
}

const PALETTE = [
  { bg: "bg-coral", fg: "text-white", chip: "#ff6b6b" },
  { bg: "bg-amber", fg: "text-ink", chip: "#ffc145" },
  { bg: "bg-leaf", fg: "text-white", chip: "#6bcb77" },
  { bg: "bg-sky", fg: "text-white", chip: "#4d96ff" },
  { bg: "bg-grape", fg: "text-white", chip: "#b983ff" },
  { bg: "bg-teal2", fg: "text-white", chip: "#2ec4b6" },
];

function L(id: string, char: string, say: string, word: string, i: number): LetterDef {
  return { id, char, say, word, ...PALETTE[i % PALETTE.length] };
}

/** MEB Maarif Modeli 1. sınıf ilk okuma-yazma ses grupları (29 ses, 5 grup). */
export const GROUPS: GroupDef[] = [
  {
    id: "anetil",
    no: 1,
    name: "ANETİL",
    letters: [
      L("A", "A", "a", "arı", 0),
      L("N", "N", "ne", "nane", 1),
      L("E", "E", "e", "el", 2),
      L("T", "T", "te", "tat", 3),
      L("İ", "İ", "i", "inat", 4),
      L("L", "L", "le", "tel", 5),
    ],
    words: [
      "an", "ana", "anne", "anneanne", "ata", "el", "et", "ete", "tat",
      "tatlı", "tel", "net", "nal", "inat", "ilan", "lale", "ninni",
      "nane", "nine", "elli",
    ],
    sentences: ["Anne nane al.", "Ata et ye.", "Nil inat etme.", "Lale al, ata ver."],
  },
  {
    id: "okurim",
    no: 2,
    name: "OKURIM",
    letters: [
      L("O", "O", "o", "okul", 0),
      L("K", "K", "ke", "kitap", 1),
      L("U", "U", "u", "uçak", 2),
      L("R", "R", "re", "resim", 3),
      L("I", "I", "ı", "ışık", 4),
      L("M", "M", "me", "masa", 5),
    ],
    words: [
      "okul", "oku", "okur", "okuma", "orman", "onur", "umut", "mum",
      "mumluk", "minik", "kim", "kilit", "koltuk", "kumru", "kurt",
      "kuru", "roman", "rota", "tur", "ulu", "not", "nar", "mor", "un",
    ],
    sentences: ["Okul orada.", "Kurt uludu.", "Onur not tuttu.", "Mum koltukta."],
  },
  {
    id: "usoydz",
    no: 3,
    name: "ÜSÖYDZ",
    letters: [
      L("Ü", "Ü", "ü", "ütü", 0),
      L("S", "S", "se", "süt", 1),
      L("Ö", "Ö", "ö", "önlük", 2),
      L("Y", "Y", "ye", "yüz", 3),
      L("D", "D", "de", "deniz", 4),
      L("Z", "Z", "ze", "zil", 5),
    ],
    words: [
      "süt", "sus", "süs", "saz", "ütü", "üzüm", "ön", "önlük", "söz",
      "sözlük", "yaz", "yazı", "yüz", "yol", "yıldız", "yalnız", "dal",
      "düz", "düzen", "dünya", "dede", "deniz", "zil", "zor",
    ],
    sentences: ["Dedem üzüm yedi.", "Nil yıldız saydı.", "Zil sesi duyuldu.", "Dünya bizim evimiz."],
  },
  {
    id: "cbgcs",
    no: 4,
    name: "ÇBGCŞ",
    letters: [
      L("Ç", "Ç", "çe", "çanta", 0),
      L("B", "B", "be", "balık", 1),
      L("G", "G", "ge", "gemi", 2),
      L("C", "C", "ce", "cüce", 3),
      L("Ş", "Ş", "şe", "şemsiye", 4),
    ],
    words: [
      "çay", "çilek", "çanta", "çocuk", "çiçek", "bal", "baba", "bebek",
      "balık", "bilgi", "büyük", "böcek", "göl", "gün", "gül", "gök",
      "gece", "gemi", "güneş", "can", "cam", "cüce", "şeker", "şarkı",
      "şiş", "şimşek",
    ],
    sentences: ["Çocuk balık tuttu.", "Bebek şeker yedi.", "Şimşek çaktı.", "Gece göl sessiz."],
  },
  {
    id: "phvgfj",
    no: 5,
    name: "PHVĞFJ",
    letters: [
      L("P", "P", "pe", "papatya", 0),
      L("H", "H", "he", "havuç", 1),
      L("V", "V", "ve", "vazo", 2),
      L("Ğ", "Ğ", "yumuşak ge", "yağmur", 3),
      L("F", "F", "fe", "fil", 4),
      L("J", "J", "je", "jöle", 5),
    ],
    words: [
      "papatya", "pamuk", "pil", "piknik", "pembe", "pencere", "halı",
      "hava", "havuç", "hediye", "hafta", "vazo", "vagon", "dağ", "ağaç",
      "yağmur", "yoğurt", "düğme", "iğne", "uğur", "yeğen", "değirmen",
      "jöle", "fil", "fener",
    ],
    sentences: ["Papatyalar açtı.", "Yağmur yağdı.", "Tavşan havuç yedi.", "Çocuk pijama giydi."],
  },
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 29 harfin tamamı: karakter (büyük) → tanım. Türkçe büyük/küçük harf duyarlı. */
export const LETTER_BY_CHAR: Record<string, LetterDef> = {};
for (const g of GROUPS) {
  for (const l of g.letters) LETTER_BY_CHAR[l.id] = l;
}

/** "i" → "İ" gibi Türkçe büyük harf dönüşümü. */
export function trUpper(ch: string): string {
  return ch.toLocaleUpperCase("tr-TR");
}

export function trLower(ch: string): string {
  return ch.toLocaleLowerCase("tr-TR");
}

export const TR_VOWELS = new Set(["A", "E", "I", "İ", "O", "Ö", "U", "Ü"]);
export const trVowelChars = new Set("aeıioöuü".split(""));
