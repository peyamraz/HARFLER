import { useCallback, useEffect, useRef, useState } from "react";
import {
  APPLE_POINTS,
  BONUS_POINTS,
  BONUS_TTL,
  DELTA,
  DIFFICULTIES,
  Dir,
  Difficulty,
  GameState,
  GRID,
  START_LEN,
  createState,
  currentTick,
  enqueueDir,
  speedFactor,
  step,
} from "./engine";
import { setMuted as setSoundMuted, sfx } from "./sound";

export type Status = "menu" | "playing" | "paused" | "dying" | "gameover";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const BEST_KEY = "yilan-best-v2";
const MUTE_KEY = "yilan-muted-v2";

function loadBestMap(): Record<Difficulty, number> {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<Record<Difficulty, number>>;
      return { kolay: m.kolay || 0, normal: m.normal || 0, zor: m.zor || 0 };
    }
  } catch {
    /* yok say */
  }
  return { kolay: 0, normal: 0, zor: 0 };
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

function snakeColor(t: number): string {
  // kafa → kuyruk: parlak lime → orta yeşil → koyu yeşil
  return t < 0.5
    ? lerpColor("#e4ff82", "#7fd64b", t * 2)
    : lerpColor("#7fd64b", "#20714a", (t - 0.5) * 2);
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function useSnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState<Status>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => loadBestMap().normal);
  const [apples, setApples] = useState(0);
  const [length, setLength] = useState(START_LEN);
  const [elapsed, setElapsed] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => loadMuted());

  const gameRef = useRef<GameState>(createState());
  const statusRef = useRef<Status>("menu");
  const diffRef = useRef<Difficulty>("normal");
  const mutedRef = useRef<boolean>(loadMuted());
  const accRef = useRef(0);
  const lastFrameRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastSyncRef = useRef(0);
  const scoreRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const flashRef = useRef(0);
  const shakeRef = useRef(0);
  const sizeRef = useRef(0);
  const dprRef = useRef(1);
  const pausedAtRef = useRef(0);
  const deathTimerRef = useRef<number | null>(null);
  const touchRef = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);

  useEffect(() => {
    setSoundMuted(mutedRef.current);
  }, []);

  const setStatusBoth = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  /* ---------------- particles ---------------- */
  const burst = useCallback(
    (cellX: number, cellY: number, colors: string[], count = 14, power = 1) => {
      const size = sizeRef.current;
      if (!size) return;
      const cs = size / GRID;
      const cx = (cellX + 0.5) * cs;
      const cy = (cellY + 0.5) * cs;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (0.05 + Math.random() * 0.16) * power;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 420 + Math.random() * 380,
          maxLife: 800,
          size: cs * (0.05 + Math.random() * 0.09),
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      if (particlesRef.current.length > 220) {
        particlesRef.current.splice(0, particlesRef.current.length - 220);
      }
    },
    [],
  );

  /* ---------------- events ---------------- */
  const finalizeDeath = useCallback(() => {
    const final = scoreRef.current;
    const d = diffRef.current;
    const map = loadBestMap();
    let record = false;
    if (final > (map[d] || 0)) {
      map[d] = final;
      record = true;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(map));
      } catch {
        /* boş ver */
      }
      setBest(final);
    }
    setNewRecord(record);
    if (record) sfx.record();
    setStatusBoth("gameover");
  }, [setStatusBoth]);

  const handleEvents = useCallback(
    (events: ReturnType<typeof step>, now: number) => {
      const mult = DIFFICULTIES[diffRef.current].mult;
      const g = gameRef.current;
      for (const ev of events) {
        if (ev.type === "ate") {
          scoreRef.current += APPLE_POINTS * mult;
          setScore(scoreRef.current);
          setApples(g.apples);
          setLength(g.snake.length);
          sfx.eat();
          burst(g.snake[0].x, g.snake[0].y, ["#ff7a6e", "#ffd166", "#d3f26a"], 12);
        } else if (ev.type === "bonus") {
          scoreRef.current += BONUS_POINTS * mult;
          setScore(scoreRef.current);
          setLength(g.snake.length);
          sfx.bonus();
          shakeRef.current = Math.max(shakeRef.current, 5);
          burst(g.snake[0].x, g.snake[0].y, ["#ffd166", "#ffe08a", "#fff6d8"], 22, 1.4);
        } else if (ev.type === "bonusSpawned") {
          sfx.spawn();
          if (g.bonus) burst(g.bonus.pos.x, g.bonus.pos.y, ["#ffd166", "#ffe08a"], 10, 0.8);
        } else if (ev.type === "died") {
          sfx.die();
          flashRef.current = 1;
          shakeRef.current = 11;
          const head = g.snake[0];
          burst(head.x, head.y, ["#ff5d5d", "#ffd166", "#7fd64b"], 26, 1.6);
          setStatusBoth("dying");
          if (deathTimerRef.current) window.clearTimeout(deathTimerRef.current);
          deathTimerRef.current = window.setTimeout(finalizeDeath, 900);
          void now;
        }
      }
    },
    [burst, finalizeDeath, setStatusBoth],
  );

  /* ---------------- actions ---------------- */
  const start = useCallback(() => {
    if (deathTimerRef.current) window.clearTimeout(deathTimerRef.current);
    gameRef.current = createState();
    accRef.current = 0;
    elapsedRef.current = 0;
    lastSyncRef.current = 0;
    scoreRef.current = 0;
    particlesRef.current = [];
    flashRef.current = 0;
    shakeRef.current = 0;
    setScore(0);
    setApples(0);
    setLength(START_LEN);
    setElapsed(0);
    setNewRecord(false);
    setStatusBoth("playing");
    sfx.start();
  }, [setStatusBoth]);

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return;
    pausedAtRef.current = performance.now();
    setStatusBoth("paused");
    sfx.pause();
  }, [setStatusBoth]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    const delta = performance.now() - pausedAtRef.current;
    const b = gameRef.current.bonus;
    if (b) {
      b.expiresAt += delta;
      b.spawnedAt += delta;
    }
    setStatusBoth("playing");
    sfx.resume();
  }, [setStatusBoth]);

  const togglePause = useCallback(() => {
    const st = statusRef.current;
    if (st === "playing") pause();
    else if (st === "paused") resume();
    else if (st === "menu" || st === "gameover" || st === "dying") start();
  }, [pause, resume, start]);

  const toMenu = useCallback(() => {
    if (deathTimerRef.current) window.clearTimeout(deathTimerRef.current);
    gameRef.current = createState();
    particlesRef.current = [];
    flashRef.current = 0;
    shakeRef.current = 0;
    setStatusBoth("menu");
    sfx.click();
  }, [setStatusBoth]);

  const setDirection = useCallback((d: Dir) => {
    if (statusRef.current !== "playing") return;
    enqueueDir(gameRef.current, d);
  }, []);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      diffRef.current = d;
      setDifficulty(d);
      setBest(loadBestMap()[d] || 0);
      const st = statusRef.current;
      if (st === "playing" || st === "paused" || st === "dying") {
        start();
      } else {
        sfx.click();
      }
    },
    [start],
  );

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setSoundMuted(next);
    setMutedState(next);
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* boş ver */
    }
    if (!next) sfx.click();
  }, []);

  /* ---------------- drawing ---------------- */
  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    if (!size) return;

    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = gameRef.current;
    const st = statusRef.current;
    const cs = size / GRID;

    // zemin
    ctx.fillStyle = "#0b1d15";
    ctx.fillRect(0, 0, size, size);

    // ekran sarsıntısı
    if (shakeRef.current > 0.3) {
      const s = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      shakeRef.current *= 0.88;
    }

    // dama deseni
    ctx.fillStyle = "rgba(233,245,236,0.022)";
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if ((x + y) % 2 === 0) continue;
        ctx.fillRect(x * cs, y * cs, cs, cs);
      }
    }

    // duvar çerçevesi
    ctx.strokeStyle = "rgba(127,214,75,0.16)";
    ctx.lineWidth = Math.max(2, cs * 0.08);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);

    // ---- elma ----
    {
      const pulse = 1 + 0.08 * Math.sin(now / 160);
      const fx = (g.food.x + 0.5) * cs;
      const fy = (g.food.y + 0.5) * cs;
      const r = cs * 0.3 * pulse;
      ctx.save();
      ctx.shadowColor = "rgba(255,93,93,0.55)";
      ctx.shadowBlur = cs * 0.5;
      const grad = ctx.createRadialGradient(fx - r * 0.35, fy - r * 0.4, r * 0.15, fx, fy, r);
      grad.addColorStop(0, "#ff9d8a");
      grad.addColorStop(0.55, "#ff5d5d");
      grad.addColorStop(1, "#c81f35");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // sap + yaprak
      ctx.strokeStyle = "#7a4a21";
      ctx.lineWidth = Math.max(1.5, cs * 0.06);
      ctx.beginPath();
      ctx.moveTo(fx, fy - r * 0.95);
      ctx.lineTo(fx + r * 0.12, fy - r * 1.3);
      ctx.stroke();
      ctx.fillStyle = "#7fd64b";
      ctx.save();
      ctx.translate(fx + r * 0.42, fy - r * 1.18);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // parlama
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(fx - r * 0.35, fy - r * 0.38, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- bonus meyve ----
    if (g.bonus) {
      const b = g.bonus;
      const remain = clamp01((b.expiresAt - now) / BONUS_TTL);
      const bx = (b.pos.x + 0.5) * cs;
      const by = (b.pos.y + 0.5) * cs;
      const blink = remain < 0.28 ? 0.45 + 0.55 * Math.abs(Math.sin(now / 90)) : 1;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.shadowColor = "rgba(255,209,102,0.8)";
      ctx.shadowBlur = cs * 0.7;
      const r = cs * 0.32 * (1 + 0.1 * Math.sin(now / 120));
      const grad = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.35, r * 0.1, bx, by, r);
      grad.addColorStop(0, "#fff3c4");
      grad.addColorStop(0.5, "#ffd166");
      grad.addColorStop(1, "#e08e0b");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // yıldız işareti
      ctx.fillStyle = "rgba(122,68,0,0.85)";
      ctx.font = `700 ${Math.round(cs * 0.42)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("50", bx, by + cs * 0.03);
      // kalan süre halkası
      ctx.strokeStyle = "rgba(255,209,102,0.9)";
      ctx.lineWidth = Math.max(2, cs * 0.07);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(bx, by, cs * 0.47, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain);
      ctx.stroke();
      ctx.restore();
    }

    // ---- yılan (kuyruktan kafaya, ara konum enterpolasyonu ile) ----
    const tickNow = currentTick(diffRef.current, g.apples);
    const tt =
      st === "playing" || st === "paused" ? clamp01(accRef.current / tickNow) : 1;
    const n = g.snake.length;
    const pn = g.prevSnake.length;
    const head = g.snake[0];
    const prevHead = g.prevSnake[0] ?? head;
    const hx = (prevHead.x + (head.x - prevHead.x) * tt + 0.5) * cs;
    const hy = (prevHead.y + (head.y - prevHead.y) * tt + 0.5) * cs;

    for (let i = n - 1; i >= 1; i--) {
      const curr = g.snake[i];
      const prev = g.prevSnake[Math.min(i, pn - 1)] ?? curr;
      const x = (prev.x + (curr.x - prev.x) * tt + 0.5) * cs;
      const y = (prev.y + (curr.y - prev.y) * tt + 0.5) * cs;
      const f = n === 1 ? 0 : i / (n - 1);
      const w = cs * (0.86 - 0.3 * f);
      ctx.fillStyle = snakeColor(f);
      rr(ctx, x - w / 2, y - w / 2, w, w, w * 0.38);
      ctx.fill();
    }

    // kafa
    {
      const f = 0;
      const w = cs * 0.92;
      ctx.save();
      ctx.shadowColor = "rgba(211,242,106,0.6)";
      ctx.shadowBlur = cs * 0.55;
      ctx.fillStyle = snakeColor(f);
      rr(ctx, hx - w / 2, hy - w / 2, w, w, w * 0.4);
      ctx.fill();
      ctx.restore();

      const d = DELTA[g.dir];
      const px = -d.y;
      const py = d.x;
      const dead = st === "dying" || st === "gameover";
      const eo = cs * 0.17; // göz dış kaydırma (yön boyunca)
      const es = cs * 0.16; // göz yan kaydırma
      for (const side of [1, -1]) {
        const ex = hx + d.x * eo + px * es * side;
        const ey = hy + d.y * eo + py * es * side;
        if (dead) {
          ctx.strokeStyle = "#12240f";
          ctx.lineWidth = Math.max(1.5, cs * 0.05);
          ctx.lineCap = "round";
          const xr = cs * 0.07;
          ctx.beginPath();
          ctx.moveTo(ex - xr, ey - xr);
          ctx.lineTo(ex + xr, ey + xr);
          ctx.moveTo(ex + xr, ey - xr);
          ctx.lineTo(ex - xr, ey + xr);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#f4ffe8";
          ctx.beginPath();
          ctx.arc(ex, ey, cs * 0.115, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#12240f";
          ctx.beginPath();
          ctx.arc(ex + d.x * cs * 0.045, ey + d.y * cs * 0.045, cs * 0.058, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ---- partiküller ----
    if (particlesRef.current.length > 0) {
      const keep: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= 16.7;
        if (p.life <= 0) continue;
        p.x += p.vx * 16.7;
        p.y += p.vy * 16.7;
        p.vx *= 0.96;
        p.vy *= 0.96;
        ctx.globalAlpha = clamp01(p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        keep.push(p);
      }
      ctx.globalAlpha = 1;
      particlesRef.current = keep;
    }

    // vinyet
    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.72);
    vg.addColorStop(0, "rgba(4,12,8,0)");
    vg.addColorStop(1, "rgba(4,12,8,0.5)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, size, size);

    // ölüm flaşı
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(255,70,70,${(flashRef.current * 0.4).toFixed(3)})`;
      ctx.fillRect(0, 0, size, size);
      flashRef.current = Math.max(0, flashRef.current - 0.03);
    }
  }, []);

  /* ---------------- main loop ---------------- */
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const dt = lastFrameRef.current ? Math.min(now - lastFrameRef.current, 100) : 16.7;
      lastFrameRef.current = now;

      if (statusRef.current === "playing") {
        elapsedRef.current += dt;
        if (now - lastSyncRef.current > 300) {
          lastSyncRef.current = now;
          setElapsed(Math.floor(elapsedRef.current / 1000));
        }
        accRef.current += dt;
        let guard = 0;
        while (guard < 4) {
          const tick = currentTick(diffRef.current, gameRef.current.apples);
          if (accRef.current < tick) break;
          accRef.current -= tick;
          guard++;
          const events = step(gameRef.current, now);
          handleEvents(events, now);
          if (!gameRef.current.alive) {
            accRef.current = 0;
            break;
          }
        }
      }

      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [draw, handleEvents]);

  /* ---------------- resize ---------------- */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const size = Math.floor(Math.min(rect.width, rect.height));
      if (size < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      sizeRef.current = size;
      dprRef.current = dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const dirMap: Record<string, Dir> = {
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "down",
      KeyS: "down",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.code;
      if (dirMap[k]) {
        e.preventDefault();
        if (statusRef.current === "menu") start();
        setDirection(dirMap[k]);
        return;
      }
      if (k === "Space" || k === "Enter") {
        e.preventDefault();
        if (!e.repeat) togglePause();
        return;
      }
      if (k === "KeyR") {
        e.preventDefault();
        if (!e.repeat && statusRef.current !== "menu") start();
        return;
      }
      if (k === "Escape") {
        if (e.repeat) return;
        if (statusRef.current === "playing") pause();
        else if (statusRef.current === "paused") resume();
        return;
      }
      if (k === "KeyM") {
        if (!e.repeat) toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, setDirection, togglePause, pause, resume, toggleMute]);

  /* ---------------- görünmez olunca duraklat ---------------- */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && statusRef.current === "playing") pause();
    };
    const onBlur = () => {
      if (statusRef.current === "playing") pause();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [pause]);

  useEffect(
    () => () => {
      if (deathTimerRef.current) window.clearTimeout(deathTimerRef.current);
    },
    [],
  );

  /* ---------------- touch / swipe ---------------- */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY, t: performance.now(), moved: false };
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const s = touchRef.current;
      const t = e.touches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      s.moved = true;
      if (statusRef.current === "playing") {
        if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? "right" : "left");
        else setDirection(dy > 0 ? "down" : "up");
      }
      s.x = t.clientX;
      s.y = t.clientY;
    },
    [setDirection],
  );

  const onTouchEnd = useCallback(() => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s) return;
    const dur = performance.now() - s.t;
    if (!s.moved && dur < 260) {
      const st = statusRef.current;
      if (st === "menu" || st === "gameover") start();
      else if (st === "paused") resume();
    }
  }, [start, resume]);

  return {
    canvasRef,
    wrapRef,
    status,
    difficulty,
    score,
    best,
    apples,
    length,
    elapsed,
    newRecord,
    muted,
    speed: speedFactor(difficulty, apples),
    actions: {
      start,
      pause,
      resume,
      togglePause,
      toMenu,
      setDirection,
      changeDifficulty,
      toggleMute,
    },
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
