import { cn } from "../lib/format";

/** The Gaanly mark: a "g" whose bowl holds a three-bar equalizer. One color (currentColor). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="104 104 292 328" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="232" cy="226" r="86" />
        <path d="M356 150V312C356 366 318 396 262 396H214" />
      </g>
      <g fill="currentColor">
        <rect x="205" y="214" width="14" height="26" rx="7" />
        <rect x="225" y="188" width="14" height="78" rx="7" />
        <rect x="245" y="205" width="14" height="44" rx="7" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark className="size-7 text-accent-text" />
      <span className="text-[17px] font-semibold tracking-tight">gaanly</span>
    </span>
  );
}

/** The mark in motion: marks the track that is playing. */
export function Equalizer({ live, className }: { live: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex h-3.5 items-end gap-[2px]", live && "eq-live", className)}>
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent-text" />
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent-text" />
      <span className="eq-bar h-full w-[3px] rounded-full bg-accent-text" />
    </span>
  );
}
