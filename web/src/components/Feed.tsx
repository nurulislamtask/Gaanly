import { ArrowsClockwiseIcon, CaretDownIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { api } from "../lib/api";
import type { DiscoverShelf } from "../lib/apiTypes";
import { bumpSeed, CHIPS, currentSeed, feedFor, type Chip, type ShelfDef } from "../lib/feed";
import { cn } from "../lib/format";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { isFiltering, useHomePrefs } from "../stores/homePrefs";
import { TrackList, TrackListSkeleton } from "./TrackList";
import { AlbumTile } from "./AlbumTiles";
import { Artwork } from "./Artwork";
import { Section } from "./Page";
import { ForYou } from "./ForYou";

/** Drops what an earlier shelf already showed (same song, or the same cover under another title). */
function fresh(data: DiscoverShelf, seen: Set<string>): DiscoverShelf {
  const own = new Set<string>();
  const tracks = data.tracks.filter((t) => {
    if (seen.has(t.id) || (t.art && seen.has(t.art)) || own.has(t.id) || (t.art && own.has(t.art))) return false;
    own.add(t.id);
    if (t.art) own.add(t.art);
    return true;
  });
  const albums = data.albums.filter((a) => !seen.has(a.id) && !(a.art && seen.has(a.art)));
  return { ...data, tracks, albums };
}

const remember = (data: DiscoverShelf, seen: Set<string>) => {
  for (const t of data.tracks) {
    seen.add(t.id);
    if (t.art) seen.add(t.art);
  }
  for (const a of data.albums) {
    seen.add(a.id);
    if (a.art) seen.add(a.art);
  }
};

/** One shelf: loads when it nears the screen and hands its songs to the feed; hides itself when empty or failed. */
function Shelf({
  title,
  load,
  onLoaded,
  view,
}: {
  title: string;
  load: (signal: AbortSignal) => Promise<DiscoverShelf>;
  onLoaded: (data: DiscoverShelf | "failed") => void;
  /** What to show once loaded: the shelf's songs minus those shown above it. */
  view: DiscoverShelf | "failed" | null;
}) {
  const t = useT();
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

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
    load(ctl.signal).then(onLoaded, () => !ctl.signal.aborted && onLoaded("failed"));
    return () => ctl.abort();
    // `load` and `onLoaded` are rebuilt every render; a shelf only loads once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  const [open, setOpen] = useState(false);
  if (view === "failed" || (view && view.tracks.length + view.albums.length < 3)) return null;
  const LIST = 5;
  return (
    <div ref={host}>
      <Section title={title}>
        {!view ? (
          <div className="px-3">
            <TrackListSkeleton rows={4} />
          </div>
        ) : (
          <>
            {view.tracks.length > 0 && (
              <div className="mx-3 rounded-[22px] glass p-1 ring-1 ring-line">
                <TrackList tracks={open ? view.tracks : view.tracks.slice(0, LIST)} context={view.tracks} header={false} showAlbum={false} />
                {view.tracks.length > LIST && (
                  <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex h-11 w-full items-center justify-center gap-1.5 text-sm font-medium text-accent-text"
                  >
                    {open ? t.home.feed.showLess : t.home.feed.showMore(view.tracks.length - LIST)}
                    <CaretDownIcon size={14} weight="bold" className={open ? "rotate-180" : ""} />
                  </button>
                )}
              </div>
            )}
            {view.albums.length > 0 && (
              <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 md:scroll-px-6 md:px-6">
                {view.albums.map((a) => (
                  <div key={a.id} className="w-36 shrink-0 snap-start md:w-44">
                    <AlbumTile album={a} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

/** The big cards at the top: what's trending right now. */
function Hero({ onTracks }: { onTracks: (tracks: Track[]) => void }) {
  const t = useT();
  const playList = usePlayer((s) => s.playList);
  const [tracks, setTracks] = useState<Track[]>([]);
  useEffect(() => {
    const ctl = new AbortController();
    api.discoverShelf("yt-trending", ctl.signal).then(
      (s) => {
        const top = s.tracks.slice(0, 8);
        setTracks(top);
        onTracks(top);
      },
      () => {},
    );
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

/** A song shelf: one search, or several merged (a singer's catalogue), keeping a singer's own songs only. */
async function loadSongs(def: Extract<ShelfDef, { kind: "songs" }>, signal: AbortSignal): Promise<DiscoverShelf> {
  const lists = await Promise.all([def.query, ...(def.more ?? [])].map((q) => api.search(q, "song", signal).catch(() => [] as Track[])));
  let tracks = lists.flat();
  if (def.match) {
    const want = def.match.toLowerCase();
    const own = tracks.filter((t) => t.artist.toLowerCase().includes(want));
    if (own.length >= 3) tracks = own;
  }
  const seen = new Set<string>();
  const unique = tracks.filter((t) => {
    const key = `${t.title.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").trim()}|${t.artist.toLowerCase()}`;
    if (seen.has(t.id) || seen.has(key)) return false;
    seen.add(t.id);
    seen.add(key);
    return true;
  });
  if (!unique.length && !signal.aborted && lists.every((l) => !l.length)) throw new Error("empty");
  return { id: def.key, tracks: unique.slice(0, def.size), albums: [] };
}

const CHIP_KEY = "gaanly:feedChip";

/** Home's music feed: category chips, the featured row, then shelves of new and old songs. Nothing to sign in to. */
export function Feed() {
  const t = useT();
  const prefs = useHomePrefs();
  const filtering = isFiltering(prefs);
  const [chip, setChip] = useState<Chip>(() => {
    try {
      const saved = localStorage.getItem(CHIP_KEY);
      return (CHIPS as readonly string[]).includes(saved ?? "") ? (saved as Chip) : "all";
    } catch {
      return "all";
    }
  });
  const [seed, setSeed] = useState(currentSeed);
  const [loaded, setLoaded] = useState<Record<string, DiscoverShelf | "failed">>({});
  const [hero, setHero] = useState<Track[]>([]);
  const shelves = feedFor(chip, seed, { languages: prefs.languages, artists: prefs.artists });
  const showHero = chip === "all" && !filtering;

  const choose = (c: Chip) => {
    setChip(c);
    try {
      localStorage.setItem(CHIP_KEY, c);
    } catch {
      /* storage unavailable */
    }
  };

  // Songs already shown, in order, so a cover or song never repeats further down.
  const seen = new Set<string>();
  if (showHero) remember({ id: "hero", tracks: hero, albums: [] }, seen);
  const rows = shelves.map((def) => {
    const key = `${chip}:${seed}:${def.kind === "discover" ? def.id : def.key}`;
    const data = loaded[key];
    let view: DiscoverShelf | "failed" | null = null;
    if (data === "failed") view = "failed";
    else if (data) {
      view = fresh(data, seen);
      if (view.tracks.length + view.albums.length >= 3) remember(view, seen);
    }
    return { def, key, view };
  });

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
                chip === c ? "bg-accent text-accent-ink" : "bg-surface-2 text-fg-2 hover:text-fg",
              )}
            >
              {t.home.feed.chips[c]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setSeed(bumpSeed());
            setLoaded({});
          }}
          aria-label={t.home.feed.refresh}
          title={t.home.feed.refresh}
          className="mr-4 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2 transition-transform hover:text-fg active:rotate-180 md:mr-6"
        >
          <ArrowsClockwiseIcon size={18} />
        </button>
      </div>

      {showHero && <ForYou />}
      {showHero && <Hero onTracks={setHero} />}

      {rows.map(({ def, key, view }) => (
        <Shelf
          key={key}
          title={titleOf(def, t)}
          view={view}
          onLoaded={(data) => setLoaded((l) => ({ ...l, [key]: data }))}
          load={
            def.kind === "discover"
              ? (signal) => api.discoverShelf(def.id, signal)
              : (signal) => loadSongs(def, signal)
          }
        />
      ))}
      <p className="px-4 text-xs text-fg-3 md:px-6">{t.home.spotifyNote}</p>
    </div>
  );
}
