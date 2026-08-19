import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { GroupDef, LetterDef } from "../game/letters";
import { shuffle } from "../game/letters";
import { cancelSpeech, say, sayQuick } from "../game/speech";
import { sfx } from "../game/sfx";
import { IconCheck, IconFlame, IconReplay, IconSparkle, IconStar, IconX } from "../components/Icons";

/* ------------------------------------------------------------------ */
/* Tipler                                                              */
/* ------------------------------------------------------------------ */

export interface ActivityResult {
  score: number;
  correct: number;
  total: number;
  stars: number;
}

export interface ActivityProps {
  group: GroupDef;
  onExit: () => void;
  onComplete: (res: ActivityResult) => void;
}

interface Feedback {
  ok: boolean;
  msg: string;
  gained: number;
}

/* ------------------------------------------------------------------ */
/* Ortak veri yardımcıları                                             */
/* ------------------------------------------------------------------ */

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

/** Seçenek listesi her zaman doğru şıkkı içerir. */
export function ensureOpts(group: GroupDef, correct: LetterDef, count = 6): LetterDef[] {
  const others = group.letters.filter((l) => l.id !== correct.id);
  return shuffle([correct, ...sample(others, count - 1)]);
}

export function syllableCount(word: string): number {
  const m = word.toLocaleLowerCase("tr-TR").match(/[aeıioöuü]+/g);
  return m ? m.length : 1;
}

export function countChar(word: string, upper: string): number {
  return word.split("").filter((c) => c.toLocaleUpperCase("tr-TR") === upper).length;
}

export function wordOptions(words: string[], target: string, n: number): string[] {
  const pool = words.filter(
    (w) => w !== target && !w.startsWith(target) && !target.startsWith(w),
  );
  return shuffle([target, ...sample(pool, n - 1)]);
}

/** Grup kelimelerindeki harflerden uydurma (anlamsız) hece dizisi üretir. */
export function nonsenseOf(group: GroupDef): string {
  const chars = new Set<string>();
  group.words.forEach((w) => w.split("").forEach((c) => chars.add(c)));
  const vs = [...chars].filter((c) => "aeıioöuü".includes(c));
  const cs = [...chars].filter((c) => !"aeıioöuü".includes(c));
  if (vs.length === 0 || cs.length === 0) return "lalala";
  const v = () => pick(vs);
  const c = () => pick(cs);
  for (let attempt = 0; attempt < 25; attempt++) {
    let s = "";
    const parts = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < parts; i++) {
      const p = pick(["cv", "vc", "cvc"]);
      s += p === "cv" ? c() + v() : p === "vc" ? v() + c() : c() + v() + c();
    }
    if (s.length >= 4 && !group.words.includes(s)) return s;
  }
  return "tenele";
}

/* ------------------------------------------------------------------ */
/* Tur / puan motoru                                                   */
/* ------------------------------------------------------------------ */

export interface Engine {
  round: number;
  runId: number;
  score: number;
  streak: number;
  correct: number;
  total: number;
  stars: number;
  feedback: Feedback | null;
  done: boolean;
  arm: () => void;
  settle: (ok: boolean, okMsg: string, badMsg: string) => void;
  reset: () => void;
  after: (fn: () => void, ms: number) => void;
}

export function useEngine(total: number, onComplete: (r: ActivityResult) => void): Engine {
  const [round, setRound] = useState(1);
  const [runId, setRunId] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [done, setDone] = useState(false);
  const [stars, setStars] = useState(0);

  const roundRef = useRef(1);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const streakRef = useRef(0);
  const lockRef = useRef(false);
  const doneRef = useRef(false);
  const armedAtRef = useRef(0);
  const timers = useRef<number[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const after = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      cancelSpeech();
    },
    [],
  );

  const arm = useCallback(() => {
    armedAtRef.current = Date.now();
  }, []);

  const settle = useCallback(
    (ok: boolean, okMsg: string, badMsg: string) => {
      if (lockRef.current || doneRef.current) return;
      lockRef.current = true;

      const finishRound = (delay: number) => {
        after(() => {
          lockRef.current = false;
          setFeedback(null);
          if (roundRef.current >= total) {
            if (doneRef.current) return;
            doneRef.current = true;
            sfx.win();
            setDone(true);
            const ratio = correctRef.current / total;
            const starCount = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : ratio >= 0.4 ? 1 : 0;
            setStars(starCount);
            onCompleteRef.current({
              score: scoreRef.current,
              correct: correctRef.current,
              total,
              stars: starCount,
            });
          } else {
            roundRef.current += 1;
            setRound(roundRef.current);
          }
        }, delay);
      };

      if (ok) {
        const fast = armedAtRef.current > 0 && Date.now() - armedAtRef.current < 4000;
        const hot = streakRef.current >= 3;
        const extra = (fast ? 5 : 0) + (hot ? 5 : 0);
        const gained = 10 + extra;
        scoreRef.current += gained;
        correctRef.current += 1;
        streakRef.current += 1;
        setScore(scoreRef.current);
        setCorrect(correctRef.current);
        setStreak(streakRef.current);
        if (hot) sfx.sparkle();
        else sfx.correct();
        setFeedback({
          ok: true,
          msg: extra > 0 ? `${okMsg} · EKSTRA +${extra}` : okMsg,
          gained,
        });
        finishRound(1600);
      } else {
        streakRef.current = 0;
        setStreak(0);
        sfx.wrong();
        setFeedback({ ok: false, msg: badMsg, gained: 0 });
        finishRound(2200);
      }
    },
    [after, total],
  );

  const reset = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    cancelSpeech();
    roundRef.current = 1;
    scoreRef.current = 0;
    correctRef.current = 0;
    streakRef.current = 0;
    lockRef.current = false;
    doneRef.current = false;
    armedAtRef.current = 0;
    setRound(1);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setFeedback(null);
    setDone(false);
    setStars(0);
    setRunId((x) => x + 1);
  }, []);

  return {
    round,
    runId,
    score,
    streak,
    correct,
    total,
    stars,
    feedback,
    done,
    arm,
    settle,
    reset,
    after,
  };
}

/* ------------------------------------------------------------------ */
/* Görsel parçalar                                                     */
/* ------------------------------------------------------------------ */

export function Shell({
  icon,
  title,
  skill,
  eng,
  onExit,
  intro,
  children,
}: {
  icon: ReactNode;
  title: string;
  skill: string;
  eng: Engine;
  onExit: () => void;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sticker rounded-2xl bg-paper overflow-hidden">
      {/* üst şerit */}
      <div className="flex items-center gap-3 flex-wrap px-4 sm:px-6 py-4 border-b-[3px] border-ink bg-mint/60">
        <button
          type="button"
          onClick={() => {
            sfx.tap();
            onExit();
          }}
          className="btn-toy rounded-lg bg-paper w-10 h-10 flex items-center justify-center text-ink"
          aria-label="Etkinlik listesine dön"
        >
          <IconX className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-lg bg-ink text-mint flex items-center justify-center">
            {icon}
          </span>
          <div className="leading-tight">
            <h3 className="font-display font-bold text-lg text-ink leading-none">{title}</h3>
            <p className="text-[10px] font-black tracking-[0.18em] text-sky-deep uppercase mt-1">
              {skill}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="sticker-sm rounded-lg bg-paper px-3 py-1.5 font-display font-bold text-sm text-ink">
            Tur {Math.min(eng.round, eng.total)}/{eng.total}
          </span>
          <span className="sticker-sm rounded-lg bg-amber px-3 py-1.5 font-display font-bold text-sm text-ink">
            {eng.score} puan
          </span>
          {eng.streak >= 2 && (
            <span className="sticker-sm rounded-lg bg-coral px-2.5 py-1.5 flex items-center gap-1 font-display font-bold text-sm text-white anim-pop">
              <IconFlame className="w-4 h-4" />
              {eng.streak}
            </span>
          )}
        </div>
      </div>

      {/* tur noktaları */}
      <div className="flex items-center justify-center gap-1.5 py-3">
        {Array.from({ length: eng.total }, (_, i) => {
          const state = i < eng.correct ? "bg-leaf" : i === eng.round - 1 && !eng.done ? "bg-sky anim-pulse-soft" : "bg-ink/15";
          return <span key={i} className={`w-3 h-3 rounded-full border-2 border-ink/30 ${state}`} />;
        })}
      </div>

      <div className="px-4 sm:px-8 pb-7">
        {/* yönerge */}
        <div className="rounded-xl bg-sand border-[3px] border-ink/15 px-4 py-3 mb-5 text-center">
          {intro}
        </div>

        {eng.done ? <DoneCard eng={eng} onExit={onExit} /> : children}

        {/* geri bildirim şeridi */}
        <div className="min-h-[72px] mt-5 flex items-center justify-center">
          {eng.feedback && (
            <div
              className={`anim-pop w-full max-w-md rounded-xl border-[3px] border-ink px-4 py-3 flex items-center justify-center gap-3 font-display font-bold text-lg text-center ${
                eng.feedback.ok ? "bg-leaf text-white" : "bg-coral text-white"
              }`}
            >
              <span className="shrink-0 w-9 h-9 rounded-full bg-paper/25 flex items-center justify-center">
                {eng.feedback.ok ? <IconCheck className="w-6 h-6" /> : <IconX className="w-6 h-6" />}
              </span>
              <span>
                {eng.feedback.msg}
                {eng.feedback.ok && <span className="ml-2 text-amber">+{eng.feedback.gained}</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DoneCard({ eng, onExit }: { eng: Engine; onExit: () => void }) {
  const pct = Math.round((eng.correct / eng.total) * 100);
  const praise =
    eng.correct === eng.total
      ? "Kusursuz! Hepsini bildin!"
      : eng.stars >= 2
        ? "Harika iş çıkardın!"
        : eng.stars === 1
          ? "Güzel deneme, biraz daha pratik!"
          : "Tekrar dene, kesin yaparsın!";
  return (
    <div className="anim-pop rounded-2xl border-[3px] border-ink bg-mint px-6 py-8 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={i < eng.stars ? "text-amber-deep anim-pop" : "text-ink/15"}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <IconStar className="w-12 h-12" filled={i < eng.stars} />
          </span>
        ))}
      </div>
      <p className="font-display font-bold text-2xl text-ink mb-1">{praise}</p>
      <p className="text-ink-soft font-semibold mb-4">
        {eng.correct}/{eng.total} doğru · başarı %{pct}
      </p>
      <p className="font-display font-bold text-4xl text-sky-deep mb-6">
        +{eng.score} <span className="text-xl">puan</span>
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            sfx.tap();
            eng.reset();
          }}
          className="btn-toy rounded-xl bg-leaf text-white px-6 py-3 font-display font-bold flex items-center gap-2"
        >
          <IconReplay className="w-5 h-5" /> Tekrar Oyna
        </button>
        <button
          type="button"
          onClick={() => {
            sfx.tap();
            onExit();
          }}
          className="btn-toy rounded-xl bg-paper text-ink px-6 py-3 font-display font-bold flex items-center gap-2"
        >
          <IconSparkle className="w-5 h-5" /> Diğer Etkinlikler
        </button>
      </div>
    </div>
  );
}

export function ReplayButton({ text, label = "Sesi tekrar dinle" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.tap();
        sayQuick(text);
      }}
      className="btn-toy inline-flex items-center gap-2 rounded-lg bg-sky text-white px-4 py-2 font-display font-bold text-sm"
    >
      <IconReplay className="w-4 h-4" /> {label}
    </button>
  );
}

export function BigWord({ text, highlight }: { text: string; highlight?: number }) {
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap" aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className={`font-display font-bold text-4xl sm:text-5xl leading-none px-1.5 ${
            i === highlight
              ? "text-coral-deep border-b-8 border-coral animate-pulse"
              : "text-ink"
          }`}
        >
          {i === highlight ? "_" : ch}
        </span>
      ))}
    </div>
  );
}

export function ChoiceButton({
  label,
  sub,
  state,
  onClick,
  color = "bg-paper",
}: {
  label: ReactNode;
  sub?: string;
  state: "idle" | "correct" | "wrong" | "dim";
  onClick?: () => void;
  color?: string;
}) {
  const cls =
    state === "correct"
      ? "bg-leaf text-white ring-4 ring-leaf-deep anim-pop"
      : state === "wrong"
        ? "bg-coral text-white ring-4 ring-coral-deep anim-shake"
        : state === "dim"
          ? "bg-paper text-ink/30"
          : `${color} text-ink`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || state === "dim" || state === "correct" || state === "wrong"}
      className={`sticker-sm rounded-xl px-4 py-3 font-display font-bold text-xl sm:text-2xl leading-tight transition-transform ${cls} ${
        onClick && state === "idle" ? "btn-toy hover:-rotate-1" : ""
      }`}
    >
      {label}
      {sub && <span className="block text-[11px] font-bold tracking-wide opacity-75 mt-0.5">{sub}</span>}
    </button>
  );
}
