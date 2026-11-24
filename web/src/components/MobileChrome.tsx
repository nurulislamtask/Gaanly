import { BooksIcon, CompassIcon, GearSixIcon, HouseIcon } from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router";
import { cn } from "../lib/format";
import { useT } from "../i18n";
import { NOW_PLAYING_HASH, paths } from "../lib/routes";
import { selectCurrent, usePlayer, useStatusText } from "../player/player";
import { useUi } from "../stores/ui";
import { Artwork } from "./Artwork";
import { PlayPauseIcon } from "./Controls";

const tabs = [
  { to: paths.home, key: "home", Icon: HouseIcon, end: true },
  { to: paths.search, key: "search", Icon: CompassIcon, end: false },
  { to: paths.library, key: "library", Icon: BooksIcon, end: false },
] as const;

/** Flat bottom bar: Home, Explore, Library, Settings. */
export function TabBar() {
  const t = useT();
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const item = "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-1 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {tabs.map(({ to, key, Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => cn(item, isActive ? "text-accent-text" : "text-fg-3")}>
              {({ isActive }) => (
                <>
                  <Icon size={24} weight={isActive ? "fill" : "regular"} />
                  {key === "search" ? "Explore" : t.nav[key]}
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => setSettingsOpen(true)} className={cn(item, "w-full text-fg-3")}>
            <GearSixIcon size={24} />
            {t.nav.settings}
          </button>
        </li>
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
    <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20">
      <div className="relative flex h-16 items-center gap-3 overflow-hidden rounded-2xl bg-surface-2 pr-2 pl-2 shadow-[0_8px_24px_rgb(20_17_43/0.25)]">
        <button
          type="button"
          onClick={() => navigate({ hash: NOW_PLAYING_HASH })}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={t.player.openNowPlaying(track.title)}
        >
          <Artwork src={track.thumb} className="size-12 shrink-0 rounded-xl" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{track.title}</span>
            <span className={cn("block truncate text-xs", status === "error" ? "text-danger" : "text-fg-2")}>
              {statusText ?? track.artist}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={status === "playing" ? t.common.pause : t.common.play}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink active:scale-90"
        >
          <PlayPauseIcon size={22} />
        </button>
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-surface-4">
          <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
      </div>
    </div>
  );
}
