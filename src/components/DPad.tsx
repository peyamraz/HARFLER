import type { Dir } from "../game/engine";
import { IconChevron } from "./icons";

interface DPadProps {
  onDir: (d: Dir) => void;
  disabled?: boolean;
}

const btnBase =
  "dpad-btn flex items-center justify-center rounded-lg border border-pit-line " +
  "bg-pit-800/80 text-venom-300 shadow-[0_3px_0_rgba(7,19,14,0.9)] h-14 sm:h-16";

export function DPad({ onDir, disabled }: DPadProps) {
  const press = (d: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (!disabled) onDir(d);
  };

  return (
    <div
      className="grid grid-cols-3 grid-rows-2 gap-2 w-full max-w-[260px] mx-auto select-none"
      style={{ touchAction: "none" }}
      aria-label="Yön tuşları"
    >
      <div />
      <button type="button" className={btnBase} onPointerDown={press("up")} aria-label="Yukarı">
        <IconChevron className="w-7 h-7" />
      </button>
      <div />
      <button type="button" className={btnBase} onPointerDown={press("left")} aria-label="Sola">
        <IconChevron className="w-7 h-7 -rotate-90" />
      </button>
      <button type="button" className={btnBase} onPointerDown={press("down")} aria-label="Aşağı">
        <IconChevron className="w-7 h-7 rotate-180" />
      </button>
      <button type="button" className={btnBase} onPointerDown={press("right")} aria-label="Sağa">
        <IconChevron className="w-7 h-7 rotate-90" />
      </button>
    </div>
  );
}
