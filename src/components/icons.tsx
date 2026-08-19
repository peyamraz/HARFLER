interface IconProps {
  className?: string;
}

const base = "inline-block shrink-0";

export function IconPlay({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

export function IconPause({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function IconRestart({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function IconHome({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </svg>
  );
}

export function IconTrophy({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
    </svg>
  );
}

export function IconVolume({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

export function IconVolumeOff({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      <path d="m16 9 5 5M21 9l-5 5" />
    </svg>
  );
}

export function IconApple({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M12 7c-1.5-1.6-4.6-1.4-6.1.8-1.7 2.4-1 6.6 1.2 9.2 1.4 1.7 3 2.6 4.4 1.8.3-.2.7-.2 1 0 1.4.8 3-.1 4.4-1.8 2.2-2.6 2.9-6.8 1.2-9.2C16.6 5.6 13.5 5.4 12 7z" />
      <path d="M12.2 6.2c0-1.7 1-2.9 2.6-3.2.1 1.7-.9 2.9-2.6 3.2z" />
    </svg>
  );
}

export function IconBolt({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function IconClock({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconRuler({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${base} ${className}`} aria-hidden>
      <rect x="3" y="9" width="18" height="6" rx="1.5" />
      <path d="M7 9v3M11 9v2.2M15 9v3M19 9v2.2" transform="translate(-1.5 0)" />
    </svg>
  );
}

export function IconChevron({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M12 6.5 4.5 15h15L12 6.5z" />
    </svg>
  );
}

export function IconStar({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />
    </svg>
  );
}

/** Piksel-art yılan logosu */
export function IconSnakeLogo({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} aria-hidden shapeRendering="crispEdges">
      <rect x="2" y="10" width="3" height="3" fill="#20714a" />
      <rect x="5" y="10" width="3" height="3" fill="#7fd64b" />
      <rect x="8" y="10" width="3" height="3" fill="#a8e85a" />
      <rect x="8" y="7" width="3" height="3" fill="#a8e85a" />
      <rect x="8" y="4" width="4" height="3" fill="#d3f26a" />
      <rect x="10.6" y="5" width="1" height="1" fill="#12240f" />
      <rect x="5" y="2" width="3" height="3" fill="#ff5d5d" />
      <rect x="6" y="1" width="1" height="1" fill="#7fd64b" />
    </svg>
  );
}
