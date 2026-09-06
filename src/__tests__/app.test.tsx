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

  it("harf kutusuna dokununca o harfin sesi okunur", async () => {
    render(<App />);
    clearSpokenTexts();
    fireEvent.click(screen.getByRole("button", { name: /N harfi, nane/ }));
    await tick(100);
    expect(getSpokenTexts().some((t) => t.includes("nane"))).toBe(true);
  });

  it("kelime bahçesindeki kelime okunur", async () => {
    render(<App />);
    clearSpokenTexts();
    fireEvent.click(screen.getByRole("button", { name: /anneanne/ }));
    await tick(100);
    expect(getSpokenTexts().at(-1)).toBe("anneanne");
  });
});
