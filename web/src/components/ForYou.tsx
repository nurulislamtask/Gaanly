import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useT } from "../i18n";
import { api } from "../lib/api";
import { cn } from "../lib/format";
import { paths } from "../lib/routes";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { useLibrary } from "../stores/library";
import { Artwork } from "./Artwork";
import { Section } from "./Page";
import { TrackList } from "./TrackList";

const VIBES = [
  ["energize", "energetic upbeat"],
  ["relax", "relaxing calm"],
  ["focus", "focus study instrumental"],
  ["workout", "workout gym"],
  ["party", "party dance"],
  ["commute", "commute road trip"],
  ["sleep", "sleep soft"],
  ["feelGood", "feel good happy"],
  ["romance", "romantic love"],
  ["sad", "sad emotional"],
] as const;

/** "Made for you": an endless radio card, quick links, mood chips and picks drawn from what was played. */
export function ForYou() {
  const t = useT();
  const f = t.home.feed.forYou;
  const history = useLibrary((s) => s.history);
  const favorites = useLibrary((s) => s.favorites);
  const playList = usePlayer((s) => s.playList);
  const startRadio = usePlayer((s) => s.startRadio);
  const seed: Track | undefined = history[0] ?? favorites[0];
  const [picks, setPicks] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const artist = history.find((h) => h.artist)?.artist;
  const [because, setBecause] = useState<Track[]>([]);

  useEffect(() => {
    const ctl = new AbortController();
    (seed ? api.radio(seed.id) : api.discoverShelf("sp-hits", ctl.signal).then((s) => s.tracks)).then(
      (r) => !ctl.signal.aborted && setPicks(r.slice(0, 8)),
      () => {},
    );
    api.discoverShelf("yt-trending", ctl.signal).then((s) => setTrending(s.tracks), () => {});
    if (artist)
      api.search(artist, "song", ctl.signal).then((r) => setBecause(r.slice(0, 6)), () => {});
    return () => ctl.abort();
  }, [seed?.id, artist]);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const startRadioNow = () => {
    const s = seed ?? trending[0];
    if (s) void startRadio(s);
  };
  const vibe = async (q: string) => {
    try {
      const r = await api.search(`${q} music`, "song");
      if (r.length) playList(r, 0);
    } catch {
      /* offline */
    }
  };
  const card = "glass flex h-14 items-center gap-3 rounded-2xl px-4 text-sm font-medium ring-1 ring-line hover:bg-surface-2";

  return (
    <div className="flex flex-col gap-8">
      <div className="px-4 md:px-6">
        <p className="text-xs text-fg-3">{today}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{f.title}</h2>
      </div>

      <button
        type="button"
        onClick={startRadioNow}
        className="glass mx-4 flex items-center justify-between gap-4 rounded-[24px] p-5 text-left ring-1 ring-line md:mx-6"
      >
        <span className="min-w-0">
          <span className="block text-lg font-semibold">{f.radio}</span>
          <span className="block text-sm text-fg-3">{f.radioSub}</span>
        </span>
        <span className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink">{f.play}</span>
      </button>

      <Section title={f.quick}>
        <div className="grid grid-cols-2 gap-2 px-4 md:grid-cols-4 md:px-6">
          <Link to={paths.favorites} className={card}>{f.liked}</Link>
          <Link to={paths.search} className={card}>{f.discover}</Link>
          <button type="button" onClick={() => trending.length && playList(trending, 0)} className={cn(card, "text-left")}>{f.mix}</button>
          <Link to={paths.downloads} className={card}>{f.downloads}</Link>
        </div>
      </Section>

      <Section title={f.sound}>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-6">
          {VIBES.map(([k, q]) => (
            <button key={k} type="button" onClick={() => vibe(q)} className="glass h-9 shrink-0 rounded-full px-4 text-sm text-fg-2 ring-1 ring-line hover:text-fg">
              {f.vibes[k]}
            </button>
          ))}
        </div>
      </Section>

      {picks.length > 0 && (
        <Section title={f.picks}>
          <div className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-2 md:px-6">
            {picks.map((p, i) => (
              <button key={p.id} type="button" onClick={() => playList(picks, i)} className="flex min-w-0 items-center gap-3 rounded-xl p-1.5 text-left hover:bg-surface-2">
                <Artwork src={p.art} alt="" className="size-12 shrink-0 rounded-lg" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.title}</span>
                  <span className="block truncate text-xs text-fg-3">{p.artist}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {artist && because.length > 0 && (
        <Section title={f.because(artist)}>
          <TrackList tracks={because} header={false} />
        </Section>
      )}
    </div>
  );
}
