export interface Burst {
  id: number;
  x: number; // viewport px
  y: number;
  pieces: Piece[];
}

interface Piece {
  dx: number;
  dy: number;
  rot: number;
  color: string;
  dur: number;
  size: number;
  shape: "sq" | "dot" | "tri";
}

const COLORS = ["#ff6b6b", "#ffc145", "#6bcb77", "#4d96ff", "#b983ff", "#2ec4b6", "#ffe066"];

export function makeBurst(x: number, y: number, count = 18): Burst {
  const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 60 + Math.random() * 110;
    return {
      dx: Math.cos(ang) * dist,
      dy: Math.sin(ang) * dist - 40,
      rot: (Math.random() - 0.5) * 720,
      color: COLORS[i % COLORS.length],
      dur: 0.7 + Math.random() * 0.5,
      size: 7 + Math.random() * 7,
      shape: (["sq", "dot", "tri"] as const)[i % 3],
    };
  });
  return { id: Date.now() + Math.random(), x, y, pieces };
}

export function ConfettiLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[70]" aria-hidden>
      {bursts.map((b) => (
        <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
          {b.pieces.map((p, i) => (
            <span
              key={i}
              className="confetti-piece absolute"
              style={
                {
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  borderRadius: p.shape === "dot" ? "9999px" : p.shape === "tri" ? "2px" : "3px",
                  clipPath: p.shape === "tri" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
                  "--cx": `${p.dx}px`,
                  "--cy": `${p.dy + 130}px`,
                  "--cr": `${p.rot}deg`,
                  "--cdur": `${p.dur}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
