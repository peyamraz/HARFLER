import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { crc32, makeZip, makeZipFromText } from "../zip";
import {
  GAME_FILE,
  LAUNCHER_FILE,
  PACKAGE_NAME,
  README_FILE,
  buildPackage,
} from "../package";

const enc = new TextEncoder();
const dec = new TextDecoder();

interface ParsedEntry {
  name: string;
  text: string;
  bytes: Uint8Array;
  crc: number;
}

/** Arşivi merkezi dizinden okuyup dosya adlarını ve içeriklerini çözer. */
function readZip(buf: Uint8Array): ParsedEntry[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // EOCD imzasını bul
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  expect(eocd, "EOCD bulunamadı").toBeGreaterThan(0);

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const out: ParsedEntry[] = [];

  for (let i = 0; i < count; i++) {
    expect(view.getUint32(p, true), "merkezi dizin imzası").toBe(0x02014b50);
    const crc = view.getUint32(p + 16, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = dec.decode(buf.slice(p + 46, p + 46 + nameLen));

    // yerel başlıktan veriyi oku
    expect(view.getUint32(localOff, true), "yerel başlık imzası").toBe(0x04034b50);
    const lNameLen = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.slice(dataStart, dataStart + size);

    out.push({ name, text: dec.decode(data), bytes: data, crc });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

describe("crc32", () => {
  it("standart kontrol değerini verir", () => {
    // "123456789" için bilinen CRC-32: 0xCBF43926
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
  });

  it("boş veri için 0 döner ve Türkçe metni ayırt eder", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(enc.encode("anne"))).not.toBe(crc32(enc.encode("anna")));
  });
});

describe("makeZip", () => {
  it("okunabilir bir arşiv üretir, içerikler birebir geri gelir", () => {
    const zip = makeZipFromText([
      { name: "a.txt", text: "merhaba dünya" },
      { name: "b.html", text: "<html>ğüşöçİ</html>" },
    ]);
    const files = readZip(zip);
    expect(files.map((f) => f.name)).toEqual(["a.txt", "b.html"]);
    expect(files[0].text).toBe("merhaba dünya");
    expect(files[1].text).toBe("<html>ğüşöçİ</html>");
    expect(files[0].crc).toBe(crc32(enc.encode("merhaba dünya")));
  });

  it("boyut alanları gerçek veri uzunluğuyla uyumlu", () => {
    const data = enc.encode("x".repeat(70000));
    const files = readZip(makeZip([{ name: "big.txt", data }]));
    expect(files[0].text.length).toBe(70000);
  });

  it("ZIP imzasıyla başlar", () => {
    const zip = makeZipFromText([{ name: "a.txt", text: "1" }]);
    expect(zip[0]).toBe(0x50); // P
    expect(zip[1]).toBe(0x4b); // K
  });
});

describe("buildPackage", () => {
  it("üç dosyayı doğru adlarla paketler", () => {
    const zip = buildPackage("<html><div id=\"root\"></div></html>");
    const files = readZip(zip);
    expect(files.map((f) => f.name)).toEqual([GAME_FILE, LAUNCHER_FILE, README_FILE]);
    expect(PACKAGE_NAME).toBe("HARFLER-Ses-Avi.zip");
  });

  it("BAT, paketteki oyun dosyası adını arar (ad değişirse yakalanır)", () => {
    const files = readZip(buildPackage("<html></html>"));
    const bat = files.find((f) => f.name === LAUNCHER_FILE)!.text;
    expect(bat).toContain(GAME_FILE);
    expect(bat.startsWith("@echo off")).toBe(true);
    expect(bat).toContain("start \"\" \"%GAME%\"");
  });

  it("BAT yalnızca ASCII içerir (CMD Türkçe karakterleri bozmasın)", () => {
    const bat = readZip(buildPackage("<html></html>")).find((f) => f.name === LAUNCHER_FILE)!.text;
    const nonAscii = [...bat].filter((c) => c.charCodeAt(0) > 127);
    expect(nonAscii, `ASCII olmayan karakterler: ${nonAscii.join("")}`).toEqual([]);
  });

  it("metin dosyaları Windows için CRLF satır sonu kullanır", () => {
    const files = readZip(buildPackage("<html></html>"));
    const bat = files.find((f) => f.name === LAUNCHER_FILE)!.text;
    const readmeEntry = files.find((f) => f.name === README_FILE)!;
    const readme = readmeEntry.text;
    const readmeBytes = readmeEntry.bytes;
    expect(bat).toContain("\r\n");
    expect(bat.match(/(?<!\r)\n/)).toBeNull();
    // BOM ham baytlarda durur (TextDecoder onu soyduğu için baytlara bakılır)
    expect([readmeBytes[0], readmeBytes[1], readmeBytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(readme.startsWith("HARFLER")).toBe(true);
  });

  it("oyun dosyası pakete değişmeden girer", () => {
    const html = '<!doctype html><div id="root"></div><script>console.log(1)</script>';
    const files = readZip(buildPackage(html));
    expect(files.find((f) => f.name === GAME_FILE)!.text).toBe(html);
  });

  it("açıklama notu oyunun adını ve bat kullanımını anlatır", () => {
    const readme = readZip(buildPackage("<html></html>")).find((f) => f.name === README_FILE)!.text;
    expect(readme).toContain(LAUNCHER_FILE);
    expect(readme).toContain(GAME_FILE);
  });
});

/* Gerçek derleme varsa paket onunla da doğrulanır (npm run test:standalone). */
const DIST = resolve(process.cwd(), "dist/standalone.html");

describe.skipIf(!existsSync(DIST))("gerçek oyun dosyasıyla paket", () => {
  it("dist/standalone.html'i bozmadan paketler", () => {
    const html = readFileSync(DIST, "utf8");
    const files = readZip(buildPackage(html));
    const packed = files.find((f) => f.name === GAME_FILE)!;
    expect(packed.text).toBe(html);
    expect(packed.crc).toBe(crc32(enc.encode(html)));
    expect(packed.text.length).toBeGreaterThan(100_000);
  });
});
