import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSpeech,
  getTurkishVoices,
  getVoiceState,
  isSpeechSupported,
  onVoiceStateChange,
  say,
  setMuted,
  setPreferredVoice,
} from "../speech";
import { clearSpokenTexts, getUtterances, setMockVoices } from "../../test/setup";

/** Konuşmanın gerçekten başlaması için 90 ms'lik gecikmeyi atlat. */
const flush = (ms = 150) => vi.advanceTimersByTime(ms);

describe("speech", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    clearSpokenTexts();
    setMockVoices([{ name: "Türkçe Test Sesi", lang: "tr-TR", default: true }]);
    setMuted(false);
  });
  afterEach(() => {
    cancelSpeech();
    vi.useRealTimers();
  });

  it("ortamda konuşma sentezi var ve Türkçe ses tanınıyor", () => {
    expect(isSpeechSupported()).toBe(true);
    const state = getVoiceState();
    expect(state.supported).toBe(true);
    expect(state.ready).toBe(true);
    expect(state.turkish).toBe(true);
    expect(state.name).toBe("Türkçe Test Sesi");
  });

  it("Türkçe ses varken utterance'a Türkçe ses atanır", () => {
    say("anne");
    flush();
    const u = getUtterances().at(-1)!;
    expect(u.text).toBe("anne");
    expect(u.lang).toBe("tr-TR");
    expect(u.voiceLang).toBe("tr-TR");
  });

  it("Türkçe ses YOKKEN yabancı ses atanmaz (telaffuz bozulmasın)", () => {
    setMockVoices([
      { name: "English US", lang: "en-US", default: true },
      { name: "German", lang: "de-DE" },
    ]);
    const state = getVoiceState();
    expect(state.turkish).toBe(false);
    expect(state.name).toBeNull();

    say("anneanne");
    flush();
    const u = getUtterances().at(-1)!;
    expect(u.voiceLang, "yabancı ses atanmış").toBeNull();
    expect(u.lang).toBe("tr-TR");
  });

  it("ses listesi sonradan gelince durum güncellenir", () => {
    setMockVoices([{ name: "English US", lang: "en-US", default: true }]);
    const seen: boolean[] = [];
    const off = onVoiceStateChange((s) => seen.push(s.turkish));
    setMockVoices([{ name: "Microsoft Tolga", lang: "tr-TR" }]);
    off();
    expect(seen.at(-1)).toBe(true);
    expect(getVoiceState().name).toBe("Microsoft Tolga");
  });

  it("birden çok Türkçe ses varsa en kalitelisi seçilir", () => {
    setMockVoices([
      { name: "Microsoft Tolga - Turkish (Turkey)", lang: "tr-TR" },
      { name: "Google Türkçe", lang: "tr-TR" },
    ]);
    expect(getVoiceState().name, "düşük kaliteli SAPI sesi seçilmiş").toBe("Google Türkçe");
    // sıralama arayüzdeki seçiciye de yansır
    expect(getTurkishVoices().map((v) => v.name)).toEqual(["Google Türkçe", "Microsoft Tolga - Turkish (Turkey)"]);
  });

  it("öğretmen sesi elle seçebilir ve otomatik seçime dönebilir", () => {
    setMockVoices([
      { name: "Google Türkçe", lang: "tr-TR" },
      { name: "Microsoft Tolga", lang: "tr-TR" },
    ]);
    setPreferredVoice("Microsoft Tolga");
    expect(getVoiceState().name).toBe("Microsoft Tolga");

    setPreferredVoice(null);
    expect(getVoiceState().name, "otomatik seçime dönülmedi").toBe("Google Türkçe");
  });

  it("konuşma hiç başlamazsa bir kez daha denenir (Chrome sessizce yutuyor)", () => {
    const synth = window.speechSynthesis;
    const original = synth.speak;
    let calls = 0;
    // speak() hiçbir şey başlatmıyor: speaking false kalıyor
    (synth as unknown as { speak: () => void }).speak = () => {
      calls += 1;
    };
    try {
      say("anne");
      vi.advanceTimersByTime(90); // ilk speak
      expect(calls).toBe(1);
      vi.advanceTimersByTime(300); // başlama denetimi
      expect(calls, "tekrar denenmedi").toBe(2);
      vi.advanceTimersByTime(2000);
      expect(calls, "birden çok kez tekrar denendi").toBe(2);
    } finally {
      (synth as unknown as { speak: typeof original }).speak = original;
    }
  });

  it("sessize alınınca konuşma başlamaz", () => {
    setMuted(true);
    say("nane");
    flush();
    expect(getUtterances()).toHaveLength(0);
  });

  it("onEnd, konuşma bitince bir kez çağrılır", () => {
    const onEnd = vi.fn();
    say("ata", { onEnd });
    flush(); // speak
    flush(400); // konuşma biter
    expect(onEnd).toHaveBeenCalledTimes(1);
    flush(20000); // watchdog artık sızmıyor
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("cancelSpeech onEnd çağırmaz (oyun durdurulunca tur geri gelmez)", () => {
    const onEnd = vi.fn();
    say("Sıra 1. seste. Dinle: te", { onEnd });
    flush();
    cancelSpeech();
    flush(20000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("yeni bir konuşma öncekini keserse onEnd çağrılır (akış takılmasın)", () => {
    const first = vi.fn();
    say("birinci", { onEnd: first });
    flush();
    say("ikinci");
    expect(first).toHaveBeenCalledTimes(1);
  });

  it("TTS hiç onend vermezse watchdog akışı ilerletir", () => {
    const onEnd = vi.fn();
    say("kısa", { onEnd });
    flush(); // speak başlar
    // konuşma bitmedi; watchdog süresi = 1800 + 5*120 = 2400 ms
    flush(2400);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
