import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { GROUPS } from "../game/letters";
import { clearSpokenTexts, getSpokenTexts } from "../test/setup";

const SPEECH_FLOW_MS = 90 + 300; // test ses motoru: 90 ms gecikme + 300 ms konuşma
const COUNTDOWN_MS = 5000;

/** Son söylenen "Dinle: X" metninden hedef harfi bulur. */
function targetFromSpeech() {
  const prompts = getSpokenTexts().filter((t) => t.includes("Dinle:"));
  const said = prompts[prompts.length - 1].split("Dinle:")[1].trim();
  const letter = GROUPS[0].letters.find((l) => l.say === said);
  expect(letter, `"${said}" sesi bulunamadı`).toBeTruthy();
  return letter!;
}

const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

/** jsdom Blob'unda arrayBuffer() yok; FileReader ile okunur. */
function readBytes(b: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(b);
  });
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    clearSpokenTexts();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("tüm bölümleriyle açılır", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Ses Blokları" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sesleri duy, harfleri avla!" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Etkinlik Merkezi" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kelime Bahçesi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Oyunu Başlat/ })).toBeTruthy();
    // 13 etkinlik kartı listelenir
    expect(screen.getByText("Kelime mi, Uydurma mı?")).toBeTruthy();
    expect(screen.getByText("Hafıza Kartları")).toBeTruthy();
  });

  it("bir tur baştan sona arayüzden oynanır ve hızlı cevap bonusu görünür", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Oyunu Başlat/ }));
    await tick(400);
    expect(screen.getByText("Dinle…")).toBeTruthy();

    await tick(SPEECH_FLOW_MS);
    expect(screen.getByText(/Sesi aklında tut/)).toBeTruthy();

    await tick(COUNTDOWN_MS);
    expect(screen.getByText("Şimdi sesi söyle!")).toBeTruthy();

    const target = targetFromSpeech();
    fireEvent.click(screen.getByRole("button", { name: `${target.char} harfi` }));

    expect(screen.getByText(`${target.say} sesi — ${target.char} harfi!`)).toBeTruthy();
    expect(screen.getByText("HIZLI KULAK! EKSTRA +5")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
  });

  it("yanlış kutuya dokununca tur kaybedilmez", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Oyunu Başlat/ }));
    await tick(400);
    await tick(SPEECH_FLOW_MS);
    await tick(COUNTDOWN_MS);
    expect(screen.getByText("Şimdi sesi söyle!")).toBeTruthy();

    const target = targetFromSpeech();
    const wrong = GROUPS[0].letters.find((l) => l.id !== target.id)!;
    fireEvent.click(screen.getByRole("button", { name: `${wrong.char} harfi` }));

    expect(screen.getByText("Şimdi sesi söyle!")).toBeTruthy();
    expect(screen.queryByText(/sesi — /)).toBeNull();
  });

  it("grup değiştirince başlık ve sekme adı güncellenir", () => {
    render(<App />);
    expect(document.title).toContain("ANETİL");

    const groupButtons = screen.getAllByRole("button").filter((b) =>
      (b.textContent ?? "").includes("OKURIM"),
    );
    expect(groupButtons.length).toBeGreaterThan(0);
    fireEvent.click(groupButtons[0]);

    expect(document.title).toContain("OKURIM");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("OKURIM");
    expect(screen.getByRole("heading", { name: "Kelime Bahçesi" })).toBeTruthy();
  });

  it("sessize alma düğmesi etiketini değiştirir ve tercihi saklar", () => {
    render(<App />);
    const btn = screen.getByRole("button", { name: "Sesi kapat" });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Sesi aç" })).toBeTruthy();
    expect(localStorage.getItem("ses-avi-sessiz")).toBe("1");
  });

  it("harfe dokununca yalnızca ses, kelimeye dokununca yalnızca kelime okunur", async () => {
    render(<App />);
    clearSpokenTexts();
    fireEvent.click(screen.getByRole("button", { name: "N harfinin sesi" }));
    await tick(100);
    expect(getSpokenTexts(), "harf kutusu gereksiz metin okudu").toEqual(["ne"]);

    clearSpokenTexts();
    fireEvent.click(screen.getByRole("button", { name: "nane kelimesini dinle" }));
    await tick(100);
    expect(getSpokenTexts(), "kelime düğmesi gereksiz metin okudu").toEqual(["nane"]);
  });

  it("kelime bahçesindeki kelime okunur", async () => {
    render(<App />);
    clearSpokenTexts();
    fireEvent.click(screen.getByRole("button", { name: /anneanne/ }));
    await tick(100);
    expect(getSpokenTexts().at(-1)).toBe("anneanne");
  });

  it("Türkçe ses hazır olduğunu bildirir ve 'Sesi dene' test cümlesini okutur", async () => {
    render(<App />);
    await tick(50);
    expect(screen.getByText("Türkçe ses hazır")).toBeTruthy();

    clearSpokenTexts();
    fireEvent.click(screen.getByRole("button", { name: /Sesi dene/ }));
    await tick(200);
    expect(getSpokenTexts().some((t) => t.startsWith("Ses denemesi."))).toBe(true);
  });
});

/* ------------------------------------------------ indirme akışı ---- */

describe("indirme", () => {
  const FAKE_HTML = '<!doctype html><div id="root"></div><script>void 0</script>';

  /** jsdom Blob'unda arrayBuffer() yok; FileReader ile okunur. */
  const readBytes = (b: Blob) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as ArrayBuffer);
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(b);
    });

  beforeEach(() => {
    localStorage.clear();
    clearSpokenTexts();
    // oyun dosyası sunucudan gelir
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => FAKE_HTML })),
    );
    downloads.length = 0;
    URL.createObjectURL = ((b: Blob) => {
      pending = b;
      return "blob:mock";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, blob: pending! });
    };
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  let pending: Blob | null = null;
  const downloads: { name: string; blob: Blob }[] = [];

  it("PAKETİ İNDİR, içinde .bat olan geçerli bir ZIP indirir", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /PAKETİ İNDİR/ }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe("HARFLER-Ses-Avi.zip");
    expect(downloads[0].blob.type).toBe("application/zip");

    const bytes = new Uint8Array(await readBytes(downloads[0].blob));
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]); // "PK"
    const listing = new TextDecoder().decode(bytes);
    expect(listing).toContain("HARFLER-Ses-Avi.html");
    expect(listing).toContain("HARFLER-Ses-Avi.bat");
    expect(listing).toContain("OKU-BENI.txt");
  });

  it("dosya hazır olunca tıklanabilir yedek bağlantı da gösterilir", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /PAKETİ İNDİR/ }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const link = screen.getByRole("link", { name: "HARFLER-Ses-Avi.zip" });
    expect(link.getAttribute("download")).toBe("HARFLER-Ses-Avi.zip");
    expect(link.getAttribute("href"), "blob adresi bağlanmamış").toBe("blob:mock");
    // düğme artık başarıyı kesinmiş gibi söylemiyor
    expect(document.body.textContent).toContain("DOSYA HAZIR");
    expect(document.body.textContent).not.toContain("İNDİRİLDİ!");
  });

  it("çerçeve içindeyse indirmenin engellendiğini açıkça söyler", async () => {
    const desc = Object.getOwnPropertyDescriptor(window, "top");
    Object.defineProperty(window, "top", { value: {}, configurable: true });
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: /PAKETİ İNDİR/ }));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const body = document.body.textContent ?? "";
      expect(body, "çerçeve uyarısı yok").toContain("önizleme çerçevesi");
      expect(body).toContain("sağ tıkla");
      expect(screen.getByRole("link", { name: "HARFLER-Ses-Avi.zip" })).toBeTruthy();
    } finally {
      if (desc) Object.defineProperty(window, "top", desc);
    }
  });

  it("Sadece oyun dosyası düğmesi .html indirir", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Sadece oyun dosyası/ }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe("HARFLER-Ses-Avi.html");
    const text = new TextDecoder().decode(await readBytes(downloads[0].blob));
    expect(text).toBe(FAKE_HTML);
  });
});
