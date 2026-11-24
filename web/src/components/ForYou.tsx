import {
  BarbellIcon,
  CarIcon,
  CloudRainIcon,
  CompassIcon,
  ConfettiIcon,
  DownloadSimpleIcon,
  HeartIcon,
  LeafIcon,
  LightningIcon,
  MoonStarsIcon,
  PlayIcon,
  RadioIcon,
  ShuffleIcon,
  SmileyIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { useEffect, useState, type ComponentType } from "react";
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

const VIBES: readonly [string, string, ComponentType<{ size?: number; weight?: "fill" }>, string][] = [
  ["energize", "energetic upbeat", LightningIcon, "from-amber-500/40 to-orange-600/20"],
  ["relax", "relaxing calm", LeafIcon, "from-emerald-500/35 to-teal-600/15"],
  ["focus", "focus study instrumental", TargetIcon, "from-sky-500/35 to-indigo-600/15"],
  ["workout", "workout gym", BarbellIcon, "from-rose-500/40 to-red-700/15"],
  ["party", "party dance", ConfettiIcon, "from-fuchsia-500/40 to-purple-700/15"],
  ["commute", "commute road trip", CarIcon, "from-cyan-500/35 to-blue-700/15"],
  ["sleep", "sleep soft", MoonStarsIcon, "from-indigo-500/40 to-slate-700/20"],
  ["feelGood", "feel good happy", SmileyIcon, "from-yellow-400/40 to-lime-600/15"],
  ["romance", "romantic love", HeartIcon, "from-pink-500/40 to-rose-700/15"],
  ["sad", "sad emotional", CloudRainIcon, "from-slate-400/30 to-blue-900/25"],
];

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
  const tile = "flex h-16 items-center gap-3 rounded-[20px] bg-surface-2 pr-4 pl-2.5 text-sm font-semibold transition-transform active:scale-[0.97]";
  const icon = (c: string) => `grid size-11 shrink-0 place-items-center rounded-[14px] ${c}`;

  return (
    <div className="flex flex-col gap-7">
      <div className="px-4 md:px-6">
        <p className="text-xs text-fg-3">{today}</p>
        <h2 className="text-[28px] leading-tight font-bold tracking-tight">{f.title}</h2>
      </div>

      <button
        type="button"
        onClick={startRadioNow}
        className="relative mx-4 flex min-h-36 items-end justify-between gap-4 overflow-hidden rounded-[32px] bg-linear-to-br from-accent/45 via-accent/15 to-surface-2 p-6 text-left md:mx-6"
      >
        <RadioIcon size={150} weight="fill" className="pointer-events-none absolute -top-6 -right-6 text-accent/20" />
        <span className="relative min-w-0">
          <span className="block text-2xl font-bold tracking-tight">{f.radio}</span>
          <span className="mt-1 block text-sm text-fg-2">{f.radioSub}</span>
        </span>
        <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_28px_color-mix(in_srgb,var(--accent)_45%,transparent)]">
          <PlayIcon size={26} weight="fill" />
        </span>
      </button>

      <Section title={f.quick}>
        <div className="grid grid-cols-2 gap-2.5 px-4 md:grid-cols-4 md:px-6">
          <Link to={paths.favorites} className={tile}>
            <span className={icon("bg-rose-500/25 text-rose-300")}><HeartIcon size={22} weight="fill" /></span>
            {f.liked}
          </Link>
          <Link to={paths.search} className={tile}>
            <span className={icon("bg-sky-500/25 text-sky-300")}><CompassIcon size={22} weight="fill" /></span>
            {f.discover}
          </Link>
          <button type="button" onClick={() => trending.length && playList(trending, 0)} className={cn(tile, "text-left")}>
            <span className={icon("bg-violet-500/25 text-violet-300")}><ShuffleIcon size={22} weight="fill" /></span>
            {f.mix}
          </button>
          <Link to={paths.downloads} className={tile}>
            <span className={icon("bg-emerald-500/25 text-emerald-300")}><DownloadSimpleIcon size={22} weight="fill" /></span>
            {f.downloads}
          </Link>
        </div>
      </Section>

      <Section title={f.sound}>
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 md:px-6">
          {VIBES.map(([k, q, Icon, grad]) => (
            <button
              key={k}
              type="button"
              onClick={() => vibe(q)}
              className={cn("flex h-24 w-28 shrink-0 flex-col justify-between rounded-[22px] bg-linear-to-br p-3 text-left transition-transform active:scale-95", grad)}
            >
              <Icon size={26} weight="fill" />
              <span className="text-sm font-semibold">{f.vibes[k as keyof typeof f.vibes]}</span>
            </button>
          ))}
        </div>
      </Section>

      {picks.length > 0 && (
        <Section title={f.picks}>
          <div className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-2 md:px-6">
            {picks.map((p, i) => (
              <button key={p.id} type="button" onClick={() => playList(picks, i)} className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface-1 p-2 text-left active:scale-[0.98]">
                <Artwork src={p.art} alt="" className="size-14 shrink-0 rounded-xl" />
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
