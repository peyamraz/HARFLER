import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * "Tek dosyayı indir" özelliğinin uçtan uca sağlaması.
 * dist/standalone.html içindeki gömülü paket gerçekten çalışıyor mu?
 * (Derleme gerektirdiği için dosya yoksa test atlanır: `npm run test:standalone`)
 */
const FILE = resolve(process.cwd(), "dist/standalone.html");

describe.skipIf(!existsSync(FILE))("dist/standalone.html", () => {
  it("kendi kendine yeter: harici betik/stil referansı yoktur", () => {
    const html = readFileSync(FILE, "utf8");
    expect(html).toContain('<div id="root">');
    expect(/<script[^>]*\ssrc="/.test(html), "harici betik kalmış").toBe(false);
    expect(
      /<link[^>]*rel="stylesheet"[^>]*href="\/?assets/.test(html),
      "harici stil kalmış",
    ).toBe(false);
    expect(html).toContain("<script type=\"module\">");
  });

  it("gömülü betik çalışıp uygulamayı render eder", async () => {
    const html = readFileSync(FILE, "utf8");
    const m = html.match(/<script type="module">\n([\s\S]*?)\n<\/script>/);
    expect(m, "satır içi modül bulunamadı").toBeTruthy();

    document.body.innerHTML = '<div id="root"></div>';
    const url =
      "data:text/javascript;base64," + Buffer.from(m![1], "utf8").toString("base64");
    await import(/* @vite-ignore */ url);
    await new Promise((r) => setTimeout(r, 50));

    const root = document.getElementById("root")!;
    expect(root.children.length, "uygulama render olmadı").toBeGreaterThan(0);
    expect(root.textContent).toContain("Ses Avı");
    expect(root.textContent).toContain("Oyunu Başlat");
    expect(root.textContent).toContain("Etkinlik Merkezi");
  }, 30000);
});
