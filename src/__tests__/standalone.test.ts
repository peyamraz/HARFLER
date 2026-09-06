import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * "Tek dosyayı indir" özelliğinin uçtan uca sağlaması.
 * dist/standalone.html içindeki gömülü paket gerçekten çalışıyor mu?
 * (Derleme gerektirdiği için dosya yoksa test atlanır: `npm run test:standalone`)
 */
const FILE = resolve(process.cwd(), "dist/standalone.html");

/** Gömülü klasik betiği çıkarır. */
function embeddedScript(html: string): string {
  const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  expect(m, "gömülü betik bulunamadı").toBeTruthy();
  return m![1];
}

describe.skipIf(!existsSync(FILE))("dist/standalone.html", () => {
  const html = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";

  it("kendi kendine yeter: harici betik/stil referansı yoktur", () => {
    expect(html).toContain('<div id="root">');
    expect(/<script[^>]*\ssrc="/.test(html), "harici betik kalmış").toBe(false);
    expect(
      /<link[^>]*rel="stylesheet"[^>]*href="\/?assets/.test(html),
      "harici stil kalmış",
    ).toBe(false);
  });

  it("file:// için güvenli: klasik betik, root'tan sonra gelir", () => {
    // Modül betikler file:// üzerinde CORS'a takılabilir; klasik betik her yerde çalışır.
    expect(html).not.toContain('<script type="module"');
    expect(html.indexOf("<script>"), "betik #root'tan önce").toBeGreaterThan(
      html.indexOf('<div id="root">'),
    );
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  it("gömülü betik modül sözdizimi içermez (klasik betik olarak çalışabilir)", async () => {
    const code = embeddedScript(html);
    const vm = await import("node:vm");
    // import/export kalmışsa SyntaxError fırlatır
    expect(() => new vm.Script(code)).not.toThrow();
  });

  it("gömülü betik çalışıp uygulamayı render eder", async () => {
    const code = embeddedScript(html);
    document.body.innerHTML = '<div id="root"></div>';
    const url = "data:text/javascript;base64," + Buffer.from(code, "utf8").toString("base64");
    await import(/* @vite-ignore */ url);
    await new Promise((r) => setTimeout(r, 50));

    const root = document.getElementById("root")!;
    expect(root.children.length, "uygulama render olmadı").toBeGreaterThan(0);
    expect(root.textContent).toContain("Ses Avı");
    expect(root.textContent).toContain("Oyunu Başlat");
    expect(root.textContent).toContain("Etkinlik Merkezi");
    expect(root.textContent).toContain("PAKETİ İNDİR");
  }, 30000);
});
