import { BooksIcon, HouseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router";
import { cn } from "../lib/format";
import { useT } from "../i18n";
import { NOW_PLAYING_HASH, paths } from "../lib/routes";
import { selectCurrent, usePlayer, useStatusText } from "../player/player";
import { Artwork } from "./Artwork";
import { PlayPauseIcon } from "./Controls";

const tabs = [
  { to: paths.home, key: "home", Icon: HouseIcon, end: true },
  { to: paths.search, key: "search", Icon: MagnifyingGlassIcon, end: false },
  { to: paths.library, key: "library", Icon: BooksIcon, end: false },
] as const;

export function TabBar() {
  const t = useT();
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-4 bottom-[calc(10px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md"
    >
      <ul className="glass grid h-[68px] grid-cols-3 rounded-[34px] p-1.5 shadow-[0_14px_40px_rgb(0_0_0/0.4)] ring-1 ring-line">
        {tabs.map(({ to, key, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 rounded-[28px] text-[11px] font-medium transition-colors duration-300",
                  isActive ? "bg-accent-soft text-accent-text" : "text-fg-3",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} weight={isActive ? "fill" : "regular"} />
                  {t.nav[key]}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function MiniPlayer() {
  const track = usePlayer(selectCurrent);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const status = usePlayer((s) => s.status);
  const statusText = useStatusText();
  const toggle = usePlayer((s) => s.toggle);
  const t = useT();
  const navigate = useNavigate();
  if (!track) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="fixed inset-x-2 bottom-[calc(88px+env(safe-area-inset-bottom))] z-20">
      <div className="island rounded-[30px]! p-1! shadow-[0_10px_30px_rgb(0_0_0/0.35)]">
        <div className="island-core relative flex h-14 rounded-[26px]! items-center gap-3 overflow-hidden pr-1 pl-1.5">
          <button
            type="button"
            onClick={() => navigate({ hash: NOW_PLAYING_HASH })}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={t.player.openNowPlaying(track.title)}
          >
            <Artwork src={track.thumb} className="size-11 rounded-[16px]" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{track.title}</span>
              <span className={cn("block truncate text-xs", status === "error" ? "text-danger" : "text-fg-2")}>
                {statusText ?? track.artist}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={status === "playing" ? t.common.pause : t.common.play}
            className="grid size-11 shrink-0 place-items-center rounded-full text-fg active:scale-90"
          >
            <PlayPauseIcon size={24} />
          </button>
          <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-surface-4">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </div>
    </div>
  );
}
