interface IconProps {
  className?: string;
}

const S = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSpeaker({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" stroke="none" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function IconEar({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M7 9a5.5 5.5 0 1 1 10 3.2c-1.2 1.6-2.4 2.4-2.7 4.3-.2 1.5-1.2 3-3 3-1.6 0-2.6-1-2.9-2.4" />
      <path d="M11 9.5a2.6 2.6 0 1 1 4.4 1.9c-.8.9-1.5 1.4-1.7 2.6" />
    </svg>
  );
}

export function IconBrain({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M9.5 4.5A2.8 2.8 0 0 0 6 7.2 3.2 3.2 0 0 0 4 10.4c0 1 .4 1.9 1.1 2.5A3.3 3.3 0 0 0 6.5 19c1 0 1.9-.4 2.5-1.1.6.7 1.4 1.1 2.3 1.1V4.9a2.8 2.8 0 0 0-1.8-.4z" />
      <path d="M14.5 4.5A2.8 2.8 0 0 1 18 7.2a3.2 3.2 0 0 1 2 3.2c0 1-.4 1.9-1.1 2.5a3.3 3.3 0 0 1-1.4 6.1c-1 0-1.9-.4-2.5-1.1-.6.7-1.4 1.1-2.3 1.1V4.9c.6-.3 1.2-.5 1.8-.4z" />
    </svg>
  );
}

export function IconTrophy({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H4.5v1A3.5 3.5 0 0 0 8 9.5M16 5h3.5v1A3.5 3.5 0 0 1 16 9.5" />
      <path d="M12 13v3M8.5 20h7M10 20v-2.5a1.5 1.5 0 0 1 3 0V20" />
    </svg>
  );
}

export function IconStar({ className = "w-6 h-6", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path
        d="M12 3.6l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8 2.5-5z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function IconFlame({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M12 3.5c.6 2.6-.7 4.2-2 5.6C8.6 10.6 7.5 12 7.5 14a4.5 4.5 0 0 0 9 0c0-1.6-.6-3-1.5-4.2-.3 1-.9 1.7-1.8 2.2.3-2.9-.4-6.2-1.2-8.5z" />
    </svg>
  );
}

export function IconBolt({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M13 3L5 13.5h5L10.5 21 19 10.5h-5.5L13 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPlay({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
    </svg>
  );
}

export function IconReplay({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M4 5v5h5" />
      <path d="M4.6 10A8 8 0 1 1 4 14" />
    </svg>
  );
}

export function IconCheck({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconX({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconVolume({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" stroke="none" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
    </svg>
  );
}

export function IconVolumeOff({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" stroke="none" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </svg>
  );
}

export function IconBook({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
      <path d="M9 8h7M9 11.5h5" />
    </svg>
  );
}

export function IconLock({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

export function IconHand({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M8.5 12.5V5.8a1.4 1.4 0 0 1 2.8 0v5.7m0-6.7a1.4 1.4 0 0 1 2.8 0v6.7m0-5.2a1.4 1.4 0 0 1 2.8 0v7.2c0 3.6-2.4 6-5.9 6-3 0-4.5-1.5-5.9-4.1L3.6 12.9c-.6-1 .3-2.2 1.5-1.9.7.2 1.2.6 1.6 1.3l1.8 2.7" />
    </svg>
  );
}

export function IconArrowDown({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M12 4v15M6 13.5l6 6 6-6" />
    </svg>
  );
}

export function IconDownload({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </svg>
  );
}

export function IconFolder({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V17A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17V7z" />
    </svg>
  );
}

export function IconCursor({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S} aria-hidden>
      <path d="M6 3.5l12 8.2-5.2 1 3 5.6-2.5 1.3-3-5.6L6 17.5V3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSparkle({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z" fill="currentColor" />
      <path d="M19 16l.9 2.4 2.4.9-2.4.9L19 22.6l-.9-2.4-2.4-.9 2.4-.9L19 16z" fill="currentColor" />
    </svg>
  );
}
