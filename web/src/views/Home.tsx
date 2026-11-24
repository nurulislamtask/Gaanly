import { ClockCounterClockwiseIcon, DownloadSimpleIcon, HeartIcon, PlayIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Artwork } from "../components/Artwork";
import { Feed } from "../components/Feed";
import { PageHeader, Section } from "../components/Page";
import { TrackList } from "../components/TrackList";
import { useT } from "../i18n";
import { paths } from "../lib/routes";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { useOffline } from "../lib/offline";
import { useHomePrefs } from "../stores/homePrefs";
import { useAppearance } from "../stores/appearance";
import { useLibrary } from "../stores/library";

function Shortcut({ to, label, tracks, cover }: { to: string; label: string; tracks: Track[]; cover: ReactNode }) {
  const playList = usePlayer((s) => s.playList);
  const t = useT();
  return (
    <div className="group relative flex h-14 min-w-0 items-center gap-3 overflow-hidden rounded-[18px] bg-surface-2 pr-2 transition-colors hover:bg-surface-3 md:h-16">
      <Link to={to} className="absolute inset-0" aria-label={label} />
      <span className="pointer-events-none size-14 shrink-0 overflow-hidden md:size-16">{cover}</span>
      <span className="pointer-events-none min-w-0 flex-1 truncate text-[13px] font-semibold md:text-sm">{label}</span>
      {tracks.length > 0 && (
        <button
          type="button"
          onClick={() => playList(tracks, 0)}
          aria-label={t.common.playX(label)}
          className="relative z-10 hidden size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink opacity-0 shadow-[0_6px_18px_rgb(0_0_0/0.35)] transition-[opacity,transform] duration-200 ease-out-expo group-hover:opacity-100 hover:scale-105 active:scale-95 md:grid"
        >
          <PlayIcon size={18} weight="fill" />
        </button>
      )}
    </div>
  );
}

function RecentCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <button type="button" onClick={onPlay} className="group flex w-36 shrink-0 snap-start flex-col gap-2 text-left md:w-44">
      <span className="relative block">
        <Artwork src={track.art} fallback={track.thumb} className="aspect-square w-full rounded-[14px]" />
        <span className="absolute right-2 bottom-2 grid size-11 translate-y-1 place-items-center rounded-full bg-accent text-accent-ink opacity-0 shadow-[0_8px_20px_rgb(0_0_0/0.4)] transition-[opacity,transform] duration-200 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          <PlayIcon size={20} weight="fill" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{track.title}</span>
        <span className="block truncate text-xs text-fg-2">{track.artist}</span>
      </span>
    </button>
  );
}

export default function Home() {
  const { favorites, playlists, history, status } = useLibrary();
  const playList = usePlayer((s) => s.playList);
  const t = useT();
  const show = useAppearance();
  const offline = useOffline((s) => s.tracks);
  const playlistIds = useHomePrefs((s) => s.playlistIds);
  const shortcutPlaylists = playlistIds ? playlists.filter((p) => playlistIds.includes(p.id)) : playlists.slice(0, 6);
  const empty = status === "ready" && !favorites.length && !playlists.length && !history.length;

  return (
    <div className="pb-8">
      <PageHeader />

      <div className="px-4 pt-2 pb-6 md:px-6 md:pt-8">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-4xl">{t.time.greeting(new Date().getHours())}</h1>
      </div>

      {!empty && status === "ready" && show.homeShortcuts && (
        <div className="flex items-center justify-between px-4 pb-2 md:px-6">
          <p className="text-xs font-medium tracking-wide text-fg-3 uppercase">{t.home.feed.yourLibrary}</p>
        </div>
      )}

      {(empty || status === "loading") && <Feed />}

      {!empty && status === "ready" && (
        <div className="flex flex-col gap-10">
          {show.homeShortcuts && <div className="grid grid-cols-2 gap-2 px-4 md:px-6 lg:grid-cols-3 2xl:grid-cols-4">
            <Shortcut
              to={paths.favorites}
              label={t.nav.favorites}
              tracks={favorites}
              cover={
                <span className="grid size-full place-items-center bg-accent-soft text-accent-text">
                  <HeartIcon size={24} weight="fill" />
                </span>
              }
            />
            <Shortcut
              to={paths.history}
              label={t.nav.recentlyPlayed}
              tracks={history}
              cover={
                <span className="grid size-full place-items-center bg-surface-3 text-fg-2">
                  <ClockCounterClockwiseIcon size={24} />
                </span>
              }
            />
            {offline.length > 0 && (
              <Shortcut
                to={paths.downloads}
                label={t.listen.downloadsTitle}
                tracks={offline}
                cover={
                  <span className="grid size-full place-items-center bg-surface-3 text-fg-2">
                    <DownloadSimpleIcon size={24} />
                  </span>
                }
              />
            )}
            {shortcutPlaylists.map((p) => (
              <Shortcut
                key={p.id}
                to={paths.playlist(p.id)}
                label={p.name}
                tracks={p.tracks}
                cover={<Artwork src={p.tracks[0]?.thumb} className="size-full" />}
              />
            ))}
          </div>}

          <Feed />

          {show.homeRecent && history.length > 0 && (
            <Section
              title={t.nav.recentlyPlayed}
              action={
                <Link to={paths.history} className="text-sm font-medium text-fg-2 hover:text-fg">
                  {t.home.seeAll}
                </Link>
              }
            >
              <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 md:scroll-px-6 md:px-6">
                {history.slice(0, 16).map((t, i) => (
                  <RecentCard key={t.id} track={t} onPlay={() => playList(history, i)} />
                ))}
              </div>
            </Section>
          )}

          {show.homeFavorites && favorites.length > 0 && (
            <Section
              title={t.home.yourFavorites}
              action={
                <Link to={paths.favorites} className="text-sm font-medium text-fg-2 hover:text-fg">
                  {t.home.seeAll}
                </Link>
              }
            >
              <div className="px-2 md:px-3">
                <TrackList tracks={favorites.slice(0, 5)} context={favorites} header={false} showAlbum={false} />
              </div>
            </Section>
          )}
        </div>
      )}

    </div>
  );
}
