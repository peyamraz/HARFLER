import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupDef, LetterDef } from "./letters";
import { shuffle } from "./letters";
import { bonusLabel, elapsedSeconds, scoreAnswer } from "./scoring";
import { cancelSpeech, isSpeechSupported, say, setMuted as setSpeechMuted } from "./speech";
import { setSfxMuted, sfx } from "./sfx";

export const TOTAL_ROUNDS = 10;
export const REMEMBER_SECONDS = 5;
const COUNTDOWN_STEP_MS = 100;
const MUTE_KEY = "ses-avi-sessiz";

export type GameStatus = "start" | "playing" | "remember" | "answer" | "feedback" | "done";

export interface RunState {
  status: GameStatus;
  score: number;
  streak: number;
  bestStreak: number;
  round: number;
  target: LetterDef | null;
  tiles: LetterDef[];
  rememberLeft: number;
  bonusText: string | null;
  correctId: string | null;
  wrongId: string | null;
  /** Cevap verme süresi (saniye, tek ondalık). Ölçülemediyse null. */
  answeredIn: number | null;
  lastWord: string | null;
  newRecord: boolean;
  correctCount: number;
  speechOk: boolean;
}

const initialRun = (speechOk: boolean): RunState => ({
  status: "start",
  score: 0,
  streak: 0,
  bestStreak: 0,
  round: 0,
  target: null,
  tiles: [],
  rememberLeft: 0,
  bonusText: null,
  correctId: null,
  wrongId: null,
  answeredIn: null,
  lastWord: null,
  newRecord: false,
  correctCount: 0,
  speechOk,
});

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useSoundGame(group: GroupDef) {
  const [run, setRun] = useState<RunState>(() => initialRun(isSpeechSupported()));
  const [record, setRecord] = useState(0);
  const [muted, setMutedState] = useState(readMuted);

  const timers = useRef<number[]>([]);
  const runRef = useRef(run);
  runRef.current = run;
  const seqRef = useRef<LetterDef[]>([]);
  /** Geri sayım bir bitiş zaman damgasına bağlıdır; sekme yavaşlasa da kaymaz. */
  const rememberEndsAt = useRef(0);
  /** Cevap ekranının açıldığı an — "hızlı kulak" bonusu buna göre hesaplanır. */
  const answerStartedAt = useRef(0);
  const lastTick = useRef(REMEMBER_SECONDS);

  const recordKey = `ses-avi-rekor-${group.id}`;
  const recordRef = useRef(record);
  recordRef.current = record;

  /* ---- yardımcılar ---- */
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    timers.current = [];
  }, []);

  const resetRefs = useCallback(() => {
    seqRef.current = [];
    rememberEndsAt.current = 0;
    answerStartedAt.current = 0;
    lastTick.current = REMEMBER_SECONDS;
  }, []);

  const stopGame = useCallback(() => {
    clearTimers();
    cancelSpeech();
    resetRefs();
    setRun((r) => initialRun(r.speechOk));
  }, [clearTimers, resetRefs]);

  /* ---- grup değişince skoru yükle, süren oyunu durdur ---- */
  useEffect(() => {
    let v = 0;
    try {
      v = Number(localStorage.getItem(recordKey) ?? 0);
    } catch {
      v = 0;
    }
    setRecord(Number.isFinite(v) ? v : 0);
  }, [recordKey]);

  const prevGroup = useRef(group.id);
  useEffect(() => {
    if (prevGroup.current !== group.id) {
      prevGroup.current = group.id;
      stopGame();
    }
  }, [group.id, stopGame]);

  /* sessizlik tercihi hem modüllere uygulanır hem cihazda saklanır */
  useEffect(() => {
    setSpeechMuted(muted);
    setSfxMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* depolama kapalıysa tercih oturumluk kalır */
    }
  }, [muted]);

  useEffect(
    () => () => {
      clearTimers();
      cancelSpeech();
    },
    [clearTimers],
  );

  /* ---- tur akışı ---- */
  const playRound = useCallback((n: number, tiles: LetterDef[]) => {
    const target = seqRef.current[n - 1];
    if (!target) return;
    setRun((r) => ({
      ...r,
      status: "playing",
      round: n,
      target,
      tiles: shuffle(tiles),
      correctId: null,
      wrongId: null,
      bonusText: null,
      answeredIn: null,
    }));
    sfx.listen();
    say(`Sıra ${n}. seste. Kulaklar hazır mı? Dinle: ${target.say}`, {
      rate: 0.82,
      onEnd: () => {
        const r = runRef.current;
        if (r.status !== "playing" || r.round !== n) return;
        sfx.tick();
        rememberEndsAt.current = Date.now() + REMEMBER_SECONDS * 1000;
        lastTick.current = REMEMBER_SECONDS;
        setRun((cur) => ({ ...cur, status: "remember", rememberLeft: REMEMBER_SECONDS }));

        const tick = window.setInterval(() => {
          if (runRef.current.status !== "remember") {
            window.clearInterval(tick);
            return;
          }
          const leftMs = rememberEndsAt.current - Date.now();
          const left = Math.max(0, Math.round(leftMs / 100) / 10);
          const ceil = Math.ceil(left);
          if (ceil < lastTick.current) {
            lastTick.current = ceil;
            sfx.tick();
          }
          if (left <= 0) {
            window.clearInterval(tick);
            sfx.flip();
            answerStartedAt.current = Date.now();
            setRun((c) => (c.status === "remember" ? { ...c, status: "answer", rememberLeft: 0 } : c));
            return;
          }
          setRun((c) => (c.status === "remember" ? { ...c, rememberLeft: left } : c));
        }, COUNTDOWN_STEP_MS);
        timers.current.push(tick as unknown as number);
      },
    });
  }, []);

  const advanceRound = useCallback(() => {
    const cur = runRef.current;
    if (cur.status !== "feedback") return;
    if (cur.round >= TOTAL_ROUNDS) {
      let newRecord = false;
      if (cur.score > recordRef.current) {
        newRecord = true;
        try {
          localStorage.setItem(recordKey, String(cur.score));
        } catch {
          /* depolama kapalıysa rekor oturumluk tutulur */
        }
        setRecord(cur.score);
      }
      sfx.win();
      setRun((x) => ({ ...x, status: "done", newRecord }));
    } else {
      playRound(cur.round + 1, cur.tiles);
    }
  }, [playRound, recordKey]);

  const startGame = useCallback(() => {
    const st = runRef.current.status;
    if (st !== "start" && st !== "done") return; // çift başlatmaya karşı koruma
    clearTimers();
    cancelSpeech();
    resetRefs();
    sfx.tap();
    const letters = group.letters;
    seqRef.current = Array.from(
      { length: TOTAL_ROUNDS },
      () => letters[Math.floor(Math.random() * letters.length)],
    );
    setRun({ ...initialRun(isSpeechSupported()), status: "playing", tiles: shuffle(letters) });
    later(() => playRound(1, letters), 400);
  }, [group, clearTimers, resetRefs, later, playRound]);

  /* ---- cevap verme ---- */
  const pick = useCallback(
    (letter: LetterDef, el?: HTMLElement) => {
      const r = runRef.current;
      if (r.status !== "answer" || !r.target) return;

      if (letter.id === r.target.id) {
        const now = Date.now();
        const elapsedMs = answerStartedAt.current > 0 ? now - answerStartedAt.current : Infinity;
        const { points: gained, fast, hot } = scoreAnswer({
          elapsedMs,
          streakBefore: r.streak,
        });
        const bonusText = bonusLabel(fast, hot);
        if (el) {
          const b = el.getBoundingClientRect();
          el.dispatchEvent(
            new CustomEvent("ses-avi-burst", {
              bubbles: true,
              detail: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
            }),
          );
        }
        if (hot) sfx.sparkle();
        else sfx.correct();
        say(`${letter.say} sesi, ${letter.char} harfi. Dinle ve tekrar et: ${letter.say}!`, {
          rate: 0.8,
        });
        setRun((cur) => ({
          ...cur,
          status: "feedback",
          correctId: letter.id,
          score: cur.score + gained,
          streak: cur.streak + 1,
          bestStreak: Math.max(cur.bestStreak, cur.streak + 1),
          correctCount: cur.correctCount + 1,
          bonusText,
          answeredIn: elapsedSeconds(answerStartedAt.current, now),
        }));
        later(() => advanceRound(), 3400);
      } else {
        sfx.wrong();
        say("Olmadı, tekrar dene!", { rate: 0.92 });
        setRun((cur) => ({ ...cur, wrongId: letter.id, streak: 0, bonusText: null }));
        later(
          () => setRun((cur) => (cur.wrongId === letter.id ? { ...cur, wrongId: null } : cur)),
          500,
        );
      }
    },
    [later, advanceRound],
  );

  /* ---- süre dolunca doğru sesi göster ---- */
  const reveal = useCallback(() => {
    const r = runRef.current;
    if (r.status !== "answer" || !r.target) return;
    cancelSpeech();
    sfx.wrong();
    say(`Süre doldu! Doğru ses ${r.target.say} idi. Dinle: ${r.target.say}`, { rate: 0.8 });
    setRun((cur) => ({
      ...cur,
      status: "feedback",
      correctId: r.target!.id,
      streak: 0,
      bonusText: null,
    }));
    later(() => advanceRound(), 3200);
  }, [later, advanceRound]);

  const replaySound = useCallback(() => {
    const r = runRef.current;
    if (r.target) {
      sfx.tap();
      say(r.target.say, { rate: 0.78 });
    }
  }, []);

  /* ---- klavye ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const r = runRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (r.status === "start" || r.status === "done") startGame();
        return;
      }
      if (e.code === "Enter" && r.status === "done") {
        startGame();
        return;
      }
      if (r.status === "answer") {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= r.tiles.length) pick(r.tiles[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame, pick]);

  /* ---- ses ---- */
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const applyMuted = useCallback((m: boolean) => {
    setSpeechMuted(m);
    setSfxMuted(m);
    if (m) cancelSpeech();
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    applyMuted(next);
    if (!next) sfx.tap();
    setMutedState(next);
  }, [applyMuted]);

  return {
    ...run,
    record,
    muted,
    startGame,
    stopGame,
    pick,
    reveal,
    replaySound,
    toggleMute,
  };
}
