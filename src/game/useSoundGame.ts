import { useCallback, useEffect, useRef, useState } from "react";
import { LETTERS, shuffle, type LetterDef } from "./letters";
import { cancelSpeech, say } from "./speech";

export type Phase = "idle" | "listen" | "wait" | "answer" | "reveal" | "done";

export interface Feedback {
  kind: "correct" | "wrong" | "timeout";
  gained: number;
  speedBonus: boolean;
  streakBonus: boolean;
  praise: string;
}

export const TOTAL_ROUNDS = 10;
export const WAIT_SECONDS = 5;
export const ANSWER_LIMIT_MS = 8000;
const SPEED_BONUS_MS = 3000;

const PRAISES = ["Süper!", "Harika!", "Çok iyi!", "Bravo!", "Muhteşem!"];

const BEST_KEY = "anetil.best.v1";

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v: number) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* sessizce geç */
  }
}

export function useSoundGame() {
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [round, setRound] = useState(0); // 0 tabanlı, ekranda +1
  const [target, setTarget] = useState<LetterDef>(LETTERS[0]);
  const [options, setOptions] = useState<LetterDef[]>(LETTERS);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [results, setResults] = useState<("ok" | "no" | null)[]>(Array(TOTAL_ROUNDS).fill(null));
  const [best, setBest] = useState<number>(loadBest);
  const [newBest, setNewBest] = useState(false);
  const [waitRemaining, setWaitRemaining] = useState(WAIT_SECONDS);
  const [saidNow, setSaidNow] = useState(0); // hoparlör animasyonu tetikleyicisi

  const phaseRef = useRef<Phase>("idle");
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const targetRef = useRef<LetterDef>(LETTERS[0]);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const answerStartRef = useRef(0);
  const roundRef = useRef(0);
  const lastTargetRef = useRef<string | null>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      cancelSpeech();
    };
  }, [clearTimers]);

  /* ---------------- akış ---------------- */

  const startWait = useCallback(() => {
    setPhase("wait");
    setWaitRemaining(WAIT_SECONDS);
    const startedAt = Date.now();
    intervalRef.current = window.setInterval(() => {
      const left = WAIT_SECONDS - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        setWaitRemaining(0);
        startAnswer();
      } else {
        setWaitRemaining(left);
      }
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPhase]);

  const startAnswer = useCallback(() => {
    setPhase("answer");
    answerStartRef.current = Date.now();
    after(ANSWER_LIMIT_MS, () => {
      if (phaseRef.current === "answer") resolve(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPhase, after]);

  const resolve = useCallback(
    (pickId: string | null) => {
      if (phaseRef.current !== "answer") return;
      clearTimers();
      const t = targetRef.current;
      const correct = pickId !== null && pickId === t.id;
      const answerMs = Date.now() - answerStartRef.current;

      let gained = 0;
      let speedBonus = false;
      let streakBonus = false;

      if (correct) {
        gained = 10;
        speedBonus = answerMs <= SPEED_BONUS_MS;
        if (speedBonus) gained += 5;
        streakRef.current += 1;
        if (streakRef.current >= 3) {
          streakBonus = true;
          gained += 5;
        }
      } else {
        streakRef.current = 0;
      }
      setStreak(streakRef.current);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setPicked(pickId);
      setResults((prev) => {
        const next = [...prev];
        next[roundRef.current] = correct ? "ok" : "no";
        return next;
      });

      const kind: Feedback["kind"] = correct ? "correct" : pickId === null ? "timeout" : "wrong";
      setFeedback({
        kind,
        gained,
        speedBonus,
        streakBonus,
        praise: PRAISES[Math.floor(Math.random() * PRAISES.length)],
      });
      setPhase("reveal");

      // "sesi söyle" — doğru ses her turda mutlaka okunur
      say(t.say, { rate: 0.78 });

      after(2300, () => {
        const nextRound = roundRef.current + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          finishRun();
        } else {
          roundRef.current = nextRound;
          setRound(nextRound);
          beginRound();
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [after, clearTimers, setPhase],
  );

  const beginRound = useCallback(() => {
    clearTimers();
    setFeedback(null);
    setPicked(null);

    let t = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (LETTERS.length > 1 && t.id === lastTargetRef.current) {
      t = LETTERS[(LETTERS.indexOf(t) + 1 + Math.floor(Math.random() * (LETTERS.length - 1))) % LETTERS.length];
    }
    lastTargetRef.current = t.id;
    targetRef.current = t;
    setTarget(t);
    setOptions(shuffle(LETTERS));
    setPhase("listen");
    setSaidNow((n) => n + 1);

    after(500, () => {
      if (phaseRef.current !== "listen") return;
      say(t.say, { onEnd: () => after(350, () => phaseRef.current === "listen" && startWait()) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [after, clearTimers, setPhase, startWait]);

  const finishRun = useCallback(() => {
    setPhase("done");
    setBest((prev) => {
      const final = scoreRef.current;
      if (final > prev) {
        saveBest(final);
        setNewBest(true);
        return final;
      }
      setNewBest(false);
      return prev;
    });
  }, [setPhase]);

  const start = useCallback(() => {
    clearTimers();
    cancelSpeech();
    scoreRef.current = 0;
    streakRef.current = 0;
    roundRef.current = 0;
    lastTargetRef.current = null;
    setScore(0);
    setStreak(0);
    setRound(0);
    setResults(Array(TOTAL_ROUNDS).fill(null));
    setNewBest(false);
    beginRound();
  }, [beginRound, clearTimers]);

  const pick = useCallback(
    (id: string) => {
      if (phaseRef.current !== "answer") return;
      resolve(id);
    },
    [resolve],
  );

  const replay = useCallback(() => {
    const p = phaseRef.current;
    if (p !== "wait" && p !== "answer" && p !== "reveal") return;
    setSaidNow((n) => n + 1);
    say(targetRef.current.say, { rate: 0.78 });
  }, []);

  const correctCount = results.filter((r) => r === "ok").length;
  const stars = score >= 130 ? 3 : score >= 80 ? 2 : score >= 40 ? 1 : 0;

  return {
    phase,
    round,
    target,
    options,
    picked,
    feedback,
    score,
    streak,
    results,
    best,
    newBest,
    waitRemaining,
    saidNow,
    correctCount,
    stars,
    actions: { start, pick, replay },
  };
}
