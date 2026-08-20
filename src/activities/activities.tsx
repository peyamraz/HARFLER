import { Component, useEffect, useRef, useState, type FC, type ReactNode } from "react";
import type { GroupDef, LetterDef } from "../game/letters";
import { LETTER_BY_CHAR, shuffle, trUpper } from "../game/letters";
import { say } from "../game/speech";
import { sfx } from "../game/sfx";
import {
  IconBolt,
  IconBook,
  IconBrain,
  IconCheck,
  IconEar,
  IconHand,
  IconSparkle,
  IconSpeaker,
  IconStar,
  IconVolume,
  IconX,
} from "../components/Icons";
import { LetterTile } from "../components/LetterTile";
import {
  BigWord,
  ChoiceButton,
  ReplayButton,
  Shell,
  countChar,
  ensureOpts,
  nonsenseOf,
  pick,
  sample,
  syllableCount,
  useEngine,
  wordOptions,
  wordsForAnswer,
  type ActivityProps,
  type ActivityResult,
} from "./shared";

/* ================================================================== */
/* 1) HARF SIRASI                                                      */
/* ================================================================== */

function OrderRace({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(6, onComplete);
  const [pool, setPool] = useState<LetterDef[]>([]);
  const [placed, setPlaced] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);

  useEffect(() => {
    setPool(shuffle(group.letters));
    setPlaced(0);
    setWrongId(null);
    eng.arm();
    sfx.listen();
    say("Harflere öğrenme sırasıyla dokun.", { rate: 0.85 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (l: LetterDef) => {
    if (eng.done || eng.feedback) return;
    if (group.letters.slice(0, placed).some((p) => p.id === l.id)) return;
    const expected = group.letters[placed];
    if (l.id === expected.id) {
      sfx.pop();
      say(l.say, { rate: 0.9 });
      const next = placed + 1;
      setPlaced(next);
      if (next === group.letters.length) {
        eng.settle(true, "Sıralama tamam!", "");
      }
    } else {
      sfx.wrong();
      setWrongId(l.id);
      eng.after(() => setWrongId((w) => (w === l.id ? null : w)), 420);
    }
  };

  return (
    <Shell
      icon={<IconBook className="w-5 h-5" />}
      title="Harf Sırası"
      skill="Sıralama"
      eng={eng}
      onExit={onExit}
      intro={
        <p className="font-display font-bold text-ink">
          Harflere <span className="text-sky-deep">öğrenme sırasıyla</span> dokun: 1, 2, 3…
        </p>
      }
    >
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 flex-wrap">
        {group.letters.map((l, i) => (
          <div
            key={l.id}
            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-lg border-[3px] border-ink flex items-center justify-center font-display font-bold text-lg ${
              i < placed ? `${l.bg} ${l.fg} anim-pop` : "bg-mint text-ink/35"
            }`}
          >
            {i < placed ? l.char : i + 1}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
        {pool.map((l) => {
          const used = group.letters.slice(0, placed).some((p) => p.id === l.id);
          return (
            <LetterTile
              key={l.id}
              letter={l}
              size="md"
              state={used ? "dim" : wrongId === l.id ? "wrong" : "idle"}
              onClick={() => tap(l)}
            />
          );
        })}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 2) KELİME AVI                                                       */
/* ================================================================== */

function WordHunt({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; opts: string[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const word = pick(group.words);
    setQ({ word, opts: wordOptions(group.words, word, 4) });
    setChosen(null);
    sfx.listen();
    say(word, { rate: 0.75 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (w: string) => {
    if (!q || chosen || eng.feedback || eng.done) return;
    setChosen(w);
    if (w === q.word) {
      say(q.word, { rate: 0.8 });
      eng.settle(true, `Bravo! Kelime "${q.word}".`, "");
    } else {
      say(q.word, { rate: 0.8 });
      eng.settle(false, "", `Duyduğun kelime "${q.word}" idi.`);
    }
  };

  const stateOf = (w: string) => {
    if (!q) return "idle" as const;
    if (chosen && w === q.word) return "correct" as const;
    if (chosen === w && w !== q.word) return "wrong" as const;
    return "idle" as const;
  };

  return (
    <Shell
      icon={<IconEar className="w-5 h-5" />}
      title="Kelime Avı"
      skill="Dinleme"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Dinle, duyduğun kelimeyi yakala!</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
        {q?.opts.map((w) => (
          <ChoiceButton key={w} label={w} onClick={() => tap(w)} state={stateOf(w)} />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 3) BAŞ HARF                                                         */
/* ================================================================== */

function InitialSound({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; answer: LetterDef; opts: LetterDef[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const pool = wordsForAnswer(group, (w) => LETTER_BY_CHAR[trUpper(w[0])]);
    const word = pick(pool);
    const answer = LETTER_BY_CHAR[trUpper(word[0])];
    setQ({ word, answer, opts: ensureOpts(group, answer, 6) });
    setChosen(null);
    sfx.listen();
    say(word, { rate: 0.75 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (l: LetterDef) => {
    if (!q || chosen || eng.feedback || eng.done) return;
    setChosen(l.id);
    if (l.id === q.answer.id) {
      sfx.correct();
      say(`${q.word}. ${q.word}, ${l.say} sesiyle başlar.`, { rate: 0.85 });
      eng.settle(true, `Evet! "${q.word}", ${l.char} ile başlar.`, "");
    } else {
      eng.settle(false, "", `"${q.word}", ${q.answer.char} harfiyle başlıyor.`);
    }
  };

  return (
    <Shell
      icon={<IconSpeaker className="w-5 h-5" />}
      title="Baş Harf"
      skill="Ses–Harf"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Kelimenin ilk sesi hangi harf?</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="mb-6">
        <BigWord text={q?.word ?? ""} highlight={0} />
      </div>
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
        {q?.opts.map((l) => (
          <LetterTile
            key={l.id}
            letter={l}
            size="md"
            state={
              chosen && l.id === q.answer.id
                ? "correct"
                : chosen === l.id && l.id !== q.answer.id
                  ? "wrong"
                  : "idle"
            }
            onClick={() => tap(l)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 4) SON HARF                                                         */
/* ================================================================== */

function FinalSound({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; answer: LetterDef; opts: LetterDef[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const pool = wordsForAnswer(group, (w) => LETTER_BY_CHAR[trUpper(w[w.length - 1])]);
    const word = pick(pool);
    const answer = LETTER_BY_CHAR[trUpper(word[word.length - 1])];
    setQ({ word, answer, opts: ensureOpts(group, answer, 6) });
    setChosen(null);
    sfx.listen();
    say(word, { rate: 0.75 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (l: LetterDef) => {
    if (!q || chosen || eng.feedback || eng.done) return;
    setChosen(l.id);
    if (l.id === q.answer.id) {
      sfx.correct();
      say(`${q.word}. ${q.word}, ${l.say} sesiyle biter.`, { rate: 0.85 });
      eng.settle(true, `Evet! "${q.word}", ${l.char} ile biter.`, "");
    } else {
      eng.settle(false, "", `"${q.word}", ${q.answer.char} harfiyle bitiyor.`);
    }
  };

  return (
    <Shell
      icon={<IconEar className="w-5 h-5" />}
      title="Son Harf"
      skill="Ses–Harf"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Kelimenin son sesi hangi harf?</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="mb-6">
        <BigWord text={q?.word ?? ""} highlight={(q?.word.length ?? 1) - 1} />
      </div>
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
        {q?.opts.map((l) => (
          <LetterTile
            key={l.id}
            letter={l}
            size="md"
            state={
              chosen && l.id === q.answer.id
                ? "correct"
                : chosen === l.id && l.id !== q.answer.id
                  ? "wrong"
                  : "idle"
            }
            onClick={() => tap(l)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 5) KELİME Mİ UYDURMA MI?                                            */
/* ================================================================== */

function RealOrNot({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ s: string; real: boolean } | null>(null);
  const [chosen, setChosen] = useState<boolean | null>(null);

  useEffect(() => {
    const real = Math.random() < 0.5;
    setQ({ s: real ? pick(group.words) : nonsenseOf(group), real });
    setChosen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  useEffect(() => {
    if (q) {
      sfx.listen();
      say(q.s, { rate: 0.75 });
    }
  }, [q]);

  const tap = (guess: boolean) => {
    if (!q || chosen !== null || eng.feedback || eng.done) return;
    setChosen(guess);
    if (guess === q.real) {
      eng.settle(
        true,
        q.real ? `"${q.s}" gerçek bir kelime!` : `"${q.s}" uydurma, iyi yakaladın!`,
        "",
      );
    } else {
      eng.settle(
        false,
        "",
        q.real ? `"${q.s}" gerçek bir kelimeydi.` : `"${q.s}" uydurmaydı.`,
      );
    }
  };

  return (
    <Shell
      icon={<IconCheck className="w-5 h-5" />}
      title="Kelime mi, Uydurma mı?"
      skill="Okuma"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Oku ve karar ver: gerçek mi, uydurma mı?</p>
          {q && <ReplayButton text={q.s} label="Okunuşu dinle" />}
        </div>
      }
    >
      <div className="mb-7">
        <BigWord text={q?.s ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto">
        <ChoiceButton
          label={
            <span className="flex items-center justify-center gap-2">
              <IconCheck className="w-6 h-6" /> Kelime
            </span>
          }
          color="bg-leaf/25"
          state={chosen === null ? "idle" : chosen === true ? (q?.real ? "correct" : "wrong") : q?.real ? "correct" : "dim"}
          onClick={() => tap(true)}
        />
        <ChoiceButton
          label={
            <span className="flex items-center justify-center gap-2">
              <IconX className="w-6 h-6" /> Uydurma
            </span>
          }
          color="bg-coral/20"
          state={chosen === null ? "idle" : chosen === false ? (!q?.real ? "correct" : "wrong") : !q?.real ? "correct" : "dim"}
          onClick={() => tap(false)}
        />
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 6) HECE SAY                                                         */
/* ================================================================== */

function SyllableCountAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; n: number; opts: number[] } | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    const word = pick(group.words);
    const n = syllableCount(word);
    const opts = Array.from(new Set([n - 1, n, n + 1].filter((x) => x >= 1)));
    setQ({ word, n, opts });
    setChosen(null);
    sfx.listen();
    say(word, { rate: 0.7 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (x: number) => {
    if (!q || chosen !== null || eng.feedback || eng.done) return;
    setChosen(x);
    if (x === q.n) eng.settle(true, `"${q.word}": ${q.n} hece!`, "");
    else eng.settle(false, "", `"${q.word}" ${q.n} hece: birlikte say!`);
  };

  return (
    <Shell
      icon={<IconBolt className="w-5 h-5" />}
      title="Hece Say"
      skill="Heceleme"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Dinle, el çırp ve heceleri say!</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="mb-6">
        <BigWord text={q?.word ?? ""} />
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {q?.opts.map((x) => (
          <ChoiceButton
            key={x}
            label={`${x} hece`}
            state={chosen === null ? "idle" : x === q.n ? "correct" : chosen === x ? "wrong" : "dim"}
            onClick={() => tap(x)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 7) HARF SAY                                                         */
/* ================================================================== */

function LetterCountAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; opts: number[] } | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    const word = pick(group.words);
    const n = word.length;
    const opts = Array.from(new Set([n - 1, n, n + 1].filter((x) => x >= 2)));
    setQ({ word, opts });
    setChosen(null);
    sfx.listen();
    say(word, { rate: 0.75 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (x: number) => {
    if (!q || chosen !== null || eng.feedback || eng.done) return;
    setChosen(x);
    if (x === q.word.length) eng.settle(true, `"${q.word}": ${q.word.length} harf!`, "");
    else eng.settle(false, "", `"${q.word}" ${q.word.length} harfli.`);
  };

  return (
    <Shell
      icon={<IconStar className="w-5 h-5" />}
      title="Harf Say"
      skill="Sayma"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Kelime kaç harften oluşuyor?</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="mb-6">
        <BigWord text={q?.word ?? ""} />
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {q?.opts.map((x) => (
          <ChoiceButton
            key={x}
            label={`${x} harf`}
            state={chosen === null ? "idle" : x === q.word.length ? "correct" : chosen === x ? "wrong" : "dim"}
            onClick={() => tap(x)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 8) HARF IZGARASI                                                    */
/* ================================================================== */

function GridHunt({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(5, onComplete);
  const [q, setQ] = useState<{ target: LetterDef; cells: string[]; total: number } | null>(null);
  const [found, setFound] = useState<number[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);

  useEffect(() => {
    const target = pick(group.letters);
    const others = group.letters.filter((l) => l.id !== target.id);
    const total = 4 + Math.floor(Math.random() * 3);
    const cells = [
      ...Array.from({ length: total }, () => target.char),
      ...Array.from({ length: 16 - total }, () => pick(others).char),
    ];
    setQ({ target, cells: shuffle(cells), total });
    setFound([]);
    setWrongCell(null);
    sfx.listen();
    say(`Izgaradaki bütün ${target.char} harflerini bul!`, { rate: 0.85 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (i: number) => {
    if (!q || eng.feedback || eng.done || found.includes(i) || wrongCell !== null) return;
    if (q.cells[i] === q.target.char) {
      sfx.pop();
      const nf = [...found, i];
      setFound(nf);
      if (nf.length === q.total) {
        eng.settle(true, `${q.total} tane ${q.target.char} harfi buldun!`, "");
      }
    } else {
      sfx.wrong();
      setWrongCell(i);
      eng.after(() => setWrongCell((w) => (w === i ? null : w)), 380);
    }
  };

  return (
    <Shell
      icon={<IconSparkle className="w-5 h-5" />}
      title="Harf Izgarası"
      skill="Dikkat"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Hedef harfin hepsini bul, hiçbirini kaçırma!</p>
          {q && <ReplayButton text={`${q.target.char} harflerini bul`} label="Görevi dinle" />}
        </div>
      }
    >
      <div className="flex items-center justify-center gap-3 mb-5">
        {q && <LetterTile letter={q.target} size="md" state="target" />}
        <p className="font-display font-bold text-ink">
          Kalan: <span className="text-coral-deep text-2xl">{q ? q.total - found.length : 0}</span>
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 max-w-sm mx-auto">
        {q?.cells.map((c, i) => {
          const isFound = found.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              disabled={isFound}
              className={`aspect-square rounded-lg border-[3px] border-ink font-display font-bold text-2xl sm:text-3xl flex items-center justify-center ${
                isFound
                  ? "bg-leaf text-white anim-pop"
                  : wrongCell === i
                    ? "bg-coral text-white anim-shake"
                    : "bg-paper text-ink btn-toy"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 9) KELİMEYİ DİZ                                                     */
/* ================================================================== */

function SpellWordAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(6, onComplete);
  const [q, setQ] = useState<{ word: string; chips: string[] } | null>(null);
  const [used, setUsed] = useState<number[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  useEffect(() => {
    const words = group.words.filter((w) => w.length >= 3 && w.length <= 6);
    const word = pick(words.length ? words : group.words);
    let chips = shuffle(word.split(""));
    if (chips.join("") === word) chips = [...chips].reverse();
    setQ({ word, chips });
    setUsed([]);
    setWrongIdx(null);
    sfx.listen();
    say(word, { rate: 0.75 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (i: number) => {
    if (!q || eng.feedback || eng.done || used.includes(i) || wrongIdx !== null) return;
    const expected = q.word[used.length];
    if (q.chips[i] === expected) {
      sfx.pop();
      const nu = [...used, i];
      setUsed(nu);
      if (nu.length === q.word.length) {
        say(q.word, { rate: 0.8 });
        eng.settle(true, `"${q.word}" yazdın!`, "");
      }
    } else {
      sfx.wrong();
      setWrongIdx(i);
      eng.after(() => setWrongIdx((w) => (w === i ? null : w)), 380);
    }
  };

  return (
    <Shell
      icon={<IconHand className="w-5 h-5" />}
      title="Kelimeyi Diz"
      skill="Yazma"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Harflere sırayla dokun, kelimeyi yaz!</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="flex items-center justify-center gap-1.5 mb-7 flex-wrap">
        {(q?.word ?? "").split("").map((ch, i) => {
          const filled = i < used.length;
          return (
            <div
              key={i}
              className={`w-11 h-12 sm:w-13 sm:h-14 rounded-lg border-[3px] border-ink flex items-center justify-center font-display font-bold text-2xl ${
                filled ? "bg-amber anim-pop text-ink" : i === used.length ? "border-dashed bg-mint anim-pulse-soft text-ink/30" : "bg-mint text-ink/20"
              }`}
            >
              {filled ? (q?.chips[used[i]] ?? ch) : "?"}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-2.5 flex-wrap">
        {q?.chips.map((c, i) => {
          const isUsed = used.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              disabled={isUsed}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-[3px] border-ink font-display font-bold text-2xl flex items-center justify-center ${
                isUsed
                  ? "bg-mint text-ink/20"
                  : wrongIdx === i
                    ? "bg-coral text-white anim-shake"
                    : "bg-paper text-ink btn-toy"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 10) HARFİ TAMAMLA                                                   */
/* ================================================================== */

function FillLetterAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; idx: number; answer: LetterDef; opts: LetterDef[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const words = group.words.filter((w) => w.length >= 3);
    const base = words.length ? words : group.words;
    // eksik harf, çocuğun öğrendiği gruptan olsun
    const ids = new Set(group.letters.map((l) => l.id));
    const ok = base.filter((w) => w.split("").some((c) => ids.has(trUpper(c))));
    const word = pick(ok.length ? ok : base);
    const inGroupIdx = word
      .split("")
      .map((c, i) => ({ c, i }))
      .filter((x) => ids.has(trUpper(x.c)));
    const idx = inGroupIdx.length
      ? inGroupIdx[Math.floor(Math.random() * inGroupIdx.length)].i
      : Math.floor(Math.random() * word.length);
    const answer = LETTER_BY_CHAR[trUpper(word[idx])];
    setQ({ word, idx, answer, opts: ensureOpts(group, answer, 3) });
    setChosen(null);
    sfx.listen();
    say(word, { rate: 0.72 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (l: LetterDef) => {
    if (!q || chosen || eng.feedback || eng.done) return;
    setChosen(l.id);
    if (l.id === q.answer.id) {
      say(q.word, { rate: 0.78 });
      eng.settle(true, `"${q.word}" tamamlandı!`, "");
    } else {
      eng.settle(false, "", `Eksik harf ${q.answer.char} idi: "${q.word}".`);
    }
  };

  return (
    <Shell
      icon={<IconBrain className="w-5 h-5" />}
      title="Harfi Tamamla"
      skill="Okuma"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Eksik harfi bul, kelimeyi tamamla!</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="mb-7">
        <BigWord text={q?.word ?? ""} highlight={chosen ? undefined : q?.idx} blank />
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {q?.opts.map((l) => (
          <LetterTile
            key={l.id}
            letter={l}
            size="lg"
            state={
              chosen && l.id === q.answer.id
                ? "correct"
                : chosen === l.id && l.id !== q.answer.id
                  ? "wrong"
                  : "idle"
            }
            onClick={() => tap(l)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 11) CÜMLEDE KELİME                                                  */
/* ================================================================== */

function SentenceWordAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(6, onComplete);
  const [q, setQ] = useState<{ sentence: string; target: string; opts: string[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const sentence = pick(group.sentences);
    const inWords = sentence
      .split(" ")
      .map((w) => w.replace(/[.,!?]/g, "").toLocaleLowerCase("tr-TR"));
    const target = pick(inWords);
    const pool = group.words.filter((w) => w !== target && !inWords.includes(w));
    setQ({ sentence, target, opts: shuffle([target, ...sample(pool, 3)]) });
    setChosen(null);
    sfx.listen();
    say(sentence, { rate: 0.8 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (w: string) => {
    if (!q || chosen || eng.feedback || eng.done) return;
    setChosen(w);
    if (w === q.target) eng.settle(true, `Evet, "${q.target}" cümlede vardı!`, "");
    else eng.settle(false, "", `Cümlede "${q.target}" kelimesi vardı.`);
  };

  return (
    <Shell
      icon={<IconVolume className="w-5 h-5" />}
      title="Cümlede Kelime"
      skill="Dinleme"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Cümleyi dinle, duyduğun kelimeyi seç!</p>
          {q && <ReplayButton text={q.sentence} label="Cümleyi dinle" />}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
        {q?.opts.map((w) => (
          <ChoiceButton
            key={w}
            label={w}
            state={
              chosen
                ? w === q.target
                  ? "correct"
                  : chosen === w
                    ? "wrong"
                    : "dim"
                : "idle"
            }
            onClick={() => tap(w)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* 12) HAFIZA KARTLARI                                                 */
/* ================================================================== */

interface MemCard {
  key: string;
  letter: LetterDef;
}

function MemoryMatchAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(3, onComplete);
  const [cards, setCards] = useState<MemCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const matchedRef = useRef(0);
  const cardsRef = useRef<MemCard[]>([]);
  cardsRef.current = cards;

  useEffect(() => {
    const four = sample(group.letters, 4);
    const deck = shuffle(
      four.flatMap((l, i) => [
        { key: `${i}a`, letter: l },
        { key: `${i}b`, letter: l },
      ]),
    );
    setCards(deck);
    setFlipped([]);
    setMatched([]);
    setBusy(false);
    matchedRef.current = 0;
    eng.arm();
    sfx.listen();
    say("Kartları çevir, eş harfleri bul!", { rate: 0.88 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (i: number) => {
    if (busy || eng.feedback || eng.done) return;
    const deck = cardsRef.current;
    if (!deck[i]) return;
    if (flipped.includes(i) || matched.includes(deck[i].letter.id)) return;
    sfx.flip();
    say(deck[i].letter.say, { rate: 0.92 });
    const nf = [...flipped, i];
    setFlipped(nf);
    if (nf.length < 2) return;
    setBusy(true);
    const [a, b] = nf;
    if (deck[a].letter.id === deck[b].letter.id) {
      const id = deck[a].letter.id;
      eng.after(() => {
        sfx.correct();
        matchedRef.current += 1;
        setMatched((m) => (m.includes(id) ? m : [...m, id]));
        setFlipped([]);
        setBusy(false);
        if (matchedRef.current >= 4) {
          eng.after(() => eng.settle(true, "Bütün eşleri buldun!", ""), 450);
        }
      }, 500);
    } else {
      eng.after(() => {
        sfx.wrong();
        setFlipped([]);
        setBusy(false);
      }, 950);
    }
  };

  const isOpen = (i: number) => flipped.includes(i) || matched.includes(cards[i]?.letter.id ?? "");

  return (
    <Shell
      icon={<IconBrain className="w-5 h-5" />}
      title="Hafıza Kartları"
      skill="Hafıza"
      eng={eng}
      onExit={onExit}
      intro={
        <p className="font-display font-bold text-ink">
          Kartları çevir, <span className="text-grape-deep">eş harfleri</span> bul! Her kart sesini
          söyler.
        </p>
      }
    >
      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto">
        {cards.map((c, i) => {
          const open = isOpen(i);
          const isMatched = matched.includes(c.letter.id);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => tap(i)}
              aria-label={open ? `${c.letter.char} harfi` : "Kapalı kart"}
              className="flip-scene aspect-[3/4]"
            >
              <div className={`flip-card relative w-full h-full ${open ? "flipped" : ""}`}>
                <div className="flip-face absolute inset-0 rounded-lg border-[3px] border-ink bg-sky text-white font-display font-bold text-3xl flex items-center justify-center shadow-[0_4px_0_rgba(43,58,85,0.9)]">
                  ?
                </div>
                <div
                  className={`flip-face flip-back absolute inset-0 rounded-lg border-[3px] border-ink ${c.letter.bg} ${c.letter.fg} font-display font-bold text-3xl flex items-center justify-center shadow-[0_4px_0_rgba(43,58,85,0.9)] ${
                    isMatched ? "ring-4 ring-leaf-deep" : ""
                  }`}
                >
                  {c.letter.char}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-center text-ink-soft font-semibold text-sm mt-4">
        Bulunan eş: {matched.length}/4
      </p>
    </Shell>
  );
}

/* ================================================================== */
/* 13) SES NEREDE?                                                     */
/* ================================================================== */

type Pos = "başta" | "ortada" | "sonda";

function PositionAct({ group, onExit, onComplete }: ActivityProps) {
  const eng = useEngine(8, onComplete);
  const [q, setQ] = useState<{ word: string; letter: LetterDef; pos: Pos } | null>(null);
  const [chosen, setChosen] = useState<Pos | null>(null);

  useEffect(() => {
    let found: { word: string; letter: LetterDef; pos: Pos } | null = null;
    // önce sesin tam bir kez geçtiği kelimeleri dene (başta/ortada/sonda çeşitliliği)
    const candidates: { word: string; letter: LetterDef; pos: Pos }[] = [];
    for (const letter of group.letters) {
      for (const w of group.words) {
        if (w.length < 3 || countChar(w, letter.id) !== 1) continue;
        const idx = w.split("").findIndex((c) => trUpper(c) === letter.id);
        const pos: Pos = idx === 0 ? "başta" : idx === w.length - 1 ? "sonda" : "ortada";
        candidates.push({ word: w, letter, pos });
      }
    }
    if (candidates.length > 0) {
      found = pick(candidates);
    } else {
      const word = pick(group.words);
      const letter = LETTER_BY_CHAR[trUpper(word[0])];
      found = { word, letter, pos: "başta" };
    }
    setQ(found);
    setChosen(null);
    sfx.listen();
    say(found.word, { rate: 0.75 });
    eng.arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.round, eng.runId, group]);

  const tap = (p: Pos) => {
    if (!q || chosen || eng.feedback || eng.done) return;
    setChosen(p);
    if (p === q.pos) eng.settle(true, `"${q.word}": ${q.letter.char} sesi ${q.pos}!`, "");
    else eng.settle(false, "", `"${q.word}" kelimesinde ${q.letter.char} sesi ${q.pos}.`);
  };

  return (
    <Shell
      icon={<IconSpeaker className="w-5 h-5" />}
      title="Ses Nerede?"
      skill="Ses–Harf"
      eng={eng}
      onExit={onExit}
      intro={
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-display font-bold text-ink">Bu ses kelimenin neresinde?</p>
          {q && <ReplayButton text={q.word} />}
        </div>
      }
    >
      <div className="flex items-center justify-center gap-4 mb-7 flex-wrap">
        {q && <LetterTile letter={q.letter} size="lg" state="target" />}
        <BigWord text={q?.word ?? ""} />
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {(["başta", "ortada", "sonda"] as Pos[]).map((p) => (
          <ChoiceButton
            key={p}
            label={p[0].toLocaleUpperCase("tr-TR") + p.slice(1)}
            state={
              chosen ? (p === q?.pos ? "correct" : chosen === p ? "wrong" : "dim") : "idle"
            }
            onClick={() => tap(p)}
          />
        ))}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* KATALOG + MERKEZ                                                    */
/* ================================================================== */

interface ActivityMeta {
  id: string;
  name: string;
  skill: string;
  desc: string;
  rounds: number;
  hue: string;
  icon: ReactNode;
  comp: FC<ActivityProps>;
}

const ACTIVITIES: ActivityMeta[] = [
  { id: "order", name: "Harf Sırası", skill: "Sıralama", desc: "Harfleri öğrenme sırasına göre diz.", rounds: 6, hue: "#ff6b6b", icon: <IconBook className="w-6 h-6" />, comp: OrderRace },
  { id: "word-hunt", name: "Kelime Avı", skill: "Dinleme", desc: "Duyduğun kelimeyi dört seçenek arasında yakala.", rounds: 8, hue: "#4d96ff", icon: <IconEar className="w-6 h-6" />, comp: WordHunt },
  { id: "initial", name: "Baş Harf", skill: "Ses–Harf", desc: "Kelimenin ilk sesi hangi harf?", rounds: 8, hue: "#6bcb77", icon: <IconSpeaker className="w-6 h-6" />, comp: InitialSound },
  { id: "final", name: "Son Harf", skill: "Ses–Harf", desc: "Kelimenin son sesi hangi harf?", rounds: 8, hue: "#2ec4b6", icon: <IconEar className="w-6 h-6" />, comp: FinalSound },
  { id: "real", name: "Kelime mi, Uydurma mı?", skill: "Okuma", desc: "Gerçek kelimeyi uydurmadan ayır.", rounds: 8, hue: "#ffc145", icon: <IconCheck className="w-6 h-6" />, comp: RealOrNot },
  { id: "syllable", name: "Hece Say", skill: "Heceleme", desc: "El çırp, kelimenin hecelerini say.", rounds: 8, hue: "#b983ff", icon: <IconBolt className="w-6 h-6" />, comp: SyllableCountAct },
  { id: "letter-count", name: "Harf Say", skill: "Sayma", desc: "Kelime kaç harften oluşuyor?", rounds: 8, hue: "#ff8f6b", icon: <IconStar className="w-6 h-6" />, comp: LetterCountAct },
  { id: "grid", name: "Harf Izgarası", skill: "Dikkat", desc: "Izgaradaki hedef harflerin hepsini bul.", rounds: 5, hue: "#4d96ff", icon: <IconSparkle className="w-6 h-6" />, comp: GridHunt },
  { id: "spell", name: "Kelimeyi Diz", skill: "Yazma", desc: "Karışık harflerden kelimeyi yaz.", rounds: 6, hue: "#6bcb77", icon: <IconHand className="w-6 h-6" />, comp: SpellWordAct },
  { id: "fill", name: "Harfi Tamamla", skill: "Okuma", desc: "Eksik harfi bul, kelimeyi tamamla.", rounds: 8, hue: "#ff6b6b", icon: <IconBrain className="w-6 h-6" />, comp: FillLetterAct },
  { id: "sentence", name: "Cümlede Kelime", skill: "Dinleme", desc: "Dinlediğin cümledeki kelimeyi seç.", rounds: 6, hue: "#ffc145", icon: <IconVolume className="w-6 h-6" />, comp: SentenceWordAct },
  { id: "memory", name: "Hafıza Kartları", skill: "Hafıza", desc: "Kartları çevir, eş harfleri bul.", rounds: 3, hue: "#b983ff", icon: <IconBrain className="w-6 h-6" />, comp: MemoryMatchAct },
  { id: "position", name: "Ses Nerede?", skill: "Ses–Harf", desc: "Ses kelimenin başında mı, ortasında mı, sonunda mı?", rounds: 8, hue: "#2ec4b6", icon: <IconSpeaker className="w-6 h-6" />, comp: PositionAct },
];

export const ACTIVITY_COUNT = ACTIVITIES.length;

function loadBest(groupId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of ACTIVITIES) {
    let v = 0;
    try {
      v = Number(localStorage.getItem(`etk-yildiz-${groupId}-${a.id}`) ?? 0);
    } catch {
      v = 0;
    }
    out[a.id] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

/** Tek bir etkinlik hata verse bile merkez çökmesin; hatayı görünür kıl. */
class ActivityBoundary extends Component<{ onExit: () => void; children: ReactNode }, { failed: boolean; msg: string }> {
  state = { failed: false, msg: "" };
  static getDerivedStateFromError(err: unknown) {
    return { failed: true, msg: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
  componentDidCatch(error: unknown) {
    console.error("[Etkinlik hatası]", error);
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="sticker rounded-2xl bg-paper px-6 py-10 text-center anim-pop">
          <p className="font-display font-bold text-2xl text-ink mb-2">Oyun küçük bir şaka yaptı!</p>
          <p className="text-ink-soft font-semibold mb-2">
            Bu etkinlik beklenmedik bir hata verdi. Listeye dönüp tekrar deneyebilirsin.
          </p>
          <p className="text-[12px] text-coral-deep font-bold mb-5 break-all">{this.state.msg}</p>
          <button
            type="button"
            onClick={this.props.onExit}
            className="btn-toy sticker-sm rounded-xl bg-sky text-white px-6 py-3 font-display font-bold inline-flex items-center gap-2"
          >
            <IconX className="w-5 h-5" /> Etkinlik Listesine Dön
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ActivityCenter({
  group,
  onPoints,
}: {
  group: GroupDef;
  onPoints: (n: number) => void;
}) {
  const [active, setActive] = useState<ActivityMeta | null>(null);
  const [best, setBest] = useState<Record<string, number>>(() => loadBest(group.id));
  const firstRun = useRef(true);

  /* yalnızca grup DEĞİŞİNCE sıfırla — ilk açılışta dokunma */
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setActive(null);
    setBest(loadBest(group.id));
  }, [group.id]);

  const handleComplete = (meta: ActivityMeta, res: ActivityResult) => {
    const key = `etk-yildiz-${group.id}-${meta.id}`;
    let prev = 0;
    try {
      prev = Number(localStorage.getItem(key) ?? 0);
      if (res.stars > prev) localStorage.setItem(key, String(res.stars));
    } catch {
      /* depolama kapalıysa yıldız oturumluk kalır */
    }
    setBest((b) => ({ ...b, [meta.id]: Math.max(prev, res.stars) }));
    onPoints(res.score);
  };

  if (active) {
    const C = active.comp;
    return (
      <ActivityBoundary key={`${group.id}-${active.id}`} onExit={() => setActive(null)}>
        <C
          group={group}
          onExit={() => setActive(null)}
          onComplete={(r) => handleComplete(active, r)}
        />
      </ActivityBoundary>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ACTIVITIES.map((a) => {
        const stars = best[a.id] ?? 0;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              sfx.tap();
              setActive(a);
            }}
            className="sticker rounded-2xl bg-paper text-left p-4 pt-3 btn-toy transition-transform hover:-translate-y-1 overflow-hidden"
          >
            <span
              className="block h-2 -mx-4 -mt-3 mb-3 rounded-b-sm"
              style={{ background: a.hue }}
            />
            <span className="flex items-center justify-between gap-2">
              <span
                className="w-11 h-11 rounded-xl border-[3px] border-ink flex items-center justify-center text-white"
                style={{ background: a.hue }}
              >
                {a.icon}
              </span>
              <span className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < stars ? "text-amber-deep" : "text-ink/15"}>
                    <IconStar className="w-5 h-5" filled={i < stars} />
                  </span>
                ))}
              </span>
            </span>
            <span className="block font-display font-bold text-lg text-ink mt-2.5 leading-tight">
              {a.name}
            </span>
            <span className="block text-[13px] text-ink-soft font-semibold mt-1">{a.desc}</span>
            <span className="flex items-center gap-2 mt-3">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.14em] uppercase text-white"
                style={{ background: a.hue }}
              >
                {a.skill}
              </span>
              <span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-black tracking-[0.14em] uppercase text-ink-soft border-2 border-ink/10">
                {a.rounds} tur
              </span>
              <span className="ml-auto font-display font-bold text-sm text-sky-deep">Oyna →</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
