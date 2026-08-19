import { useEffect, useMemo, useState } from "react";
import { GROUPS } from "./game/letters";
import { REMEMBER_SECONDS, TOTAL_ROUNDS, useSoundGame } from "./game/useSoundGame";
import { say } from "./game/speech";
import { LetterTile, type TileState } from "./components/LetterTile";
import { CountdownRing } from "./components/CountdownRing";
import { ConfettiLayer, makeBurst, type Burst } from "./components/Confetti";
import {
  IconBolt,
  IconBook,
  IconBrain,
  IconCheck,
  IconEar,
  IconFlame,
  IconHand,
  IconPlay,
  IconSparkle,
  IconSpeaker,
  IconStar,
  IconTrophy,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "./components/Icons";

/* ------------------------------------------------ küçük yardımcılar */

function starsFor(score: number): number {
  if (score >= 160) return 3;
  if (score >= 100) return 2;
  if (score >= 50) return 1;
  return 0;
}

const FLOAT_LETTERS = ["A", "N", "E", "T", "İ", "L", "O", "K", "U", "R", "Ü", "S", "Ö", "Y", "D", "Z", "Ç", "B", "G", "Ş", "P", "Ğ", "F", "J"];
const FLOAT_COLORS = ["#ff6b6b", "#ffc145", "#6bcb77", "#4d96ff", "#b983ff", "#2ec4b6"];

function FloatingLetters() {
  const items = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        ch: FLOAT_LETTERS[(i * 7 + 3) % FLOAT_LETTERS.length],
        left: `${(i * 41 + 5) % 96}%`,
        top: `${(i * 29 + 8) % 92}%`,
        size: 22 + ((i * 13) % 26),
        rot: ((i * 37) % 40) - 20,
        dur: 8 + ((i * 11) % 7),
        delay: (i * 19) % 8,
        color: FLOAT_COLORS[i % FLOAT_COLORS.length],
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {items.map((f, i) => (
        <span
          key={i}
          className="anim-floaty font-display font-bold absolute select-none"
          style={
            {
              left: f.left,
              top: f.top,
              fontSize: f.size,
              color: f.color,
              opacity: 0.16,
              "--fr": `${f.rot}deg`,
              "--fdur": `${f.dur}s`,
              "--fdel": `${f.delay}s`,
            } as React.CSSProperties
          }
        >
          {f.ch}
        </span>
      ))}
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  desc,
  right,
}: {
  kicker: string;
  title: string;
  desc?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div>
        <p className="text-[11px] font-black tracking-[0.22em] text-sky-deep uppercase mb-1">{kicker}</p>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">{title}</h2>
        {desc && <p className="text-ink-soft font-semibold text-sm mt-1.5 max-w-xl">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

function StatChip({
  label,
  value,
  icon,
  accent = "text-ink",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="sticker-sm rounded-lg bg-paper px-3.5 py-2 flex items-center gap-2.5">
      {icon}
      <div className="leading-none">
        <p className="text-[9px] font-black tracking-[0.18em] text-ink-soft uppercase mb-1">{label}</p>
        <p key={String(value)} className={`font-display font-bold text-lg anim-pop ${accent}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------ ana bileşen */

export default function App() {
  const [gIdx, setGIdx] = useState(0);
  const group = GROUPS[gIdx];
  const g = useSoundGame(group);
  const [bursts, setBursts] = useState<Burst[]>([]);

  /* oyun kartından kabaran konfeti olaylarını dinle */
  useEffect(() => {
    const onBurst = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      const b = makeBurst(d.x, d.y);
      setBursts((prev) => [...prev.slice(-3), b]);
      window.setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 1400);
    };
    window.addEventListener("ses-avi-burst", onBurst);
    return () => window.removeEventListener("ses-avi-burst", onBurst);
  }, []);

  const inRun = g.status !== "start" && g.status !== "done";
  const stars = starsFor(g.score);
  const letterLine = group.letters.map((l) => l.char).join(" · ");

  const tileState = (id: string): TileState => {
    if (g.correctId === id) return "correct";
    if (g.wrongId === id) return "wrong";
    if (g.status === "feedback" && g.correctId && g.correctId !== id) return "dim";
    return "idle";
  };

  const playAll = () => {
    let i = 0;
    const next = () => {
      if (i >= group.letters.length) return;
      const l = group.letters[i];
      i += 1;
      say(`${l.say}, ${l.word}`, { rate: 0.85, onEnd: () => window.setTimeout(next, 260) });
    };
    next();
  };

  return (
    <div className="min-h-screen bg-scene relative overflow-x-hidden">
      <div className="fixed inset-0 bg-dots pointer-events-none" aria-hidden />
      <FloatingLetters />
      <ConfettiLayer bursts={bursts} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-14">
        {/* ---------------- başlık ---------------- */}
        <header className="flex items-center justify-between gap-3 mb-7">
          <div className="flex items-center gap-3.5">
            <div className="sticker w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-coral flex items-center justify-center text-white -rotate-3">
              <IconEar className="w-7 h-7" />
            </div>
            <div>
              <h1 className="title-toy font-display font-bold text-3xl sm:text-4xl leading-none">
                SES AVI
              </h1>
              <p className="text-ink-soft text-[11px] sm:text-xs font-bold tracking-[0.22em] uppercase mt-1.5">
                Dinle · Akılda Tut · Harfi Avla
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex sticker-sm rounded-full bg-amber px-3.5 py-2 items-center gap-1.5 text-[11px] font-black text-ink rotate-1">
              <IconSparkle className="w-4 h-4" /> Maarif Modeli 2026-2027
            </span>
            <button
              type="button"
              onClick={g.toggleMute}
              className="btn-toy sticker-sm w-11 h-11 rounded-lg bg-paper text-ink flex items-center justify-center"
              aria-label={g.muted ? "Sesi aç" : "Sesi kapat"}
              title={g.muted ? "Sesi aç" : "Sesi kapat"}
            >
              {g.muted ? <IconVolumeOff className="w-5 h-5" /> : <IconVolume className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <p className="sm:hidden sticker-sm inline-flex rounded-full bg-amber px-3 py-1.5 items-center gap-1.5 text-[10px] font-black text-ink mb-5">
          <IconSparkle className="w-3.5 h-3.5" /> Maarif Modeli 2026-2027
        </p>

        {/* ---------------- grup seçici ---------------- */}
        <nav className="mb-8" aria-label="Ses grupları">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
            <span className="text-[11px] font-black tracking-[0.18em] uppercase text-ink-soft whitespace-nowrap mr-1">
              Ses Grupları
            </span>
            {GROUPS.map((gr, i) => {
              const active = i === gIdx;
              return (
                <button
                  key={gr.id}
                  type="button"
                  onClick={() => setGIdx(i)}
                  className={`btn-toy sticker-sm rounded-full px-3.5 py-2 whitespace-nowrap font-display font-semibold text-sm transition-colors ${
                    active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-mint"
                  }`}
                  aria-pressed={active}
                >
                  <span className={active ? "text-amber" : "text-coral"}>{gr.no}.</span> {gr.name}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-7 items-start">
          <div className="flex flex-col gap-7 min-w-0">
            {/* ---------------- harfleri tanı ---------------- */}
            <section id="harfler" className="sticker rounded-2xl bg-paper p-5 sm:p-7">
              <SectionHead
                kicker={`${group.no}. Grup · ${group.name}`}
                title="Önce sesleri tanı"
                desc="Harfe dokun, sesi duy ve yüksek sesle tekrar et. Hazır olunca oyuna geç."
                right={
                  <button
                    type="button"
                    onClick={playAll}
                    className="btn-toy sticker-sm rounded-lg bg-sky text-white px-4 py-2.5 font-display font-semibold text-sm flex items-center gap-2"
                  >
                    <IconPlay className="w-4 h-4" /> Sırayla Dinle
                  </button>
                }
              />
              <div className="flex flex-wrap justify-center gap-4 sm:gap-5 py-3">
                {group.letters.map((l, i) => (
                  <div key={l.id} className="anim-pop" style={{ animationDelay: `${i * 70}ms` }}>
                    <LetterTile
                      letter={l}
                      size="xl"
                      sub={l.word}
                      onClick={() => say(`${l.say}, ${l.word}`, { rate: 0.85 })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] font-bold text-ink-soft mt-3 tracking-wide">
                Bu grubun sesleri: <span className="text-ink">{letterLine}</span>
              </p>
            </section>

            {/* ---------------- ses avı oyunu ---------------- */}
            <section className="sticker rounded-2xl bg-paper p-5 sm:p-7" aria-label="Ses avı oyunu">
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <p className="text-[11px] font-black tracking-[0.22em] text-coral-deep uppercase mb-1">
                    Oyun Zamanı
                  </p>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">
                    Sesleri duy, harfleri avla!
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={g.stopGame}
                  disabled={!inRun}
                  className="btn-toy sticker-sm rounded-lg bg-coral text-white px-4 py-2.5 font-display font-semibold text-sm flex items-center gap-2"
                  title="Oyunu durdur"
                >
                  <IconX className="w-4 h-4" /> Oyunu Durdur
                </button>
              </div>

              {/* skor şeridi */}
              <div className="flex flex-wrap gap-2.5 mb-5">
                <StatChip label="Skor" value={g.score} accent="text-coral-deep" icon={<IconStar className="w-4 h-4 text-amber-deep" filled />} />
                <StatChip label="Tur" value={`${Math.max(g.round, 1)}/${TOTAL_ROUNDS}`} icon={<IconBolt className="w-4 h-4 text-sky" />} />
                <StatChip
                  label="Seri"
                  value={g.streak}
                  accent={g.streak >= 3 ? "text-coral-deep" : "text-ink"}
                  icon={<IconFlame className={`w-4 h-4 ${g.streak >= 3 ? "text-coral" : "text-ink-soft"}`} />}
                />
                <StatChip label="Rekor" value={g.record} accent="text-sky-deep" icon={<IconTrophy className="w-4 h-4 text-amber-deep" />} />
              </div>

              {/* ---- başlangıç ekranı ---- */}
              {g.status === "start" && (
                <div className="rounded-xl bg-mint border-3 border-dashed border-mint-deep px-5 py-9 text-center anim-pop">
                  <div className="sticker-sm w-16 h-16 rounded-xl bg-sky text-white flex items-center justify-center mx-auto mb-4 rotate-2">
                    <IconEar className="w-9 h-9" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-ink mb-1.5">
                    {group.no}. Grup · {group.name}
                  </h3>
                  <p className="text-ink-soft font-semibold text-sm max-w-md mx-auto mb-5">
                    Bilgisayar bir ses söyleyecek. <span className="text-ink font-black">5 saniye</span> aklında
                    tut, sonra doğru harfe dokun ve sesi sen söyle! Hızlı cevap ve seri doğrular{" "}
                    <span className="text-coral-deep font-black">ekstra puan</span> kazandırır.
                  </p>
                  <button
                    type="button"
                    onClick={g.startGame}
                    className="btn-toy sticker rounded-xl bg-coral text-white px-8 py-4 font-display font-bold text-xl inline-flex items-center gap-3"
                  >
                    <IconPlay className="w-6 h-6" /> OYUNA BAŞLA
                  </button>
                  <p className="text-[11px] font-bold text-ink-soft mt-4">
                    Klavyede 1–{group.letters.length} tuşları harf seçer · Boşluk oyunu başlatır
                  </p>
                  {!g.speechOk && (
                    <p className="text-[11px] font-bold text-coral-deep mt-2">
                      Tarayıcında ses sentezi bulunamadı; oyun sessiz modda ilerler.
                    </p>
                  )}
                </div>
              )}

              {/* ---- dinletme ---- */}
              {g.status === "playing" && (
                <div className="rounded-xl bg-mint px-5 py-10 text-center anim-pop">
                  <div className="sticker-sm w-16 h-16 rounded-xl bg-amber text-ink flex items-center justify-center mx-auto mb-4 anim-wiggle">
                    <IconSpeaker className="w-9 h-9" />
                  </div>
                  <p className="font-display font-bold text-xl text-ink">Ses geliyor, kulaklar hazır mı?</p>
                  <p className="text-ink-soft font-semibold text-sm mt-1.5">
                    Tur {g.round}/{TOTAL_ROUNDS} · {group.name} sesleri
                  </p>
                </div>
              )}

              {/* ---- akılda tutma: 5 saniye ---- */}
              {g.status === "remember" && g.target && (
                <div className="rounded-xl bg-sand px-5 py-8 text-center anim-pop">
                  <p className="font-display font-bold text-xl sm:text-2xl text-ink mb-1">
                    Bu sesi aklında tut!
                  </p>
                  <p className="text-ink-soft font-semibold text-sm mb-5">
                    5 saniye sonra harfler açılacak ve sesi sen söyleyeceksin.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="sticker w-24 h-24 rounded-2xl bg-ink text-paper font-display font-bold text-5xl flex items-center justify-center anim-pulse-soft">
                      ?
                    </div>
                    <CountdownRing remaining={g.rememberLeft} total={REMEMBER_SECONDS} />
                  </div>
                  <button
                    type="button"
                    onClick={g.replaySound}
                    className="btn-toy sticker-sm rounded-lg bg-paper text-ink px-4 py-2.5 font-display font-semibold text-sm inline-flex items-center gap-2 mt-6"
                  >
                    <IconSpeaker className="w-4 h-4 text-sky" /> Sesi Tekrar Dinle
                  </button>
                </div>
              )}

              {/* ---- cevap: sesi söyle, harfi bul ---- */}
              {g.status === "answer" && g.target && (
                <div className="anim-pop">
                  <div className="text-center mb-5">
                    <p className="font-display font-bold text-2xl sm:text-3xl text-ink">Şimdi sesi söyle!</p>
                    <p className="text-ink-soft font-semibold text-sm mt-1.5">
                      Dikkat! Süre dolarsa harfler kaybolur. Doğru harfe dokun:
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
                    {g.tiles.map((l, i) => (
                      <LetterTile
                        key={l.id}
                        letter={l}
                        size="lg"
                        badge={i + 1}
                        state={g.wrongId === l.id ? "wrong" : "idle"}
                        onClick={(e) => g.pick(l, e.currentTarget)}
                      />
                    ))}
                  </div>
                  <div className="h-4 rounded-full bg-mint-deep overflow-hidden sticker-sm">
                    <div
                      className="h-full bg-amber rounded-full"
                      style={{ width: `${(g.rememberLeft / REMEMBER_SECONDS) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-5">
                    <button
                      type="button"
                      onClick={g.replaySound}
                      className="btn-toy sticker-sm rounded-lg bg-paper text-ink px-4 py-2.5 font-display font-semibold text-sm inline-flex items-center gap-2"
                    >
                      <IconSpeaker className="w-4 h-4 text-sky" /> Tekrar Dinle
                    </button>
                    <button
                      type="button"
                      onClick={g.reveal}
                      className="text-[11px] font-black text-ink-soft underline underline-offset-4 hover:text-coral-deep"
                    >
                      Bilemedim, göster
                    </button>
                  </div>
                </div>
              )}

              {/* ---- geri bildirim ---- */}
              {g.status === "feedback" && g.target && (
                <div className="rounded-xl bg-mint px-5 py-8 text-center anim-pop">
                  {g.answeredIn !== null ? (
                    <>
                      <p className="inline-flex items-center gap-2 font-display font-bold text-2xl text-leaf-deep mb-2">
                        <IconCheck className="w-7 h-7" /> Harika! Doğru ses: {g.target.say}
                      </p>
                      <p className="text-ink-soft font-semibold text-sm mb-3">
                        {g.answeredIn.toFixed(1)} saniyede buldun · +{10 + (g.bonusText ? 5 : 0) + (g.bonusText && g.bonusText.includes("SERİ = EKSTRA") ? 5 : 0)} puan
                      </p>
                      {g.bonusText && (
                        <p className="sticker-sm inline-flex items-center gap-2 rounded-full bg-amber px-4 py-2 font-black text-sm text-ink anim-pop">
                          <IconBolt className="w-4 h-4" /> {g.bonusText}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-display font-bold text-2xl text-ink mb-2">
                        Doğru ses <span className="text-coral-deep">{g.target.say}</span> idi
                      </p>
                      <p className="text-ink-soft font-semibold text-sm">Bir dahaki sefere yakalarsın!</p>
                    </>
                  )}
                  <div className="flex justify-center mt-5">
                    <LetterTile letter={g.target} size="lg" state="correct" sub={g.target.word} />
                  </div>
                </div>
              )}

              {/* ---- karne ---- */}
              {g.status === "done" && (
                <div className="rounded-xl bg-sand px-5 py-9 text-center anim-pop">
                  <p className="font-display font-bold text-3xl text-ink mb-3">Av Bitti!</p>
                  <div className="flex justify-center gap-1.5 mb-4" aria-label={`${stars} yıldız`}>
                    {[0, 1, 2].map((i) => (
                      <IconStar
                        key={i}
                        className={`w-10 h-10 ${i < stars ? "text-amber-deep" : "text-mint-deep"}`}
                        filled={i < stars}
                      />
                    ))}
                  </div>
                  {g.newRecord && (
                    <p className="sticker-sm inline-flex items-center gap-2 rounded-full bg-amber px-4 py-2 font-black text-sm text-ink mb-4 anim-wiggle">
                      <IconTrophy className="w-5 h-5" /> YENİ REKOR!
                    </p>
                  )}
                  <p className="font-display font-bold text-5xl text-coral-deep mb-1.5">{g.score}</p>
                  <p className="text-ink-soft font-semibold text-sm mb-6">
                    puan topladın · {group.name} grubu rekorun: {g.record}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={g.startGame}
                      className="btn-toy sticker rounded-xl bg-coral text-white px-7 py-3.5 font-display font-bold text-lg inline-flex items-center gap-2.5"
                    >
                      <IconPlay className="w-5 h-5" /> TEKRAR OYNA
                    </button>
                    <a
                      href="#harfler"
                      className="btn-toy sticker rounded-xl bg-paper text-ink px-6 py-3.5 font-display font-bold text-lg inline-flex items-center gap-2.5"
                    >
                      <IconBook className="w-5 h-5" /> Sesleri İncele
                    </a>
                  </div>
                </div>
              )}
            </section>

            {/* ---------------- kelime bahçesi ---------------- */}
            <section className="sticker rounded-2xl bg-paper p-5 sm:p-7">
              <SectionHead
                kicker="Oku ve Dinle"
                title={`${group.name} Kelime Bahçesi`}
                desc={`${group.words.length} kelime · ${group.sentences.length} örnek cümle — dokun, sesli okunsun.`}
                right={
                  <span className="sticker-sm rounded-full bg-leaf text-white px-3.5 py-2 text-[11px] font-black inline-flex items-center gap-1.5">
                    <IconHand className="w-4 h-4" /> Dokun &amp; Dinle
                  </span>
                }
              />
              <div className="flex flex-wrap gap-2.5 mb-6">
                {group.words.map((w, i) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => say(w, { rate: 0.85 })}
                    className="btn-toy sticker-sm rounded-full bg-mint hover:bg-amber px-4 py-2 font-display font-semibold text-ink text-sm sm:text-base transition-colors anim-pop"
                    style={{ animationDelay: `${Math.min(i * 35, 600)}ms` }}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-black tracking-[0.22em] uppercase text-sky-deep mb-3">
                İlk Cümleler
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {group.sentences.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => say(s, { rate: 0.82 })}
                    className="btn-toy sticker-sm rounded-lg bg-sand hover:bg-amber px-4 py-3 flex items-center gap-3 text-left transition-colors"
                  >
                    <IconBook className="w-5 h-5 text-sky-deep shrink-0" />
                    <span className="font-display font-semibold text-ink text-base">{s}</span>
                    <IconSpeaker className="w-4 h-4 text-ink-soft ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ---------------- yan panel ---------------- */}
          <aside className="flex flex-col gap-6">
            {/* nasıl oynanır */}
            <div className="sticker rounded-2xl bg-paper p-5">
              <h3 className="font-display font-bold text-xl text-ink mb-4 flex items-center gap-2.5">
                <IconBrain className="w-6 h-6 text-grape-deep" /> Nasıl Oynanır?
              </h3>
              <ol className="space-y-3.5">
                {[
                  { ic: <IconSpeaker className="w-5 h-5" />, c: "bg-coral text-white", t: "Bilgisayar bir ses söyler: “Bu sesi iyi dinle…”" },
                  { ic: <IconBrain className="w-5 h-5" />, c: "bg-amber text-ink", t: "5 saniye boyunca sesi aklında tutarsın." },
                  { ic: <IconEar className="w-5 h-5" />, c: "bg-leaf text-white", t: "Sesi yüksek sesle söyler, doğru harfe dokunursun." },
                  { ic: <IconStar className="w-5 h-5" filled />, c: "bg-sky text-white", t: "Doğru cevap puan, hız ve seri ekstra puan kazandırır." },
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`sticker-sm w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.c}`}>
                      {s.ic}
                    </span>
                    <p className="text-sm font-semibold text-ink leading-snug pt-1.5">{s.t}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* ses grupları sıralaması */}
            <div className="sticker rounded-2xl bg-paper p-5">
              <h3 className="font-display font-bold text-xl text-ink mb-1">Ses Grupları</h3>
              <p className="text-[11px] font-bold text-ink-soft mb-4">29 ses · 5 grup sırasıyla öğretilir</p>
              <ol className="space-y-2">
                {GROUPS.map((gr, i) => {
                  const active = i === gIdx;
                  return (
                    <li key={gr.id}>
                      <button
                        type="button"
                        onClick={() => setGIdx(i)}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors border-2 ${
                          active ? "bg-mint border-leaf" : "border-transparent hover:bg-mint/60"
                        }`}
                      >
                        <span
                          className={`sticker-sm w-8 h-8 rounded-md font-display font-bold text-sm flex items-center justify-center shrink-0 ${
                            active ? "bg-ink text-amber" : "bg-mint-deep text-ink"
                          }`}
                        >
                          {gr.no}
                        </span>
                        <span className="min-w-0">
                          <span className={`block font-display font-bold text-base leading-tight ${active ? "text-leaf-deep" : "text-ink"}`}>
                            {gr.name}
                          </span>
                          <span className="block text-[11px] font-bold text-ink-soft truncate">
                            {gr.letters.map((l) => l.char).join(" · ")}
                          </span>
                        </span>
                        {active && (
                          <span className="ml-auto text-[9px] font-black tracking-widest text-leaf-deep uppercase shrink-0">
                            Açık
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* ipucu */}
            <div className="sticker rounded-2xl bg-amber p-5 -rotate-1">
              <h3 className="font-display font-bold text-lg text-ink mb-2 flex items-center gap-2">
                <IconSparkle className="w-5 h-5" /> Öğretmen İpucu
              </h3>
              <p className="text-sm font-semibold text-ink leading-relaxed">
                Her grup bitmeden diğerine geçmeyin. Çocuğa sesi önce siz söyleyin, sonra oyundaki
                “Sesi Tekrar Dinle” düğmesiyle pekiştirin; kelime bahçesindeki kelimeleri birlikte
                okuyun.
              </p>
            </div>
          </aside>
        </main>

        <footer className="mt-12 pt-5 border-t-3 border-dashed border-mint-deep flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-ink-soft">
          <p>
            <span className="text-coral-deep font-black">SES AVI</span> · 1. sınıf ilk okuma-yazma ·
            Maarif Modeli 2026-2027
          </p>
          <p>Sesler tarayıcının Türkçe ses motoruyla okunur · Rekor bu cihazda saklanır</p>
        </footer>
      </div>
    </div>
  );
}
