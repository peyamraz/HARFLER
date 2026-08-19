import { useMemo } from "react";
import { DIFFICULTIES, Difficulty } from "./game/engine";
import { Status, useSnakeGame } from "./game/useSnakeGame";
import { DPad } from "./components/DPad";
import {
  IconApple,
  IconBolt,
  IconClock,
  IconHome,
  IconPause,
  IconPlay,
  IconRestart,
  IconRuler,
  IconSnakeLogo,
  IconStar,
  IconTrophy,
  IconVolume,
  IconVolumeOff,
} from "./components/icons";

/* ------------------------------------------------------------------ */

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function Fireflies() {
  const flies = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 61) % 100}%`,
        top: `${(i * 37 + 11) % 100}%`,
        size: 2.5 + ((i * 7) % 4),
        color: ["#a8e85a", "#ffd166", "#5ad1a0", "#d3f26a"][i % 4],
        dur: 7 + ((i * 13) % 8),
        delay: (i * 17) % 9,
        dx: ((i % 2 === 0 ? 1 : -1) * (20 + ((i * 29) % 50))).toFixed(0),
        dy: (-(25 + ((i * 23) % 60))).toFixed(0),
        max: (0.35 + ((i * 11) % 5) / 10).toFixed(2),
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {flies.map((f) => (
        <span
          key={f.id}
          className="firefly"
          style={
            {
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              "--ff-color": f.color,
              "--ff-dur": `${f.dur}s`,
              "--ff-delay": `${f.delay}s`,
              "--ff-x": `${f.dx}px`,
              "--ff-y": `${f.dy}px`,
              "--ff-max": f.max,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function CornerBrackets() {
  const c = "absolute w-5 h-5 border-venom-400/80 pointer-events-none";
  return (
    <>
      <span className={`${c} -top-px -left-px border-t-2 border-l-2`} />
      <span className={`${c} -top-px -right-px border-t-2 border-r-2`} />
      <span className={`${c} -bottom-px -left-px border-b-2 border-l-2`} />
      <span className={`${c} -bottom-px -right-px border-b-2 border-r-2`} />
    </>
  );
}

function StatusLed({ status }: { status: Status }) {
  const map: Record<Status, { color: string; label: string; pulse: boolean }> = {
    menu: { color: "#9db8a4", label: "HAZIR", pulse: false },
    playing: { color: "#7fd64b", label: "OYNUYOR", pulse: true },
    paused: { color: "#ffd166", label: "MOLA", pulse: false },
    dying: { color: "#ff5d5d", label: "ÇARPIŞTI", pulse: true },
    gameover: { color: "#ff5d5d", label: "BİTTİ", pulse: false },
  };
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${m.pulse ? "anim-glow" : ""}`}
        style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }}
      />
      <span className="tracking-[0.22em] text-[10px] font-semibold" style={{ color: m.color }}>
        {m.label}
      </span>
    </span>
  );
}

const btnPrimary =
  "btn-arcade inline-flex items-center justify-center gap-2.5 rounded-md bg-venom-400 text-pit-950 " +
  "px-6 py-3.5 text-[11px] border-b-4 border-[#4e8f2c] shadow-[0_0_24px_rgba(168,232,90,0.35)] anim-ring";
const btnGhost =
  "btn-arcade inline-flex items-center justify-center gap-2.5 rounded-md bg-pit-800 text-fog " +
  "px-5 py-3.5 text-[10px] border border-pit-line border-b-4 border-b-pit-950 hover:text-venom-300";
const btnIcon =
  "btn-arcade inline-flex items-center justify-center rounded-md bg-pit-800 text-moss " +
  "w-11 h-11 border border-pit-line border-b-4 border-b-pit-950 hover:text-venom-300";

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-arcade text-[10px] text-venom-300 tracking-[0.25em] mb-3.5 flex items-center gap-2.5">
      <svg viewBox="0 0 8 8" className="w-2 h-2" aria-hidden>
        <rect x="1" y="1" width="6" height="6" fill="currentColor" transform="rotate(45 4 4)" />
      </svg>
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------ */

export default function App() {
  const g = useSnakeGame();
  const { status, difficulty, score, best, apples, length, elapsed, newRecord, muted, speed } = g;
  const diff = DIFFICULTIES[difficulty];
  const inGame = status === "playing" || status === "paused" || status === "dying";

  const statusText: Record<Status, string> = {
    menu: "Başlamak için Boşluk veya BAŞLA",
    playing: "Elmaları topla, duvarlardan uzak dur",
    paused: "Devam etmek için Boşluk",
    dying: "Eyvah!",
    gameover: "Bir tur daha?",
  };

  return (
    <div className="min-h-screen bg-stage relative overflow-x-hidden">
      <div className="fixed inset-0 bg-blueprint pointer-events-none" aria-hidden />
      <Fireflies />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-10">
        {/* ---------------- başlık ---------------- */}
        <header className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-pit-800 border border-pit-line flex items-center justify-center shadow-[0_0_30px_rgba(127,214,75,0.15)]">
              <IconSnakeLogo className="w-8 h-8" />
            </div>
            <div>
              <h1 className="arcade-title text-venom-300 text-xl sm:text-2xl leading-none">YILAN</h1>
              <p className="text-moss text-[11px] font-medium tracking-[0.3em] uppercase mt-1.5">
                Retro Arcade
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-pit-line bg-pit-900/70 px-3.5 py-2.5">
              <IconTrophy className="w-4 h-4 text-coin-400" />
              <div className="leading-none">
                <p className="text-[9px] text-moss tracking-[0.2em] font-semibold mb-1">
                  REKOR · {diff.label.toUpperCase()}
                </p>
                <p key={best} className="font-arcade text-xs text-coin-300 anim-pop">
                  {best}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={g.actions.toggleMute}
              className={btnIcon}
              aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              title={muted ? "Sesi aç (M)" : "Sesi kapat (M)"}
            >
              {muted ? <IconVolumeOff className="w-5 h-5" /> : <IconVolume className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* ---------------- oyun alanı ---------------- */}
          <section className="no-callout">
            {/* skor şeridi */}
            <div className="flex items-end justify-between gap-3 mb-3">
              <div className="leading-none">
                <p className="text-[10px] text-moss tracking-[0.25em] font-semibold mb-1.5">SKOR</p>
                <p key={score} className="font-arcade text-3xl sm:text-4xl text-venom-300 anim-pop">
                  {score}
                </p>
              </div>
              <div className="flex gap-2">
                {[
                  { l: "UZUNLUK", v: String(length), pop: true },
                  { l: "SÜRE", v: fmtTime(elapsed), pop: false },
                  { l: "HIZ", v: `${speed.toFixed(2)}×`, pop: true },
                ].map((c) => (
                  <div
                    key={c.l}
                    className="rounded-md border border-pit-line bg-pit-900/70 px-3 py-2 text-right min-w-[74px]"
                  >
                    <p className="text-[9px] text-moss tracking-[0.18em] font-semibold mb-1">{c.l}</p>
                    <p
                      key={c.pop ? c.v : c.l}
                      className={`font-arcade text-[11px] text-fog ${c.pop ? "anim-pop" : ""}`}
                    >
                      {c.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* durum şeridi */}
            <div className="flex items-center justify-between mb-2 px-0.5">
              <p className="text-[11px] text-moss font-medium">
                <span className="text-venom-400 font-semibold">{diff.label}</span> mod · puan ×
                {diff.mult}
              </p>
              <StatusLed status={status} />
            </div>

            {/* tahta */}
            <div className="relative rounded-lg border border-pit-line bg-pit-900/80 p-2 sm:p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.45),0_0_50px_rgba(46,139,87,0.12)]">
              <CornerBrackets />
              <div
                ref={g.wrapRef}
                className="relative w-full aspect-square rounded overflow-hidden"
                {...g.touchHandlers}
              >
                <canvas ref={g.canvasRef} className="game-canvas rounded" />
                <div className="absolute inset-0 scanlines" aria-hidden />

                {/* -------- menü -------- */}
                {status === "menu" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,15,10,0.82)]">
                    <div className="anim-rise text-center px-6 max-w-sm">
                      <IconSnakeLogo className="w-12 h-12 mx-auto mb-4" />
                      <h2 className="arcade-title text-venom-300 text-2xl mb-2">YILAN</h2>
                      <p className="text-moss text-sm mb-5">
                        Elmaları topla, büyüdükçe hızlanırsın. Her{" "}
                        <span className="text-coin-300 font-semibold">5 elmada</span> altın bonus
                        belirir — süre dolmadan kap!
                      </p>
                      <p className="text-[11px] text-moss mb-5">
                        Seçili mod:{" "}
                        <span className="text-venom-300 font-semibold">
                          {diff.label} (×{diff.mult} puan)
                        </span>
                      </p>
                      <button type="button" className={btnPrimary} onClick={g.actions.start}>
                        <IconPlay className="w-4 h-4" /> BAŞLA
                      </button>
                      <p className="text-[11px] text-moss mt-4">
                        <span className="kbd">Boşluk</span> başlat · yön vermek için{" "}
                        <span className="kbd">↑ ↓ ← →</span> veya kaydır
                      </p>
                    </div>
                  </div>
                )}

                {/* -------- mola -------- */}
                {status === "paused" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,15,10,0.78)]">
                    <div className="anim-rise text-center px-6">
                      <h2 className="arcade-title text-coin-300 text-xl mb-2">MOLA</h2>
                      <p className="text-moss text-sm mb-6">Skorun güvende: {score}</p>
                      <div className="flex flex-col gap-2.5 w-56 mx-auto">
                        <button type="button" className={btnPrimary} onClick={g.actions.resume}>
                          <IconPlay className="w-4 h-4" /> DEVAM ET
                        </button>
                        <button type="button" className={btnGhost} onClick={g.actions.start}>
                          <IconRestart className="w-4 h-4" /> YENİDEN BAŞLAT
                        </button>
                        <button type="button" className={btnGhost} onClick={g.actions.toMenu}>
                          <IconHome className="w-4 h-4" /> ANA MENÜ
                        </button>
                      </div>
                      <p className="text-[11px] text-moss mt-5">
                        <span className="kbd">Esc</span> veya <span className="kbd">Boşluk</span>{" "}
                        devam
                      </p>
                    </div>
                  </div>
                )}

                {/* -------- oyun sonu -------- */}
                {status === "gameover" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(10,8,8,0.82)]">
                    <div className="anim-rise text-center px-6">
                      <h2 className="arcade-title text-berry-400 text-xl sm:text-2xl mb-4">
                        OYUN BİTTİ
                      </h2>
                      {newRecord && (
                        <p className="inline-flex items-center gap-2 rounded-full bg-coin-400/15 border border-coin-400/50 text-coin-300 px-4 py-1.5 text-xs font-bold tracking-widest mb-4 anim-pop">
                          <IconTrophy className="w-4 h-4" /> YENİ REKOR!
                        </p>
                      )}
                      <p className="text-[10px] text-moss tracking-[0.25em] font-semibold mb-1.5">
                        SKORUN
                      </p>
                      <p className="font-arcade text-4xl text-venom-300 mb-1">{score}</p>
                      <p className="text-moss text-sm mb-6">
                        Rekor: <span className="text-coin-300 font-semibold">{best}</span> ·{" "}
                        {apples} elma · {fmtTime(elapsed)}
                      </p>
                      <div className="flex flex-col gap-2.5 w-56 mx-auto">
                        <button type="button" className={btnPrimary} onClick={g.actions.start}>
                          <IconRestart className="w-4 h-4" /> TEKRAR OYNA
                        </button>
                        <button type="button" className={btnGhost} onClick={g.actions.toMenu}>
                          <IconHome className="w-4 h-4" /> ANA MENÜ
                        </button>
                      </div>
                      <p className="text-[11px] text-moss mt-5">
                        <span className="kbd">Boşluk</span> hemen tekrar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* kontrol çubuğu */}
            <div className="flex items-center justify-between gap-3 mt-3.5">
              <div className="flex gap-2">
                {status === "playing" ? (
                  <button type="button" className={btnIcon} onClick={g.actions.pause} aria-label="Duraklat" title="Duraklat (Boşluk)">
                    <IconPause className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={btnIcon}
                    onClick={g.actions.resume}
                    disabled={status !== "paused"}
                    aria-label="Devam et"
                    title="Devam et (Boşluk)"
                    style={status !== "paused" ? { opacity: 0.4 } : undefined}
                  >
                    <IconPlay className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  className={btnIcon}
                  onClick={g.actions.start}
                  disabled={!inGame && status !== "gameover"}
                  aria-label="Yeniden başlat"
                  title="Yeniden başlat (R)"
                  style={!inGame && status !== "gameover" ? { opacity: 0.4 } : undefined}
                >
                  <IconRestart className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-moss hidden md:block">{statusText[status]}</p>
              <p className="hidden md:flex items-center gap-1.5 text-[11px] text-moss">
                <span className="kbd">↑↓←→</span>
                <span className="kbd">WASD</span> yön · <span className="kbd">Boşluk</span> mola ·{" "}
                <span className="kbd">R</span> yeniden
              </p>
            </div>

            {/* dokunmatik yön pedi */}
            <div className="mt-5 lg:hidden">
              <DPad onDir={g.actions.setDirection} disabled={status !== "playing"} />
              <p className="text-center text-[11px] text-moss mt-2.5">
                Tahtada parmağınla kaydırarak da yönlendirebilirsin
              </p>
            </div>
          </section>

          {/* ---------------- kenar paneli ---------------- */}
          <aside className="flex flex-col gap-4">
            {/* zorluk */}
            <div className="rounded-lg border border-pit-line bg-pit-900/70 p-4">
              <PanelTitle>ZORLUK</PanelTitle>
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                const info = DIFFICULTIES[d];
                const active = d === difficulty;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => g.actions.changeDifficulty(d)}
                    className={`w-full flex items-center justify-between rounded-md border px-3.5 py-3 mb-2 last:mb-0 text-left transition-colors duration-150 ${
                      active
                        ? "border-venom-400 bg-venom-400/10"
                        : "border-pit-line bg-pit-800/50 hover:border-venom-700"
                    }`}
                  >
                    <span>
                      <span
                        className={`block font-semibold text-sm ${active ? "text-venom-300" : "text-fog"}`}
                      >
                        {info.label}
                      </span>
                      <span className="block text-[11px] text-moss mt-0.5">{info.blurb}</span>
                    </span>
                    <span
                      className={`font-arcade text-[10px] px-2 py-1.5 rounded ${
                        active ? "bg-venom-400 text-pit-950" : "bg-pit-950 text-coin-300"
                      }`}
                    >
                      ×{info.mult}
                    </span>
                  </button>
                );
              })}
              <p className="text-[11px] text-moss mt-3 leading-relaxed">
                Oyun sırasında değiştirirsen tur yeni zorlukla baştan başlar.
              </p>
            </div>

            {/* durum */}
            <div className="rounded-lg border border-pit-line bg-pit-900/70 p-4">
              <PanelTitle>DURUM</PanelTitle>
              <ul className="space-y-2.5">
                {[
                  { icon: <IconApple className="w-4 h-4 text-berry-400" />, l: "Yenen elma", v: String(apples) },
                  { icon: <IconRuler className="w-4 h-4 text-venom-400" />, l: "Uzunluk", v: `${length} halka` },
                  { icon: <IconBolt className="w-4 h-4 text-coin-400" />, l: "Anlık hız", v: `${speed.toFixed(2)}×` },
                  { icon: <IconStar className="w-4 h-4 text-coin-300" />, l: "Puan çarpanı", v: `×${diff.mult}` },
                  { icon: <IconClock className="w-4 h-4 text-moss" />, l: "Süre", v: fmtTime(elapsed) },
                ].map((row) => (
                  <li key={row.l} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-sm text-moss">
                      {row.icon}
                      {row.l}
                    </span>
                    <span className="font-arcade text-[11px] text-fog">{row.v}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* kontroller */}
            <div className="rounded-lg border border-pit-line bg-pit-900/70 p-4 hidden md:block">
              <PanelTitle>KONTROLLER</PanelTitle>
              <ul className="space-y-2.5 text-sm text-moss">
                <li className="flex items-center justify-between gap-3">
                  <span>Yön ver</span>
                  <span className="flex gap-1">
                    <span className="kbd">↑↓←→</span>
                    <span className="kbd">WASD</span>
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Başlat / mola</span>
                  <span className="kbd">Boşluk</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Yeniden başlat</span>
                  <span className="kbd">R</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Ses aç / kapat</span>
                  <span className="kbd">M</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Mobil</span>
                  <span className="text-[12px] text-fog font-medium">kaydır + yön pedi</span>
                </li>
              </ul>
            </div>
          </aside>
        </main>

        <footer className="mt-10 pt-5 border-t border-pit-line/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-moss">
          <p>
            <span className="text-venom-400 font-semibold">YILAN</span> · kanvas üzerinde 60 fps ·
            skor bu cihazda saklanır
          </p>
          <p>
            İpucu: <span className="text-coin-300">50 puanlık</span> altın bonusun halkası
            tükenmeden yetiş
          </p>
        </footer>
      </div>
    </div>
  );
}
