/**
 * Bağımlılıksız, "store" (sıkıştırmasız) ZIP üreticisi.
 * Windows Gezgin'i, macOS Arşiv İzleyicisi ve unzip ile açılır.
 * Sıkıştırma yapmayız: oyun dosyası zaten tek parça metin, önemli olan
 * arşivin her ortamda kusursuz açılması.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array<ArrayBufferLike>): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array<ArrayBufferLike>;
}

/** DOS zaman damgası (1980 sonrası). Sabit tarih: aynı içerik aynı arşivi verir. */
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1; // 2024-01-01

function u16(view: DataView, off: number, v: number) {
  view.setUint16(off, v, true);
}
function u32(view: DataView, off: number, v: number) {
  view.setUint32(off, v, true);
}

export function makeZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const names = entries.map((e) => encoder.encode(e.name));
  const crcs = entries.map((e) => crc32(e.data));

  const LOCAL_HEADER = 30;
  const CENTRAL_HEADER = 46;
  const EOCD = 22;

  const localSize = entries.reduce((n, e, i) => n + LOCAL_HEADER + names[i].length + e.data.length, 0);
  const centralSize = entries.reduce((n, _e, i) => n + CENTRAL_HEADER + names[i].length, 0);

  const out = new Uint8Array(localSize + centralSize + EOCD);
  const view = new DataView(out.buffer);
  let p = 0;
  const offsets: number[] = [];

  /* --- yerel dosya başlıkları + veri --- */
  entries.forEach((e, i) => {
    offsets.push(p);
    u32(view, p, 0x04034b50);
    u16(view, p + 4, 20); // gereken sürüm
    u16(view, p + 6, 0x0800); // bayrak: UTF-8 dosya adı
    u16(view, p + 8, 0); // yöntem: store
    u16(view, p + 10, DOS_TIME);
    u16(view, p + 12, DOS_DATE);
    u32(view, p + 14, crcs[i]);
    u32(view, p + 18, e.data.length); // sıkıştırılmış boyut
    u32(view, p + 22, e.data.length); // gerçek boyut
    u16(view, p + 26, names[i].length);
    u16(view, p + 28, 0); // ek alan yok
    p += LOCAL_HEADER;
    out.set(names[i], p);
    p += names[i].length;
    out.set(e.data, p);
    p += e.data.length;
  });

  /* --- merkezi dizin --- */
  const cdStart = p;
  entries.forEach((e, i) => {
    u32(view, p, 0x02014b50);
    u16(view, p + 4, 20); // oluşturan sürüm
    u16(view, p + 6, 20); // gereken sürüm
    u16(view, p + 8, 0x0800);
    u16(view, p + 10, 0);
    u16(view, p + 12, DOS_TIME);
    u16(view, p + 14, DOS_DATE);
    u32(view, p + 16, crcs[i]);
    u32(view, p + 20, e.data.length);
    u32(view, p + 24, e.data.length);
    u16(view, p + 28, names[i].length);
    u16(view, p + 30, 0); // ek alan
    u16(view, p + 32, 0); // yorum
    u16(view, p + 34, 0); // disk no
    u16(view, p + 36, 0); // iç öznitelikler
    u32(view, p + 38, 0); // dış öznitelikler
    u32(view, p + 42, offsets[i]); // yerel başlık konumu
    p += CENTRAL_HEADER;
    out.set(names[i], p);
    p += names[i].length;
  });

  /* --- merkezi dizin sonu --- */
  u32(view, p, 0x06054b50);
  u16(view, p + 4, 0);
  u16(view, p + 6, 0);
  u16(view, p + 8, entries.length);
  u16(view, p + 10, entries.length);
  u32(view, p + 12, p - cdStart);
  u32(view, p + 16, cdStart);
  u16(view, p + 20, 0);

  return out;
}

/** Metin dosyalarından ZIP üretir (UTF-8, BOM'suz). */
export function makeZipFromText(files: { name: string; text: string }[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  return makeZip(files.map((f) => ({ name: f.name, data: encoder.encode(f.text) })));
}
