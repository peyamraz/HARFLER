import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSpeech,
  getVoiceState,
  isSpeechSupported,
  onVoiceStateChange,
  say,
  setMuted,
} from "../speech";
import { clearSpokenTexts, getUtterances, setMockVoices } from "../../test/setup";

/** Konuşmanın gerçekten başlaması için 90 ms'lik gecikmeyi atlat. */
const flush = (ms = 150) => vi.advanceTimersByTime(ms);

describe("speech", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
