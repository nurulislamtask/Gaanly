import { ArrowsClockwiseIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { api } from "../lib/api";
import type { DiscoverShelf } from "../lib/apiTypes";
import { bumpSeed, CHIPS, currentSeed, feedFor, type Chip, type ShelfDef } from "../lib/feed";
import { cn } from "../lib/format";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { AlbumTile } from "./AlbumTiles";
import { Artwork } from "./Artwork";
import { Section } from "./Page";

function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <button type="button" onClick={onPlay} className="group flex w-36 shrink-0 snap-start flex-col gap-2 text-left md:w-44">
      <span className="relative block">
        <Artwork src={track.art} fallback={track.thumb} className="aspect-square w-full rounded-[16px] shadow-[0_10px_28px_rgb(0_0_0/0.28)]" />
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
          <div className="aspect-square w-full animate-pulse rounded-[16px] bg-surface-2" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

/** One shelf: loads when it nears the screen, and hides itself when empty or failed. */
function Shelf({ title, load }: { title: string; load: (signal: AbortSignal) => Promise<DiscoverShelf> }) {
  const playList = usePlayer((s) => s.playList);
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [data, setData] = useState<DiscoverShelf | "failed" | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setNear(true), { rootMargin: "500px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    const ctl = new AbortController();
    load(ctl.signal).then(setData, () => !ctl.signal.aborted && setData("failed"));
    return () => ctl.abort();
    // `load` is rebuilt every render; a shelf only loads once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  if (data === "failed" || (data && !data.tracks.length && !data.albums.length)) return null;
  return (
    <div ref={host}>
      <Section title={title}>
        {!data ? (
          <Skeleton />
        ) : (
          <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 md:scroll-px-6 md:px-6">
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

/** The big cards at the top: what's trending right now. */
function Hero() {
  const t = useT();
  const playList = usePlayer((s) => s.playList);
  const [tracks, setTracks] = useState<Track[]>([]);
  useEffect(() => {
    const ctl = new AbortController();
    api.discoverShelf("yt-trending", ctl.signal).then(
      (s) => setTracks(s.tracks.slice(0, 8)),
      () => {},
    );
    return () => ctl.abort();
  }, []);
  if (!tracks.length) return <div className="mx-4 h-52 animate-pulse rounded-[24px] bg-surface-2 md:mx-6 md:h-64" />;
  return (
    <Section title={t.home.feed.featured}>
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:scroll-px-6 md:px-6">
        {tracks.map((tr, i) => (
          <button
            key={tr.id}
            type="button"
            onClick={() => playList(tracks, i)}
            aria-label={t.home.feed.playX(tr.title)}
            className="group relative h-52 w-[78%] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-[24px] text-left shadow-[0_18px_44px_rgb(0_0_0/0.35)] md:h-64 md:w-[420px]"
          >
            <Artwork src={tr.art} fallback={tr.thumb} className="absolute inset-0 size-full transition-transform duration-500 ease-out-expo group-hover:scale-105" />
            <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
            <span className="absolute inset-x-4 bottom-4 flex items-end gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold text-white">{tr.title}</span>
                <span className="block truncate text-sm text-white/75">{tr.artist}</span>
              </span>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-lg transition-transform group-hover:scale-105">
                <PlayIcon size={22} weight="fill" />
              </span>
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function titleOf(def: ShelfDef, t: ReturnType<typeof useT>): string {
  if (def.kind === "discover") return t.home.shelves[def.id as keyof typeof t.home.shelves] ?? def.id;
  const { type, text } = def.title;
  return type === "new" ? t.home.feed.newSongs(text) : type === "old" ? t.home.feed.oldSongs(text) : type === "hits" ? t.home.feed.hits(text) : type === "artist" ? t.home.feed.moreFrom(text) : text;
}

const CHIP_KEY = "gaanly:feedChip";

/** Home's music feed: category chips, the featured row, then shelves of new and old songs. Nothing to sign in to. */
export function Feed() {
  const t = useT();
  const [chip, setChip] = useState<Chip>(() => {
    try {
      const saved = localStorage.getItem(CHIP_KEY);
      return (CHIPS as readonly string[]).includes(saved ?? "") ? (saved as Chip) : "all";
    } catch {
      return "all";
    }
  });
  const [seed, setSeed] = useState(currentSeed);
  const shelves = feedFor(chip, seed);

  const choose = (c: Chip) => {
    setChip(c);
    try {
      localStorage.setItem(CHIP_KEY, c);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2">
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto px-4 md:px-6" role="tablist">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={chip === c}
              onClick={() => choose(c)}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
                chip === c ? "bg-accent text-accent-ink" : "glass text-fg-2 ring-1 ring-line hover:text-fg",
              )}
            >
              {t.home.feed.chips[c]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSeed(bumpSeed())}
          aria-label={t.home.feed.refresh}
          title={t.home.feed.refresh}
          className="mr-4 grid size-9 shrink-0 place-items-center rounded-full text-fg-2 ring-1 ring-line transition-transform hover:text-fg active:rotate-180 md:mr-6"
        >
          <ArrowsClockwiseIcon size={18} />
        </button>
      </div>

      {chip === "all" && <Hero />}

      {shelves.map((def) => {
        const key = `${chip}:${seed}:${def.kind === "discover" ? def.id : def.key}`;
        const load =
          def.kind === "discover"
            ? (signal: AbortSignal) => api.discoverShelf(def.id, signal)
            : (signal: AbortSignal) =>
                api.search(def.query, "song", signal).then((tracks) => ({ id: def.key, tracks: tracks.slice(0, 20), albums: [] }));
        return <Shelf key={key} title={titleOf(def, t)} load={load} />;
      })}
      <p className="px-4 text-xs text-fg-3 md:px-6">{t.home.spotifyNote}</p>
    </div>
  );
}
