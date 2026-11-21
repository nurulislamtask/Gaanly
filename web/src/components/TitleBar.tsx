import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { desktop } from "../lib/desktop";
import { cn } from "../lib/format";
import { selectCurrent, usePlayer } from "../player/player";
import { Equalizer, LogoMark } from "./Brand";

/** Back/forward plus a search box; Ctrl K (or Cmd K) focuses it from anywhere. */
function TopSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const btn = "app-no-drag grid size-7 place-items-center rounded-full text-fg-3 hover:bg-surface-2 hover:text-fg";
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5">
      <button type="button" aria-label="Back" onClick={() => navigate(-1)} className={btn}><CaretLeftIcon size={16} /></button>
      <button type="button" aria-label="Forward" onClick={() => navigate(1)} className={btn}><CaretRightIcon size={16} /></button>
      <form
        className="app-no-drag glass flex h-7 w-56 items-center gap-2 rounded-full px-3 ring-1 ring-line"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <MagnifyingGlassIcon size={14} className="text-fg-3" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-3" />
        <kbd className="text-[10px] text-fg-3">Ctrl K</kbd>
      </form>
    </div>
  );
}

/**
 * Title bar for the desktop app. The window is frameless; Windows and Linux draw their native buttons over the
 * right end (the "titlebar area" env variables tell us how much room they take), macOS its traffic lights
 * over the left end.
 */
export function TitleBar() {
  const track = usePlayer(selectCurrent);
  const live = usePlayer((s) => s.status === "playing");

  return (
    <div
      className={cn("app-drag flex shrink-0 items-center gap-2.5 select-none", desktop?.platform === "darwin" ? "pl-[84px]" : "pl-3.5")}
      style={{
        height: "env(titlebar-area-height, 40px)",
        paddingRight: "calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw) + 12px)",
      }}
    >
      <LogoMark className="size-[18px] shrink-0 text-accent-text" />
      <span className="shrink-0 text-[13px] font-semibold tracking-tight">gaanly</span>
      {track && (
        <span className="flex min-w-0 items-center gap-2 pl-2 text-xs text-fg-3">
          <Equalizer live={live} className="h-3 shrink-0" />
          <span className="truncate">
            {track.title}
            {track.artist && <span className="text-fg-3/70"> - {track.artist}</span>}
          </span>
        </span>
      )}
      <TopSearch />
    </div>
  );
}
