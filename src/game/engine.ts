export type Point = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";
export type Difficulty = "kolay" | "normal" | "zor";

export const GRID = 21;
export const START_LEN = 3;
export const APPLE_POINTS = 10;
export const BONUS_POINTS = 50;
export const BONUS_EVERY = 5; // her N elmada bir bonus çıkar
export const BONUS_TTL = 6500; // ms

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; tick: number; mult: number; blurb: string }
> = {
  kolay: { label: "Kolay", tick: 150, mult: 1, blurb: "Isınma turu · ×1 puan" },
  normal: { label: "Normal", tick: 105, mult: 2, blurb: "Klasik tempo · ×2 puan" },
  zor: { label: "Zor", tick: 70, mult: 3, blurb: "Refleks testi · ×3 puan" },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export interface Bonus {
  pos: Point;
  spawnedAt: number;
  expiresAt: number;
}

export interface GameState {
  snake: Point[];
  prevSnake: Point[];
  dir: Dir;
  queue: Dir[];
  food: Point;
  bonus: Bonus | null;
  apples: number;
  score: number;
  alive: boolean;
}

export type StepEvent =
  | { type: "ate" }
  | { type: "bonus" }
  | { type: "bonusSpawned" }
  | { type: "died" };

export function createState(): GameState {
  const cy = Math.floor(GRID / 2);
  const snake: Point[] = [
    { x: 10, y: cy },
    { x: 9, y: cy },
    { x: 8, y: cy },
  ];
  const s: GameState = {
    snake,
    prevSnake: snake.map((p) => ({ ...p })),
    dir: "right",
    queue: [],
    food: { x: 15, y: cy },
    bonus: null,
    apples: 0,
    score: 0,
    alive: true,
  };
  s.food = randomFreeCell(s, []);
  return s;
}

export function randomFreeCell(s: GameState, extra: Point[]): Point {
  const taken = new Set<string>();
  for (const p of s.snake) taken.add(p.x + "," + p.y);
  for (const p of extra) taken.add(p.x + "," + p.y);
  const free: Point[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!taken.has(x + "," + y)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
}

/** Yön girişini kuyruğa ekler; ters yöne dönüşü ve kuyruk taşmasını engeller. */
export function enqueueDir(s: GameState, d: Dir): boolean {
  const last = s.queue.length > 0 ? s.queue[s.queue.length - 1] : s.dir;
  if (d === last || d === OPPOSITE[last]) return false;
  if (s.queue.length >= 3) return false;
  s.queue.push(d);
  return true;
}

export function step(s: GameState, now: number): StepEvent[] {
  if (!s.alive) return [];
  const events: StepEvent[] = [];

  if (s.queue.length > 0) s.dir = s.queue.shift() as Dir;

  s.prevSnake = s.snake.map((p) => ({ ...p }));
  const d = DELTA[s.dir];
  const head = { x: s.snake[0].x + d.x, y: s.snake[0].y + d.y };

  // duvar çarpması
  if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
    s.alive = false;
    events.push({ type: "died" });
    return events;
  }

  const willEat = head.x === s.food.x && head.y === s.food.y;
  const willBonus =
    s.bonus !== null && head.x === s.bonus.pos.x && head.y === s.bonus.pos.y;

  // kuyruk hücreden çıkacağı için (büyüme yoksa) çarpışma sayılmaz
  const body = willEat || willBonus ? s.snake : s.snake.slice(0, -1);
  if (body.some((p) => p.x === head.x && p.y === head.y)) {
    s.alive = false;
    events.push({ type: "died" });
    return events;
  }

  s.snake = [head, ...body];

  if (willEat) {
    s.apples += 1;
    s.score += APPLE_POINTS;
    events.push({ type: "ate" });
    s.food = randomFreeCell(s, s.bonus ? [s.bonus.pos] : []);
    if (s.apples % BONUS_EVERY === 0 && !s.bonus) {
      s.bonus = {
        pos: randomFreeCell(s, [s.food]),
        spawnedAt: now,
        expiresAt: now + BONUS_TTL,
      };
      events.push({ type: "bonusSpawned" });
    }
  }

  if (willBonus && s.bonus) {
    s.score += BONUS_POINTS;
    events.push({ type: "bonus" });
    s.bonus = null;
  }

  if (s.bonus && now >= s.bonus.expiresAt) s.bonus = null;

  return events;
}

/** Elma yendikçe hafifçe hızlanan güncel adım süresi (ms). */
export function currentTick(difficulty: Difficulty, apples: number): number {
  const base = DIFFICULTIES[difficulty].tick;
  return Math.round(base * Math.max(0.62, 1 - apples * 0.011));
}

export function speedFactor(difficulty: Difficulty, apples: number): number {
  return DIFFICULTIES[difficulty].tick / currentTick(difficulty, apples);
}
