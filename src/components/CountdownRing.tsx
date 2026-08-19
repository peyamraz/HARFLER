interface CountdownRingProps {
  remaining: number; // saniye (ondalık)
  total?: number;
}

export function CountdownRing({ remaining, total = 5 }: CountdownRingProps) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const urgent = remaining <= 1.5;

  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36" role="timer" aria-label={`${Math.ceil(remaining)} saniye kaldı`}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#d3ecdf" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={urgent ? "#ff6b6b" : "#ffc145"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-display font-bold text-4xl sm:text-5xl leading-none ${urgent ? "text-coral anim-blink" : "text-ink"}`}
        >
          {Math.ceil(remaining)}
        </span>
        <span className="text-[11px] font-bold tracking-[0.18em] text-ink-soft uppercase mt-1">saniye</span>
      </div>
    </div>
  );
}
