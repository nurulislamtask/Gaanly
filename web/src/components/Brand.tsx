import { cn } from "../lib/format";

/** The Gaanly mark: headphones around a little equalizer. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="86 118 340 322" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gaanly-bars" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC24A" />
          <stop offset="1" stopColor="#FF5C7A" />
        </linearGradient>
      </defs>
      <path d="M134 330V268A122 122 0 0 1 378 268V330" fill="none" stroke="currentColor" strokeWidth="34" strokeLinecap="round" />
      <rect x="92" y="296" width="86" height="138" rx="40" fill="currentColor" />
      <rect x="334" y="296" width="86" height="138" rx="40" fill="currentColor" />
      <rect x="206" y="330" width="26" height="76" rx="13" fill="url(#gaanly-bars)" />
      <rect x="243" y="292" width="26" height="150" rx="13" fill="url(#gaanly-bars)" />
      <rect x="280" y="318" width="26" height="100" rx="13" fill="url(#gaanly-bars)" />
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
