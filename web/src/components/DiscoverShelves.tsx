import { PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { api } from "../lib/api";
import type { DiscoverShelf } from "../lib/apiTypes";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { AlbumTile } from "./AlbumTiles";
import { Artwork } from "./Artwork";
import { Section } from "./Page";

const IDS = ["yt-trending", "sp-global", "sp-hits", "yt-new", "sp-india"] as const;

function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <button type="button" onClick={onPlay} className="group flex w-36 shrink-0 snap-start flex-col gap-2 text-left md:w-44">
      <span className="relative block">
        <Artwork src={track.art} fallback={track.thumb} className="aspect-square w-full rounded-[14px]" />
        <span className="absolute right-2 bottom-2 grid size-11 translate-y-1 place-items-center rounded-full bg-accent text-accent-ink opacity-0 shadow-[0_8px_20px_rgb(0_0_0/0.4)] transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
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

function Skeleton() {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-hidden px-4 md:px-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="w-36 shrink-0 md:w-44">
          <div className="aspect-square w-full animate-pulse rounded-[14px] bg-surface-2" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

/** One shelf: loads when it nears the screen, hides itself if empty or failed. */
function Shelf({ id }: { id: (typeof IDS)[number] }) {
  const t = useT();
  const playList = usePlayer((s) => s.playList);
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [data, setData] = useState<DiscoverShelf | "failed" | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setNear(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    const ctl = new AbortController();
    api.discoverShelf(id, ctl.signal).then(setData, () => !ctl.signal.aborted && setData("failed"));
    return () => ctl.abort();
  }, [near, id]);

  if (data === "failed" || (data && !data.tracks.length && !data.albums.length)) return null;
  const title = t.home.shelves[id];
  return (
    <div ref={host}>
      <Section title={title}>
        {!data ? (
          <Skeleton />
        ) : (
          <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 md:scroll-px-6 md:px-6">
            {data.tracks.map((tr, i) => (
              <TrackCard key={tr.id} track={tr} onPlay={() => playList(data.tracks, i)} />
            ))}
            {data.albums.map((a) => (
              <div key={a.id} className="w-36 shrink-0 snap-start md:w-44">
                <AlbumTile album={a} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/** Home's "what's popular now": YouTube Music trending plus Spotify's charts, no sign-in. */
export function DiscoverShelves() {
  const t = useT();
  return (
    <div className="flex flex-col gap-10">
      {IDS.map((id) => (
        <Shelf key={id} id={id} />
      ))}
      <p className="px-4 text-xs text-fg-3 md:px-6">{t.home.spotifyNote}</p>
    </div>
  );
}
