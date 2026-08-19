import { useEffect, useMemo, useState } from "react";
import { GROUPS } from "./game/letters";
import { REMEMBER_SECONDS, TOTAL_ROUNDS, useSoundGame } from "./game/useSoundGame";
import { say } from "./game/speech";
import { sfx } from "./game/sfx";
import { LetterTile, type TileState } from "./components/LetterTile";
import { CountdownRing } from "./components/CountdownRing";
import { ConfettiLayer, makeBurst, type Burst } from "./components/Confetti";
import { ActivityCenter, ACTIVITY_COUNT } from "./activities/activities";
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

const FLOAT_LETTERS = GROUPS.flatMap((g) => g.letters.map((l) => l.char));
const FLOAT_COLORS = ["#ff6b6b", "#ffc145", "#6bcb77", "#4d96ff", "#b983ff", "#2ec4b6"];

function FloatingLetters() {
  const items = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
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
              opacity: 0.14,
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
        <p className="text-[11px] font-black tracking-[0.22em] text-sky-deep uppercase mb-1">
          {kicker}
        </p>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink leading-tight">
          {title}
        </h2>
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
        <p className="text-[9px] font-black tracking-[0.18em] text-ink-soft uppercase mb-1">
          {label}
        </p>
        <p key={String(value)} className={`font-display font-bold text-lg anim-pop ${accent}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

const NAV = [
  { id: "harfler", label: "Harfler" },
  { id: "av", label: "Ses Avı" },
  { id: "etkinlikler", label: "Etkinlikler" },
  { id: "kelimeler", label: "Kelime Bahçesi" },
  { id: "bilgi", label: "Bilgi" },
];

/* ------------------------------------------------ uygulama */

export default function App() {
  const [groupId, setGroupId] = useState("g1");
  const group = useMemo(() => GROUPS.find((g) => g.id === groupId) ?? GROUPS[0], [groupId]);
  const g = useSoundGame(group);

  const [bursts, setBursts] = useState<Burst[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  /* toplam etkinlik puanı (grup başına, kalıcı) */
  useEffect(() => {
    const v = Number(localStorage.getItem(`etk-puan-${group.id}`) ?? 0);
    setTotalPoints(Number.isFinite(v) ? v : 0);
  }, [group.id]);

  const addPoints = (n: number) => {
    setTotalPoints((p) => {
      const next = p + n;
      localStorage.setItem(`etk-puan-${group.id}`, String(next));
      return next;
    });
  };

  /* konfeti olaylarını dinle */
  useEffect(() => {
    const onBurst = (e: Event) => {
      const d = (e as CustomEvent).detail as { x: number; y: number };
      const b = makeBurst(d.x, d.y, 26);
      setBursts((cur) => [...cur, b]);
      window.setTimeout(() => setBursts((cur) => cur.filter((x) => x.id !== b.id)), 1400);
    };
    window.addEventListener("ses-avi-burst", onBurst);
    return () => window.removeEventListener("ses-avi-burst", onBurst);
  }, []);

  const [heroIdx, setHeroIdx] = useState(0);
  const heroLetter = group.letters[heroIdx % group.letters.length];

  const tileState = (id: string): TileState => {
    if (g.status === "answer") return "idle";
    if (g.status === "feedback" || g.status === "done") {
      if (g.correctId === id) return "correct";
      if (g.wrongId === id) return "wrong";
      if (g.target?.id === id) return "target";
      return "dim";
    }
    return "locked";
  };

  const playing = g.status === "playing" || g.status === "remember" || g.status === "answer" || g.status === "feedback";

  return (
    <div className="min-h-screen bg-scene text-ink font-body relative overflow-x-hidden">
      <div className="fixed inset-0 bg-dots pointer-events-none" aria-hidden />
      <FloatingLetters />
      <ConfettiLayer bursts={bursts} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {/* ---------------- başlık ---------------- */}
        <header className="pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="sticker rounded-2xl bg-sky text-white w-14 h-14 flex items-center justify-center -rotate-3">
              <IconEar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] text-coral-deep uppercase">
                Maarif Modeli 2026-2027 · Ses Grupları
              </p>
              <h1 className="title-toy font-display text-3xl sm:text-4xl leading-none mt-1">
                ANETİL <span className="text-sky-deep">Ses Avı</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <StatChip label="Toplam Puan" value={totalPoints} icon={<IconSparkle className="w-5 h-5 text-amber-deep" />} accent="text-amber-deep" />
            <StatChip label={`Rekor · ${group.name}`} value={g.record} icon={<IconTrophy className="w-5 h-5 text-coral-deep" />} accent="text-coral-deep" />
            <button
              type="button"
              onClick={g.toggleMute}
              className="btn-toy sticker-sm rounded-lg bg-paper w-11 h-11 flex items-center justify-center text-ink"
              aria-label={g.muted ? "Sesi aç" : "Sesi kapat"}
              title={g.muted ? "Sesi aç" : "Sesi kapat"}
            >
              {g.muted ? <IconVolumeOff className="w-5 h-5 text-coral" /> : <IconVolume className="w-5 h-5 text-leaf-deep" />}
            </button>
          </div>
        </header>

        {!g.speechOk && (
          <div className="sticker-sm rounded-xl bg-amber/40 px-4 py-2.5 text-sm font-semibold text-ink mb-4">
            Tarayıcında Türkçe ses bulunamadı; oyun efekt sesleriyle devam eder. Chrome veya Edge
            önerilir.
          </div>
        )}

        {/* ---------------- bölüm gezinmesi ---------------- */}
        <nav className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-6 bg-mint/85 backdrop-blur border-y-[3px] border-ink/10">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {NAV.map((n, i) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="shrink-0 rounded-full border-2 border-ink/15 bg-paper px-4 py-1.5 font-display font-bold text-sm text-ink hover:border-ink hover:-translate-y-0.5 transition-all"
              >
                <span className="mr-1.5 font-black" style={{ color: FLOAT_COLORS[i % FLOAT_COLORS.length] }}>
                  {i + 1}
                </span>
                {n.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ---------------- grup seçici + harf blokları ---------------- */}
        <section id="harfler" className="scroll-mt-20">
          <SectionHead
            kicker={`1. Sınıf İlk Okuma-Yazma · ${group.name} Grubu`}
            title="Ses Blokları"
            desc="Harfe dokun, sesi ve örnek kelimeyi dinle. Grup değiştirince tüm etkinlikler o gruba uyar."
            right={
              <button
                type="button"
                className="btn-toy sticker-sm rounded-xl bg-grape text-white px-4 py-2.5 font-display font-bold text-sm flex items-center gap-2"
                onClick={() => {
                  sfx.tap();
                  group.letters.forEach((l, i) =>
                    window.setTimeout(
                      () => say(`${l.say}. örnek: ${l.word}`, { rate: 0.85 }),
                      i * 1300,
                    ),
                  );
                }}
              >
                <IconPlay className="w-4 h-4" /> Sırayla Dinle
              </button>
            }
          />

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
            {GROUPS.map((gr, i) => {
              const active = gr.id === group.id;
              return (
                <button
                  key={gr.id}
                  type="button"
                  onClick={() => {
                    if (gr.id !== group.id) {
                      sfx.pop();
                      setGroupId(gr.id);
                    }
                  }}
                  className={`shrink-0 rounded-xl px-4 py-2.5 font-display font-bold text-sm transition-all border-[3px] border-ink ${
                    active
                      ? "bg-ink text-mint shadow-[0_4px_0_rgba(43,58,85,0.4)]"
                      : "bg-paper text-ink btn-toy"
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] mr-2 align-middle"
                    style={{ background: FLOAT_COLORS[i % FLOAT_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  {gr.name}
                </button>
              );
            })}
          </div>

          <div className="sticker rounded-2xl bg-paper p-6 sm:p-8 relative overflow-hidden">
            <div
              className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-15 pointer-events-none"
              style={{ background: heroLetter.chip }}
            />
            <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
              <div className="flex items-center gap-5 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setHeroIdx((i) => i + 1);
                    sfx.pop();
                  }}
                  className="btn-toy sticker rounded-3xl w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center font-display font-bold text-7xl sm:text-8xl anim-hero"
                  style={{ background: heroLetter.chip, color: "#fff", textShadow: "0 4px 0 rgba(0,0,0,0.18)" }}
                  aria-label="Örnek harfi değiştir"
                >
                  {heroLetter.char}
                </button>
                <div>
                  <p className="font-display font-bold text-2xl text-ink">{heroLetter.say} sesi</p>
                  <p className="text-ink-soft font-semibold">örnek: {heroLetter.word}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black tracking-[0.2em] text-sky-deep uppercase mb-3">
                  {group.name} · veriliş sırasıyla
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  {group.letters.map((l, i) => (
                    <LetterTile
                      key={l.id}
                      letter={l}
                      badge={i + 1}
                      sub={l.word}
                      onClick={() => {
                        sfx.pop();
                        say(`${l.say}. ${l.char}. örnek: ${l.word}`, { rate: 0.82 });
                      }}
                    />
                  ))}
                </div>
                <p className="flex items-center gap-2 text-ink-soft text-sm font-semibold mt-4">
                  <IconHand className="w-5 h-5 text-sky-deep" /> Dokun ve dinle — her harf kendi
                  sesiyle seslendirilir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- ses avı oyunu ---------------- */}
        <section id="av" className="scroll-mt-20 mt-12">
          <SectionHead
            kicker="Ana Oyun"
            title="Sesleri duy, harfleri avla!"
            desc={`Ses kutusu ${group.name} grubundan bir sesi okur. 5 saniye aklında tut, süre bitince sesi söyle: doğru harfe dokun!`}
            right={
              <div className="flex items-center gap-2">
                <StatChip label="Tur" value={g.status === "start" ? "–" : `${g.round}/${TOTAL_ROUNDS}`} icon={<IconBolt className="w-5 h-5 text-sky-deep" />} accent="text-sky-deep" />
                <StatChip label="Seri" value={g.streak} icon={<IconFlame className="w-5 h-5 text-coral" />} accent={g.streak >= 3 ? "text-coral" : "text-ink"} />
              </div>
            }
          />

          <div className="sticker rounded-2xl bg-paper p-5 sm:p-8">
            {/* skor şeridi */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-black tracking-[0.22em] text-ink-soft uppercase">
                  Puan
                </span>
                <span key={g.score} className="font-display font-bold text-4xl text-ink anim-pop">
                  {g.score}
                </span>
              </div>
              <div className="flex items-center gap-1.5" aria-label={`Tur ${g.round} / ${TOTAL_ROUNDS}`}>
                {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border-2 border-ink/25 ${
                      i < g.round - 1 || g.status === "done"
                        ? "bg-leaf"
                        : i === g.round - 1 && playing
                          ? "bg-amber anim-pulse-soft"
                          : "bg-mint"
                    }`}
                  />
                ))}
              </div>
              {g.streak >= 2 ? (
                <div className="sticker-sm rounded-full bg-coral text-white px-3.5 py-1.5 font-display font-bold text-sm flex items-center gap-1.5 anim-pop">
                  <IconFlame className="w-4 h-4" /> {g.streak} seri
                </div>
              ) : (
                <div className="sticker-sm rounded-full bg-mint text-ink-soft px-3.5 py-1.5 font-display font-bold text-sm">
                  En iyi seri: {g.bestStreak}
                </div>
              )}
            </div>

            {/* ---- başlangıç ---- */}
            {g.status === "start" && (
              <div className="anim-pop text-center py-6">
                <div className="inline-flex sticker rounded-2xl bg-amber/40 px-5 py-3 items-center gap-3 mb-5">
                  <IconEar className="w-7 h-7 text-amber-deep" />
                  <p className="font-display font-bold text-lg text-ink">
                    Grup: {group.name} · {TOTAL_ROUNDS} tur · 5 saniye hafıza süresi
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-7 text-left">
                  <div className="sticker-sm rounded-xl bg-mint p-4">
                    <p className="font-display font-bold text-coral-deep mb-1">1 · Dinle</p>
                    <p className="text-sm text-ink-soft font-semibold">Ses kutusu hedef sesi okur.</p>
                  </div>
                  <div className="sticker-sm rounded-xl bg-mint p-4">
                    <p className="font-display font-bold text-amber-deep mb-1">2 · 5 sn tut</p>
                    <p className="text-sm text-ink-soft font-semibold">Halka geri sayarken aklında tut.</p>
                  </div>
                  <div className="sticker-sm rounded-xl bg-mint p-4">
                    <p className="font-display font-bold text-leaf-deep mb-1">3 · Sesi söyle!</p>
                    <p className="text-sm text-ink-soft font-semibold">Doğru harfe dokun, ekstra puan kap.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={g.startGame}
                  className="btn-toy sticker rounded-2xl bg-coral text-white px-8 py-4 font-display font-bold text-xl inline-flex items-center gap-3"
                >
                  <IconPlay className="w-6 h-6" /> Oyunu Başlat
                </button>
                <p className="text-ink-soft text-sm font-semibold mt-4">
                  Boşluk tuşu da başlatır · Hızlı cevap +5, 3+ seri +5 ekstra puan
                </p>
              </div>
            )}

            {/* ---- dinle / hatırla ---- */}
            {(g.status === "playing" || g.status === "remember") && (
              <div className="text-center py-4">
                {g.status === "playing" ? (
                  <div className="anim-pop">
                    <div className="inline-flex items-center gap-3 sticker rounded-2xl bg-sky text-white px-6 py-4 mb-4">
                      <IconSpeaker className="w-8 h-8 anim-pulse-soft" />
                      <span className="font-display font-bold text-2xl">Dinle…</span>
                    </div>
                    <p className="text-ink-soft font-semibold">
                      Tur {g.round}: hedef ses okunuyor, kulaklar açık!
                    </p>
                  </div>
                ) : (
                  <div className="anim-pop flex flex-col items-center gap-4">
                    <p className="font-display font-bold text-xl text-ink">
                      Sesi aklında tut! <span className="text-amber-deep">{REMEMBER_SECONDS} saniyen</span> var…
                    </p>
                    <CountdownRing remaining={g.rememberLeft} total={REMEMBER_SECONDS} />
                    <button
                      type="button"
                      onClick={g.replaySound}
                      className="btn-toy sticker-sm rounded-xl bg-paper px-5 py-2.5 font-display font-bold text-ink inline-flex items-center gap-2"
                    >
                      <IconSpeaker className="w-5 h-5 text-sky-deep" /> Sesi tekrar dinle
                    </button>
                  </div>
                )}
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      g.stopGame();
                    }}
                    className="btn-toy sticker-sm rounded-xl bg-paper px-5 py-2.5 font-display font-bold text-coral-deep inline-flex items-center gap-2"
                  >
                    <IconX className="w-5 h-5" /> Oyunu Durdur
                  </button>
                </div>
              </div>
            )}

            {/* ---- cevap ---- */}
            {g.status === "answer" && (
              <div className="text-center anim-rise">
                <p className="font-display font-bold text-2xl text-ink mb-1">Şimdi sesi söyle!</p>
                <p className="text-ink-soft font-semibold mb-6">
                  Hangi harf? Dokun ve söyle. <span className="hidden sm:inline">(1–6 tuşları da çalışır)</span>
                </p>
                <div className="flex justify-center gap-3 sm:gap-5 flex-wrap">
                  {g.tiles.map((l, i) => (
                    <LetterTile
                      key={l.id}
                      letter={l}
                      size="xl"
                      badge={i + 1}
                      state={tileState(l.id)}
                      onClick={(e) => g.pick(l, e.currentTarget)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 mt-7 flex-wrap">
                  <button
                    type="button"
                    onClick={g.reveal}
                    className="btn-toy sticker-sm rounded-xl bg-amber text-ink px-5 py-2.5 font-display font-bold"
                  >
                    Süre dolsun, cevabı gör
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      g.stopGame();
                    }}
                    className="btn-toy sticker-sm rounded-xl bg-paper px-5 py-2.5 font-display font-bold text-coral-deep inline-flex items-center gap-2"
                  >
                    <IconX className="w-5 h-5" /> Oyunu Durdur
                  </button>
                </div>
              </div>
            )}

            {/* ---- geri bildirim ---- */}
            {g.status === "feedback" && (
              <div className="text-center py-6 anim-pop">
                {g.correctId ? (
                  <>
                    <div className="inline-flex items-center gap-3 sticker rounded-2xl bg-leaf text-white px-7 py-4 mb-4">
                      <IconCheck className="w-9 h-9" />
                      <div className="text-left">
                        <p className="font-display font-bold text-2xl leading-none">
                          {g.target?.say} sesi — {g.target?.char} harfi!
                        </p>
                        <p className="text-sm font-bold opacity-90 mt-1">
                          {g.answeredIn !== null && g.answeredIn <= 3
                            ? `Şimşek gibiydin: ${g.answeredIn} saniyede!`
                            : "Harika iş!"}
                        </p>
                      </div>
                    </div>
                    {g.bonusText && (
                      <p className="font-display font-bold text-coral-deep text-xl anim-wiggle inline-block">
                        {g.bonusText}
                      </p>
                    )}
                    <p className="text-ink-soft font-semibold mt-2">Şimdi sesi yüksek sesle tekrar et!</p>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-3 sticker rounded-2xl bg-coral text-white px-7 py-4">
                    <IconX className="w-9 h-9" />
                    <div className="text-left">
                      <p className="font-display font-bold text-2xl leading-none">Süre doldu!</p>
                      <p className="text-sm font-bold opacity-90 mt-1">
                        Doğru ses {g.target?.say} idi — dinle ve tekrar et.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- bitti ---- */}
            {g.status === "done" && (
              <div className="text-center py-6 anim-pop">
                {g.newRecord && (
                  <p className="inline-flex items-center gap-2 sticker-sm rounded-full bg-amber text-ink px-4 py-2 font-display font-bold mb-4">
                    <IconTrophy className="w-5 h-5" /> YENİ REKOR!
                  </p>
                )}
                <h3 className="font-display font-bold text-3xl text-ink mb-3">Av tamamlandı!</h3>
                <div className="flex justify-center gap-1.5 mb-4">
                  {[0, 1, 2].map((i) => (
                    <IconStar
                      key={i}
                      className={`w-10 h-10 ${i < starsFor(g.score) ? "text-amber-deep" : "text-ink/15"}`}
                      filled={i < starsFor(g.score)}
                    />
                  ))}
                </div>
                <p className="font-display font-bold text-5xl text-ink mb-2">{g.score} puan</p>
                <p className="text-ink-soft font-semibold mb-6">
                  {g.correctCount}/{TOTAL_ROUNDS} doğru · en iyi seri {g.bestStreak} · rekor {g.record}
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={g.startGame}
                    className="btn-toy sticker rounded-2xl bg-leaf text-white px-7 py-3.5 font-display font-bold text-lg inline-flex items-center gap-2.5"
                  >
                    <IconPlay className="w-5 h-5" /> Tekrar Oyna
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      g.stopGame();
                    }}
                    className="btn-toy sticker rounded-2xl bg-paper px-7 py-3.5 font-display font-bold text-lg"
                  >
                    Başa Dön
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------------- etkinlik merkezi ---------------- */}
        <section id="etkinlikler" className="scroll-mt-20 mt-12">
          <SectionHead
            kicker={`${group.name} Grubu · ${ACTIVITY_COUNT} Farklı Oyun`}
            title="Etkinlik Merkezi"
            desc="Dinleme, okuma, yazma, hafıza ve dikkat becerilerini çalıştıran etkinlikler. Her turda doğru cevap +10, hızlı cevap ve seriler ekstra puan kazandırır."
            right={
              <StatChip
                label="Etkinlik Puanı"
                value={totalPoints}
                icon={<IconSparkle className="w-5 h-5 text-grape-deep" />}
                accent="text-grape-deep"
              />
            }
          />
          <ActivityCenter group={group} onPoints={addPoints} />
        </section>

        {/* ---------------- kelime bahçesi ---------------- */}
        <section id="kelimeler" className="scroll-mt-20 mt-12">
          <SectionHead
            kicker={`Sadece ${group.name} harfleriyle`}
            title="Kelime Bahçesi"
            desc="Bu grubun harfleriyle okunabilen kelimeler ve ilk cümleler. Dokun, dinle, tekrar et."
          />
          <div className="sticker rounded-2xl bg-paper p-6 sm:p-8">
            <div className="flex flex-wrap gap-2.5">
              {group.words.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    sfx.pop();
                    say(w, { rate: 0.8 });
                  }}
                  className="btn-toy sticker-sm rounded-xl bg-mint hover:bg-mint-deep px-4 py-2.5 font-display font-bold text-lg text-ink inline-flex items-center gap-2"
                >
                  <IconSpeaker className="w-4 h-4 text-sky-deep" />
                  {w}
                </button>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t-[3px] border-dashed border-ink/15">
              <p className="text-[11px] font-black tracking-[0.2em] text-leaf-deep uppercase mb-3">
                İlk cümleler
              </p>
              <div className="flex flex-col gap-2.5">
                {group.sentences.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      sfx.pop();
                      say(s, { rate: 0.85 });
                    }}
                    className="btn-toy sticker-sm rounded-xl bg-sand px-4 py-3 font-display font-bold text-lg text-ink text-left inline-flex items-center gap-3"
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                      style={{ background: FLOAT_COLORS[i % FLOAT_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- bilgi ---------------- */}
        <section id="bilgi" className="scroll-mt-20 mt-12 grid md:grid-cols-2 gap-5">
          <div className="sticker rounded-2xl bg-paper p-6">
            <h3 className="font-display font-bold text-xl text-ink mb-4">Neden ANETİL?</h3>
            <ul className="space-y-3">
              {[
                ["Hızlı anlam", "Daha ilk iki sesle “an”, “ana” gibi gerçek kelimeler kurulur."],
                ["Motivasyon", "Üçüncü sesle “anne” yazılır; çocuk hemen başarır, heveslenir."],
                ["Akıcı heceleme", "Sesler Türkçenin hece yapısına uygun sırayla verilir."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 w-7 h-7 rounded-full bg-leaf text-white flex items-center justify-center shrink-0">
                    <IconCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="font-display font-bold text-ink">{t}</p>
                    <p className="text-sm text-ink-soft font-semibold">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="sticker rounded-2xl bg-paper p-6">
            <h3 className="font-display font-bold text-xl text-ink mb-4">
              Ses Grupları Sıralaması <span className="text-sm text-ink-soft font-semibold">(Maarif Modeli 2026-2027)</span>
            </h3>
            <ol className="space-y-2.5">
              {GROUPS.map((gr, i) => (
                <li key={gr.id}>
                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setGroupId(gr.id);
                      document.getElementById("harfler")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl border-[3px] px-3.5 py-2.5 text-left transition-all ${
                      gr.id === group.id
                        ? "border-ink bg-mint"
                        : "border-ink/15 bg-paper hover:border-ink/50 hover:-translate-y-0.5"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg text-white font-display font-bold flex items-center justify-center shrink-0"
                      style={{ background: FLOAT_COLORS[i % FLOAT_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    <span className="font-display font-bold text-lg tracking-wide text-ink">
                      {gr.name}
                    </span>
                    <span className="ml-auto text-[11px] font-black tracking-widest text-ink-soft uppercase">
                      {gr.letters.length} ses
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="mt-12 text-center text-ink-soft text-sm font-semibold">
          <p>
            Maarif Modeli 2026-2027 · 1. sınıf ilk okuma-yazma · Sesler cihazının Türkçe ses
            motoruyla okunur.
          </p>
        </footer>
      </div>
    </div>
  );
}

function starsFor(score: number): number {
  if (score >= 160) return 3;
  if (score >= 100) return 2;
  if (score >= 50) return 1;
  return 0;
}
