import type { LetterDef } from "../game/letters";

export type TileState = "idle" | "locked" | "correct" | "wrong" | "target" | "dim";

interface LetterTileProps {
  letter: LetterDef;
  size?: "md" | "lg" | "xl";
  state?: TileState;
  badge?: number;
  sub?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const sizes = {
  md: "w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl rounded-xl",
  lg: "w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl rounded-xl",
  xl: "w-24 h-24 sm:w-28 sm:h-28 text-5xl sm:text-6xl rounded-2xl",
};

export function LetterTile({
  letter,
  size = "lg",
  state = "idle",
  badge,
  sub,
  className = "",
  onClick,
}: LetterTileProps) {
  const stateCls: Record<TileState, string> = {
    idle: "",
    locked: "opacity-50 grayscale-[35%] cursor-not-allowed",
    dim: "opacity-35",
    correct: "ring-4 ring-leaf-deep anim-pop",
    target: "ring-4 ring-amber-deep anim-wiggle",
    wrong: "anim-shake",
  };

  return (
    <div className={`relative flex flex-col items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick || state === "locked"}
        aria-label={`${letter.char} harfi${sub ? ", " + sub : ""}`}
        className={`
          relative sticker font-display font-semibold leading-none flex items-center justify-center
          transition-transform duration-150 select-none
          ${sizes[size]} ${letter.bg} ${letter.fg} ${stateCls[state]}
          ${onClick && state !== "locked" ? "btn-toy hover:-rotate-2 cursor-pointer" : ""}
        `}
        style={state === "wrong" ? { background: "#ff9d9d" } : undefined}
      >
        {letter.char}
        {badge !== undefined && (
          <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-ink text-mint font-body text-[13px] font-black flex items-center justify-center border-2 border-paper">
            {badge}
          </span>
        )}
      </button>
      {sub && <span className="font-display font-medium text-ink-soft text-sm sm:text-base">{sub}</span>}
    </div>
  );
}
