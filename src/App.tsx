import { useCallback, useEffect, useRef, useState } from "react";
import { GROUPS, LETTERS, SENTENCES, WORDS } from "./game/letters";
import { cancelSpeech, say, sayQuick, setMuted as setSpeechMuted } from "./game/speech";
import { ANSWER_LIMIT_MS, useSoundGame, WAIT_SECONDS, type Phase } from "./game/useSoundGame";
import { ConfettiLayer, makeBurst, type Burst } from "./components/Confetti";
import { CountdownRing } from "./components/CountdownRing";
import { LetterTile } from "./components/LetterTile";
import {
  IconBolt,
  IconBook,
  IconBrain,
  IconCheck,
  IconEar,
  IconFlame,
  IconHand,
  IconPlay,
  IconReplay,
  IconSparkle,
  IconSpeaker,
  IconStar,
  IconTrophy,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "./components/Icons";

const MUTE_KEY = "anetil.muted.v1";

/* ---------------- yardımcı parçalar ---------------- */

function ToyButton({
  children,
  onClick,
  color = "bg-amber",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn-toy rounded-xl ${color} font-display font-semibold text-ink px-6 py-3 inline-flex items-center gap-2.5 ${className}`}
    >
      {children}
    </button>
  );
}

function Chip({ children, tone = "paper" }: { children: React.ReactNode; tone?: "paper" | "amber" }) {
  return (
    <span
      className={`sticker-sm rounded-lg px-3 py-1.5 inline-flex items-center gap-2 font-bold text-sm ${
        tone === "amber" ? "bg-amber" : "bg-paper"
      }`}
    >
      {children}
    </span>
  );
}

function MysteryTile({ wiggle }: { wiggle?: boolean }) {
  return (
    <div
      className={`sticker rounded-2xl w-24 h-24 sm:w-28 sm:h-28 bg-ink text-sand font-display font-bold text-6xl flex items-center justify-center ${
        wiggle ? "anim-wiggle" : ""
      }`}
      aria-label="Gizli harf"
    >
      ?
    </div>
  );
}

function FloatLetters() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {LETTERS.map((l, i) => (
        <span
          key={l.id}
          className={`absolute font-display font-bold anim-floaty ${i % 2 ? "hidden md:block" : ""}`}
          style={
            {
              color: l.chip,
              opacity: 0.14,
              fontSize: `${110 + (i * 37) % 90}px`,
              left: ["2%", "84%", "8%", "88%", "42%", "70%"][i],
              top: ["14%", "8%", "58%", "52%", "86%", "78%"][i],
              "--fr": `${(i * 47) % 30 - 15}deg`,
              "--fdur": `${8 + (i * 13) % 6}s`,
              "--fdel": `${(i * 11) % 7}s`,
            } as React.CSSProperties
          }
        >
          {l.char}
        </span>
      ))}
    </div>
  );
}

const STEPS = [
  {
    icon: IconEar,
    color: "bg-coral",
    title: "Dinle",
    text: "Ses kutusuna dokun, harfin sesini duy.",
  },
  {
    icon: IconBrain,
    color: "bg-sky",
    title: `${WAIT_SECONDS} saniye akılda tut`,
    text: "Geri sayım bitene kadar sesi hatırla.",
  },
  {
    icon: IconHand,
    color: "bg-leaf",
    title: "Sesi söyle, harfi bul",
    text: "Doğru harfe dokun; hız ve seri ekstra puan getirir!",
  },
];

/* ---------------- uygulama ---------------- */

export default function App() {
  const g = useSoundGame();
  const [muted, setMutedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [spokenWord, setSpokenWord] = useState<string | null>(null);
  const [spokenSentence, setSpokenSentence] = useState<number | null>(null);
  const [seqPlaying, setSeqPlaying] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const seqTimers = useRef<number[]>([]);

  useEffect(() => {
    setSpeechMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* yok say */
    }
  }, [muted]);

  useEffect(() => () => seqTimers.current.forEach((t) => window.clearTimeout(t)), []);

  // yeni rekor konfetisi
  useEffect(() => {
    if (g.phase === "done" && g.newBest) {
      const b = makeBurst(window.innerWidth / 2, window.innerHeight / 3, 26);
      setBursts((prev) => [...prev, b]);
      const t = window.setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 1300);
      return () => window.clearTimeout(t);
    }
  }, [g.phase, g.newBest]);

  const spawnBurst = useCallback((el: HTMLElement | null, count = 18) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const b = makeBurst(r.left + r.width / 2, r.top + r.height / 2, count);
    setBursts((prev) => [...prev, b]);
    window.setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 1200);
  }, []);

  const playSequence = useCallback(() => {
    if (seqPlaying) return;
    setSeqPlaying(true);
    LETTERS.forEach((l, i) => {
      const t = window.setTimeout(() => say(l.say, { rate: 0.75 }), i * 950);
      seqTimers.current.push(t);
    });
    const end = window.setTimeout(() => setSeqPlaying(false), LETTERS.length * 950 + 400);
    seqTimers.current.push(end);
  }, [seqPlaying]);

  const startAndScroll = useCallback(() => {
    gameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => g.actions.start(), 250);
  }, [g.actions]);

  // klavye: 1-6 seçim, boşluk/enter başlat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (g.phase === "answer") {
        const n = Number(e.key);
        if (n >= 1 && n <= g.options.length) {
          g.actions.pick(g.options[n - 1].id);
        }
      } else if ((g.phase === "idle" || g.phase === "done") && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        g.actions.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g.phase, g.options, g.actions]);

  const phaseTitle: Record<Phase, { big: string; small: string }> = {
    idle: { big: "Ses avına hazır mısın?", small: "Başlat'a dokun; 10 tur boyunca sesleri avla." },
    listen: { big: "Dinle…", small: "Ses kutusu harfin sesini söylüyor." },
    wait: { big: "Akılda tut!", small: `${WAIT_SECONDS} saniye içinde sesi hatırla.` },
    answer: { big: "Şimdi sesi söyle!", small: "Duyduğun ses hangi harfe ait? Dokun!" },
    reveal: { big: "Bak bakalım…", small: "Doğru ses birazdan tekrar söylenecek." },
    done: { big: "Av bitti!", small: "İşte karnen:" },
  };

  const inRound = g.phase === "listen" || g.phase === "wait" || g.phase === "answer" || g.phase === "reveal";

  return (
    <div className="bg-scene min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 bg-dots pointer-events-none z-0" aria-hidden />
      <FloatLetters />
      <ConfettiLayer bursts={bursts} />

      {/* ---------------- üst çubuk ---------------- */}
      <header className="sticky top-0 z-40 bg-mint/95 border-b-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5" aria-hidden>
              {LETTERS.map((l, i) => (
                <span
                  key={l.id}
                  className={`w-8 h-8 rounded-lg border-2 border-ink ${l.bg} ${l.fg} font-display font-semibold text-sm flex items-center justify-center ${
                    i === 0 ? "-rotate-6" : i === 5 ? "rotate-6" : ""
                  }`}
                >
                  {l.char}
                </span>
              ))}
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-lg">ANETİL Ses Avı</p>
              <p className="text-[11px] font-bold text-ink-soft -mt-0.5">1. sınıf · 1. ses grubu</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Chip>
              <IconSparkle className="w-4 h-4 text-coral" />
              <span key={g.score} className="anim-pop tabular-nums">
                {g.score}
              </span>
              <span className="text-ink-soft font-bold text-xs hidden sm:inline">puan</span>
            </Chip>
            <Chip tone="amber">
              <IconTrophy className="w-4 h-4" />
              <span key={g.best} className="anim-pop tabular-nums">
                {g.best}
              </span>
              <span className="text-ink/60 font-bold text-xs hidden sm:inline">rekor</span>
            </Chip>
            <button
              type="button"
              onClick={() => setMutedState((m) => !m)}
              className="btn-toy rounded-xl bg-paper w-11 h-11 flex items-center justify-center"
              aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              title={muted ? "Sesi aç" : "Sesi kapat"}
            >
              {muted ? <IconVolumeOff className="w-5 h-5 text-coral" /> : <IconVolume className="w-5 h-5 text-leaf-deep" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        {/* ---------------- açılış: harf blokları ---------------- */}
        <section className="pt-10 sm:pt-14 pb-8">
          <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="inline-flex items-center gap-2 sticker-sm rounded-full bg-sand px-4 py-1.5 text-xs font-black tracking-wide text-ink-soft mb-4">
                <IconSparkle className="w-4 h-4 text-amber-deep" />
                Maarif Modeli 2024-25 · Eski ELAKİN'in yerine
              </p>
              <h1 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05]">
                Sesleri duy,
                <br />
                harfleri <span className="text-coral">avla!</span>
              </h1>
              <p className="mt-4 text-lg font-semibold text-ink-soft max-w-md">
                İlk okuma-yazmanın 6 sesi: bloklara dokun, sesleri dinle; oyunda dinlediğin sesi
                bulup <strong className="text-ink">ekstra puan</strong> kazan.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ToyButton color="bg-coral" className="text-white text-lg px-7 py-3.5" onClick={startAndScroll}>
                  <IconPlay className="w-5 h-5" /> Oyuna Başla
                </ToyButton>
                <ToyButton color="bg-paper" onClick={playSequence}>
                  <IconSpeaker className={`w-5 h-5 text-sky-deep ${seqPlaying ? "anim-pulse-soft" : ""}`} />
                  {seqPlaying ? "Okunuyor…" : "Sırayla Dinle"}
                </ToyButton>
              </div>
            </div>

            {/* etkileşimli harf blokları */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 lg:max-w-md">
              {LETTERS.map((l, i) => (
                <div key={l.id} className="anim-hero" style={{ "--fdel": `${i * 0.18}s` } as React.CSSProperties}>
                  <LetterTile
                    letter={l}
                    size="xl"
                    badge={i + 1}
                    sub={l.word}
                    onClick={() => say(`${l.say}, ${l.word}`, { rate: 0.8 })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* nasıl oynanır adımları */}
          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="sticker-sm rounded-xl bg-paper p-4 flex items-start gap-3.5">
                <span
                  className={`w-11 h-11 shrink-0 rounded-xl ${s.color} border-[3px] border-ink text-white flex items-center justify-center`}
                >
                  <s.icon className="w-6 h-6" />
                </span>
                <div>
                  <p className="font-display font-semibold">
                    <span className="text-ink-soft mr-1.5">{i + 1}.</span>
                    {s.title}
                  </p>
                  <p className="text-sm font-semibold text-ink-soft mt-0.5">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- oyun ---------------- */}
        <section ref={gameRef} className="py-8 scroll-mt-24">
          <div className="sticker rounded-2xl bg-paper p-5 sm:p-8">
            {/* tur üst bilgisi */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-2xl">Ses Avı</h2>
                <span className="sticker-sm rounded-lg bg-mint px-3 py-1 font-black text-sm tabular-nums">
                  Tur {Math.min(g.round + 1, 10)}/10
                </span>
              </div>
              <div className="flex items-center gap-2">
                {g.streak >= 2 && (
                  <span className="sticker-sm rounded-lg bg-coral text-white px-3 py-1 font-black text-sm inline-flex items-center gap-1.5 anim-pop">
                    <IconFlame className="w-4 h-4" /> {g.streak} seri
                  </span>
                )}
                <div className="flex gap-1.5" aria-label="Tur sonuçları">
                  {g.results.map((r, i) => (
                    <span
                      key={i}
                      className={`w-3.5 h-3.5 rounded border-2 border-ink ${
                        r === "ok"
                          ? "bg-leaf"
                          : r === "no"
                            ? "bg-coral"
                            : i === g.round && inRound
                              ? "bg-amber anim-blink"
                              : "bg-mint-deep"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* sahne */}
            <div className="min-h-[300px] sm:min-h-[330px] flex flex-col items-center justify-center text-center">
              {g.phase === "idle" && (
                <div className="anim-pop flex flex-col items-center">
                  <span className="w-20 h-20 rounded-full bg-mint border-[3px] border-ink flex items-center justify-center mb-4">
                    <IconEar className="w-10 h-10 text-sky-deep" />
                  </span>
                  <p className="font-display font-bold text-2xl sm:text-3xl mb-2">{phaseTitle.idle.big}</p>
                  <p className="text-ink-soft font-semibold mb-6 max-w-sm">{phaseTitle.idle.small}</p>
                  <ToyButton color="bg-leaf" className="text-white text-lg px-8 py-4" onClick={g.actions.start}>
                    <IconPlay className="w-5 h-5" /> Avı Başlat
                  </ToyButton>
                  <p className="mt-4 text-sm font-bold text-ink-soft hidden sm:block">
                    İpucu: klavyede <span className="sticker-sm rounded bg-mint px-1.5">1</span>–
                    <span className="sticker-sm rounded bg-mint px-1.5">6</span> tuşları harf seçer,{" "}
                    <span className="sticker-sm rounded bg-mint px-1.5">Boşluk</span> başlatır.
                  </p>
                </div>
              )}

              {(g.phase === "listen" || g.phase === "wait") && (
                <div className="anim-pop flex flex-col items-center">
                  <div className="flex items-center gap-6 sm:gap-10 mb-6">
                    <button
                      type="button"
                      onClick={g.actions.replay}
                      disabled={g.phase !== "wait"}
                      key={g.saidNow}
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full sticker bg-amber flex items-center justify-center ${
                        g.phase === "listen" ? "anim-pulse-soft" : "btn-toy"
                      }`}
                      aria-label="Sesi tekrar dinle"
                      title="Sesi tekrar dinle"
                    >
                      <IconSpeaker className="w-12 h-12 text-ink" />
                    </button>
                    <MysteryTile wiggle={g.phase === "wait"} />
                  </div>
                  <p className="font-display font-bold text-2xl sm:text-3xl mb-1">{phaseTitle[g.phase].big}</p>
                  <p className="text-ink-soft font-semibold mb-5">{phaseTitle[g.phase].small}</p>
                  {g.phase === "wait" && <CountdownRing remaining={g.waitRemaining} total={WAIT_SECONDS} />}
                </div>
              )}

              {g.phase === "answer" && (
                <div className="anim-pop w-full flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-4">
                    <IconHand className="w-8 h-8 text-leaf-deep" />
                    <p className="font-display font-bold text-2xl sm:text-3xl">{phaseTitle.answer.big}</p>
                  </div>
                  <p className="text-ink-soft font-semibold mb-2">{phaseTitle.answer.small}</p>

                  {/* seçenekler */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
                    {g.options.map((l, i) => (
                      <div key={l.id} className="relative">
                        <LetterTile letter={l} size="lg" onClick={() => g.actions.pick(l.id)} />
                        <span className="absolute -top-2 -right-1 hidden md:flex w-6 h-6 rounded-full bg-ink text-mint text-xs font-black items-center justify-center border-2 border-paper">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={g.actions.replay}
                      className="btn-toy sticker-sm rounded-lg bg-sand px-4 py-2 font-display font-semibold inline-flex items-center gap-2"
                    >
                      <IconReplay className="w-4 h-4" /> Sesi Tekrar Dinle
                    </button>
                  </div>

                  {/* güvenlik süresi çubuğu */}
                  <div className="w-full max-w-sm h-3 rounded-full border-2 border-ink bg-mint mt-5 overflow-hidden">
                    <div
                      key={`bar-${g.round}-${g.phase}`}
                      className="h-full bg-coral anim-shrink"
                      style={{ animationDuration: `${ANSWER_LIMIT_MS}ms` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-ink-soft mt-1.5">Süre bitmeden harfe dokun!</p>
                </div>
              )}

              {g.phase === "reveal" && g.feedback && (
                <div className="w-full flex flex-col items-center">
                  {/* geri bildirim pankartı */}
                  <div
                    className={`sticker-sm rounded-xl px-5 py-3.5 mb-5 anim-pop relative ${
                      g.feedback.kind === "correct" ? "bg-leaf text-white" : "bg-sand"
                    }`}
                  >
                    {g.feedback.kind === "correct" ? (
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                        <span className="font-display font-bold text-xl">{g.feedback.praise}</span>
                        <span className="sticker-sm rounded-lg bg-paper text-ink px-2.5 py-0.5 font-black text-sm">
                          +{g.feedback.gained} puan
                        </span>
                        {g.feedback.speedBonus && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-sky text-white border-2 border-ink px-2 py-0.5 text-xs font-black">
                            <IconBolt className="w-3.5 h-3.5" /> +5 hızlı kulak
                          </span>
                        )}
                        {g.feedback.streakBonus && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-coral text-white border-2 border-ink px-2 py-0.5 text-xs font-black">
                            <IconFlame className="w-3.5 h-3.5" /> +5 seri bonusu
                          </span>
                        )}
                        {g.feedback.speedBonus && g.feedback.streakBonus && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber text-ink border-2 border-ink px-2 py-0.5 text-xs font-black anim-blink">
                            <IconSparkle className="w-3.5 h-3.5" /> EKSTRA PUAN!
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5">
                        {g.feedback.kind === "timeout" ? <IconX className="w-5 h-5 text-coral" /> : null}
                        <span className="font-display font-bold">
                          {g.feedback.kind === "timeout" ? "Süre doldu!" : "Olsun, bir dahaki sefere!"}
                        </span>
                        <span className="font-bold text-ink-soft">Doğru harf:</span>
                        <span
                          className={`w-8 h-8 rounded-lg ${g.target.bg} ${g.target.fg} border-2 border-ink font-display font-bold flex items-center justify-center`}
                        >
                          {g.target.char}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="font-semibold text-ink-soft mb-4 inline-flex items-center gap-2">
                    <IconSpeaker className="w-5 h-5 text-sky-deep anim-pulse-soft" />
                    “{g.target.say}” sesi {g.target.char} harfi — dinle ve tekrar et!
                  </p>

                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {g.options.map((l) => (
                      <LetterTile
                        key={l.id}
                        letter={l}
                        size="lg"
                        state={
                          l.id === g.target.id
                            ? "correct"
                            : l.id === g.picked
                              ? "wrong"
                              : "dim"
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {g.phase === "done" && (
                <div className="anim-pop flex flex-col items-center">
                  {g.newBest && (
                    <span className="sticker-sm rounded-full bg-amber px-4 py-1.5 font-black text-sm inline-flex items-center gap-2 mb-4 anim-pop">
                      <IconTrophy className="w-4 h-4" /> YENİ REKOR!
                    </span>
                  )}
                  <p className="font-display font-bold text-3xl sm:text-4xl mb-3">{g.score} puan</p>
                  <div className="flex gap-2 mb-3" aria-label={`${g.stars} yıldız`}>
                    {[0, 1, 2].map((i) => (
                      <IconStar
                        key={i}
                        filled={i < g.stars}
                        className={`w-10 h-10 ${i < g.stars ? "text-amber-deep anim-pop" : "text-mint-deep"}`}
                      />
                    ))}
                  </div>
                  <p className="font-bold text-ink-soft mb-1">
                    10 sesin {g.correctCount} tanesini doğru avladın.
                  </p>
                  <p className="text-sm font-semibold text-ink-soft mb-6">
                    Rekorun: <span className="font-black text-ink">{g.best}</span> puan
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <ToyButton color="bg-coral" className="text-white" onClick={g.actions.start}>
                      <IconReplay className="w-5 h-5" /> Tekrar Oyna
                    </ToyButton>
                    <ToyButton color="bg-paper" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                      Harflere Dön
                    </ToyButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- kelime bahçesi ---------------- */}
        <section className="py-8">
          <div className="sticker rounded-2xl bg-mint/80 p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="w-11 h-11 rounded-xl bg-grape text-white border-[3px] border-ink flex items-center justify-center">
                <IconBook className="w-6 h-6" />
              </span>
              <h2 className="font-display font-bold text-2xl">Kelime Bahçesi</h2>
            </div>
            <p className="text-ink-soft font-semibold mb-5">
              Bu kelimelerin hepsi yalnızca A-N-E-T-İ-L seslerinden! Dokun, dinle, tekrar et.
            </p>
            <div className="flex flex-wrap gap-2.5 mb-7">
              {WORDS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setSpokenWord(w);
                    sayQuick(w);
                  }}
                  className={`btn-toy rounded-xl px-4 py-2 font-display font-semibold text-lg inline-flex items-center gap-2 ${
                    spokenWord === w ? "bg-amber anim-pulse-soft" : "bg-paper"
                  }`}
                >
                  {spokenWord === w && <IconSpeaker className="w-4 h-4 text-ink" />}
                  {w}
                </button>
              ))}
            </div>
            <p className="font-black text-sm tracking-wide text-ink-soft mb-3">İLK CÜMLELERİM</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {SENTENCES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSpokenSentence(i);
                    say(s, { rate: 0.8 });
                  }}
                  className={`btn-toy rounded-xl p-4 text-left inline-flex items-center gap-3 ${
                    spokenSentence === i ? "bg-sand anim-pulse-soft" : "bg-paper"
                  }`}
                >
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-sky text-white border-2 border-ink flex items-center justify-center">
                    <IconSpeaker className="w-5 h-5" />
                  </span>
                  <span className="font-display font-semibold text-lg leading-snug">{s}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- neden ANETİL + grup sırası ---------------- */}
        <section className="py-8 grid lg:grid-cols-2 gap-6">
          <div className="sticker rounded-2xl bg-paper p-5 sm:p-7">
            <h2 className="font-display font-bold text-2xl mb-4">Neden ANETİL?</h2>
            <ul className="space-y-4">
              {[
                {
                  t: "İlk andan anlamlı kelime",
                  d: "Daha ilk iki sesle “an” ve “ana” yazılır; çocuk hemen başarının tadını alır.",
                },
                {
                  t: "Üçüncü seste “anne”",
                  d: "E sesi eklenir eklenmez en sevilen kelime kurulur; motivasyon tavan yapar.",
                },
                {
                  t: "Akıcı heceleme",
                  d: "Türkçenin hece yapısına uygun sıralama, okuma hızını ve akıcılığı güçlendirir.",
                },
              ].map((b, i) => (
                <li key={b.t} className="flex gap-3.5">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-leaf text-white border-2 border-ink flex items-center justify-center mt-0.5">
                    <IconCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-lg leading-tight">
                      <span className="text-ink-soft mr-1.5">{i + 1}.</span>
                      {b.t}
                    </p>
                    <p className="text-sm font-semibold text-ink-soft mt-0.5">{b.d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-mint border-2 border-ink/15 p-3.5">
              <IconSparkle className="w-5 h-5 text-amber-deep shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-ink-soft">
                Uzun yıllar kullanılan ELAKİN sıralamasının yerini 2024-25'te bu yeni düzen aldı.
              </p>
            </div>
          </div>

          <div className="sticker rounded-2xl bg-sand p-5 sm:p-7">
            <h2 className="font-display font-bold text-2xl mb-4">Ses Grupları Sıralaması</h2>
            <ol className="space-y-3">
              {GROUPS.map((grp, i) => {
                const active = i === 0;
                return (
                  <li
                    key={grp}
                    className={`flex items-center gap-3.5 rounded-xl border-[3px] border-ink p-3 ${
                      active ? "bg-amber" : "bg-paper"
                    }`}
                  >
                    <span
                      className={`w-10 h-10 shrink-0 rounded-lg border-[3px] border-ink font-display font-bold text-lg flex items-center justify-center ${
                        active ? "bg-ink text-amber" : "bg-mint"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-display font-bold text-xl tracking-[0.14em]">
                      {grp.split("").map((c, j) => (
                        <span key={j} className="mr-1">
                          {c}
                        </span>
                      ))}
                    </span>
                    {active && (
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-paper border-2 border-ink px-2.5 py-1 text-xs font-black">
                        <IconStar className="w-3.5 h-3.5 text-amber-deep" filled /> buradasın
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </main>

      {/* ---------------- alt bilgi ---------------- */}
      <footer className="relative z-10 mt-6">
        <svg viewBox="0 0 1440 70" className="w-full block text-ink" aria-hidden preserveAspectRatio="none">
          <path
            d="M0,40 C240,75 480,5 720,35 C960,65 1200,10 1440,40 L1440,70 L0,70 Z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
        <div className="bg-ink text-mint py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-semibold">
            <p>
              <span className="font-display font-bold text-amber">ANETİL Ses Avı</span> · MEB Türkiye
              Yüzyılı Maarif Modeli, 1. sınıf ilk okuma-yazma 1. ses grubu
            </p>
            <p className="text-mint/70">Sesler, tarayıcının Türkçe ses motoruyla okunur · Skor bu cihazda saklanır</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
