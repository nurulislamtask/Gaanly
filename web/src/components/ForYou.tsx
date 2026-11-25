import { LogoMark } from "./Brand";
import { PlayIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useT } from "../i18n";
import { api } from "../lib/api";
import { paths } from "../lib/routes";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { useLibrary } from "../stores/library";
import { Artwork } from "./Artwork";
import { Section } from "./Page";
import { TrackList } from "./TrackList";

const POPULAR = ["Arijit Singh", "Atif Aslam", "Shreya Ghoshal", "Jubin Nautiyal", "Hamza Malik", "Rahat Fateh Ali Khan", "Anupam Roy", "Neha Kakkar", "Taylor Swift", "Ed Sheeran"];
const GENRES = [
  ["Energize", "energetic upbeat"],
  ["Relax", "relaxing calm"],
  ["Focus", "focus study instrumental"],
  ["Workout", "workout gym"],
  ["Party", "party dance"],
  ["Romance", "romantic love"],
  ["Sad", "sad emotional"],
  ["Sleep", "sleep soft"],
  ["Feel good", "feel good happy"],
  ["Commute", "commute road trip"],
] as const;

const artistPhotos = new Map<string, string>();

/** A round row of singers (from what was played, else popular ones); a tap searches for them. */
function TopArtists() {
  const history = useLibrary((s) => s.history);
  const navigate = useNavigate();
  const names = [...new Set([...history.map((h) => h.artist.split(/,|&/)[0]?.trim() ?? ""), ...POPULAR].filter(Boolean))].slice(0, 10);
  const [, bump] = useState(0);
  useEffect(() => {
    let live = true;
    for (const n of names) {
      if (artistPhotos.has(n)) continue;
      artistPhotos.set(n, "");
      api.search(n, "song").then(
        (r) => {
          artistPhotos.set(n, r[0]?.art || r[0]?.thumb || "");
          if (live) bump((v) => v + 1);
        },
        () => artistPhotos.delete(n),
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join()]);
  return (
    <Section title="Top Artist">
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 md:px-6">
        {names.map((n) => (
          <button key={n} type="button" onClick={() => navigate(`/search?q=${encodeURIComponent(n)}`)} className="flex w-[84px] shrink-0 flex-col items-center gap-2">
            <span className="grid size-[84px] place-items-center overflow-hidden rounded-full bg-surface-2 text-xl font-semibold text-fg-3">
              {artistPhotos.get(n) ? <img src={artistPhotos.get(n)} alt="" className="size-full object-cover" /> : n[0]}
            </span>
            <span className="w-full truncate text-center text-[13px] text-fg-2">{n}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

/** A wide picture card: starts an endless radio from what was played, or from today's trending songs. */
function Banner({ trending, seed }: { trending: Track[]; seed?: Track }) {
  const startRadio = usePlayer((s) => s.startRadio);
  const go = () => {
    const s = seed ?? trending[0];
    if (s) void startRadio(s);
  };
  return (
    <Section title="New Album">
      <button type="button" onClick={go} className="relative mx-4 block h-52 w-[calc(100%-32px)] overflow-hidden rounded-3xl bg-linear-to-br from-accent to-[color-mix(in_oklab,var(--accent)_45%,black)] text-left md:mx-6 md:w-[calc(100%-48px)]">
        <LogoMark className="absolute -right-6 -top-4 h-48 text-white/10" />
        <span className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 text-white">
          <span>
            <span className="block text-lg font-semibold">Listen to the best music today</span>
            <span className="block text-xs text-white/75">Endless radio picked for you</span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-accent">
            <PlayIcon size={20} weight="fill" />
          </span>
        </span>
      </button>
    </Section>
  );
}

/** Recently played: square covers in a row, with a play badge. */
function RecentRow({ tracks }: { tracks: Track[] }) {
  const playList = usePlayer((s) => s.playList);
  const t = useT();
  if (!tracks.length) return null;
  return (
    <Section
      title={t.nav.recentlyPlayed}
      action={
        <Link to={paths.history} className="text-sm font-medium text-fg-3">
          {t.home.seeAll}
        </Link>
      }
    >
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 md:px-6">
        {tracks.slice(0, 12).map((tr, i) => (
          <button key={tr.id + i} type="button" onClick={() => playList(tracks, i)} className="flex w-[150px] shrink-0 flex-col gap-2 text-left">
            <span className="relative block">
              <Artwork src={tr.art} fallback={tr.thumb} alt="" className="aspect-square w-full rounded-2xl" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm">
                  <PlayIcon size={16} weight="fill" />
                </span>
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{tr.title}</span>
              <span className="block truncate text-xs text-fg-3">{tr.artist}</span>
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

/** Home's "for you" block, in the order of the design: Top Artist, banner, Recently Played, genres, picks. */
export function ForYou() {
  const history = useLibrary((s) => s.history);
  const favorites = useLibrary((s) => s.favorites);
  const playList = usePlayer((s) => s.playList);
  const seed: Track | undefined = history[0] ?? favorites[0];
  const [picks, setPicks] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [because, setBecause] = useState<Track[]>([]);
  const artist = history.find((h) => h.artist)?.artist;

  useEffect(() => {
    const ctl = new AbortController();
    (seed ? api.radio(seed.id) : api.discoverShelf("sp-hits", ctl.signal).then((s) => s.tracks)).then(
      (r) => !ctl.signal.aborted && setPicks((r ?? []).slice(0, 8)),
      () => {},
    );
    api.discoverShelf("yt-trending", ctl.signal).then((s) => setTrending(s.tracks ?? []), () => {});
    if (artist) api.search(artist, "song", ctl.signal).then((r) => setBecause((r ?? []).slice(0, 6)), () => {});
    return () => ctl.abort();
  }, [seed?.id, artist]);

  const vibe = async (q: string) => {
    try {
      const r = await api.search(`${q} music`, "song");
      if (r.length) playList(r, 0);
    } catch {
      /* offline */
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <TopArtists />
      <Banner trending={trending} seed={seed} />
      <RecentRow tracks={history} />
      <Section title="Genres">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-6">
          {GENRES.map(([label, q]) => (
            <button key={label} type="button" onClick={() => vibe(q)} className="h-9 shrink-0 rounded-lg border border-accent/50 px-4 text-sm font-medium text-accent-text active:bg-accent-soft">
              {label}
            </button>
          ))}
        </div>
      </Section>
      {picks.length > 0 && (
        <Section title="Just For You">
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 md:px-6">
            {picks.map((p, i) => (
              <button key={p.id} type="button" onClick={() => playList(picks, i)} className="flex w-[130px] shrink-0 flex-col gap-2 text-left">
                <Artwork src={p.art} fallback={p.thumb} alt="" className="aspect-square w-full rounded-2xl" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.title}</span>
                  <span className="block truncate text-xs text-fg-3">{p.artist}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}
      {artist && because.length > 0 && (
        <Section title={`Because you listened to ${artist}`}>
          <TrackList tracks={because} header={false} />
        </Section>
      )}
    </div>
  );
}
