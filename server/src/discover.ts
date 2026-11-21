import { albumCard, type AlbumCard } from "./browse.js";
import { config } from "./config.js";
import type { Lang } from "./i18n.js";
import { search, toTrack, withClient } from "./search.js";
import type { Track } from "./types.js";

/**
 * What Gaanly shows on Home before you search: YouTube Music's own trending lists, and Spotify's public charts.
 * Spotify only supplies the list (title and artist, from its public embed page); every song plays from YouTube,
 * found by searching for it. Nothing here needs an account.
 */

/** The shelves, in the order Home shows them. */
export const SHELF_IDS = ["yt-trending", "sp-global", "sp-hits", "yt-new", "sp-india"] as const;
export type ShelfId = (typeof SHELF_IDS)[number];
export const isShelfId = (id: string): id is ShelfId => (SHELF_IDS as readonly string[]).includes(id);

export interface Shelf {
  id: ShelfId;
  tracks: Track[];
  albums: AlbumCard[];
}

/** Spotify's own public charts and playlists, by playlist id. */
const SPOTIFY_PLAYLISTS: Record<string, string> = {
  "sp-global": "37i9dQZEVXbMDoHDwVN2tF", // Top 50 - Global
  "sp-hits": "37i9dQZF1DXcBWIGoYBM5M", // Today's Top Hits
  "sp-india": "37i9dQZEVXbLZ52XmnySJg", // Top 50 - India
};

const HOUR = 60 * 60_000;
const SHELF_SIZE = 20;

/** Time-boxed memo (failures are not kept, so the next visit tries again). */
function memo<T>(ttl: number, max = 400) {
  const store = new Map<string, { at: number; value: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    if (store.size > max) store.delete(store.keys().next().value!);
    const value = load();
    store.set(key, { at: Date.now(), value });
    value.catch(() => store.get(key)?.value === value && store.delete(key));
    return value;
  };
}

/** At most `limit` YouTube searches at once, however many shelves ask. */
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>, limit = 6): Promise<T> {
  while (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

// ---- Spotify (public embed page: no login, no API key)

export interface SpotifyEntry {
  title: string;
  artist: string;
}

const EMBED_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const embeds = memo<SpotifyEntry[]>(3 * HOUR, 100);

function spotifyEntries(kind: "playlist" | "album" | "track", id: string): Promise<SpotifyEntry[]> {
  return embeds(`${kind}/${id}`, async () => {
    const res = await (config.fetch ?? fetch)(`https://open.spotify.com/embed/${kind}/${id}`, {
      headers: { "user-agent": EMBED_AGENT, "accept-language": "en-US,en;q=0.9" },
    });
    if (!res.ok) throw new Error(`Spotify answered ${res.status}`);
    const html = await res.text();
    const json = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html)?.[1];
    if (!json) throw new Error("Spotify's page changed: no data found");
    const entity = JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
    const list: any[] = Array.isArray(entity?.trackList) ? entity.trackList : entity ? [entity] : [];
    const entries: SpotifyEntry[] = [];
    for (const t of list) {
      const title = String(t?.title ?? t?.name ?? "").trim();
      const artist = String(t?.subtitle ?? (Array.isArray(t?.artists) ? t.artists.map((a: any) => a?.name).filter(Boolean).join(", ") : "")).trim();
      if (title) entries.push({ title, artist });
    }
    if (!entries.length) throw new Error("Spotify's page changed: no songs found");
    return entries;
  });
}

const found = memo<Track | null>(6 * HOUR, 2000);

/** The YouTube version of a Spotify song: the first song result for "title artist". */
function resolve(entry: SpotifyEntry, lang: Lang): Promise<Track | null> {
  return found(`${lang}|${entry.title}|${entry.artist}`, () =>
    limited(async () => {
      try {
        return (await search(`${entry.title} ${entry.artist}`.trim().slice(0, 150), "song", lang))[0] ?? null;
      } catch {
        return null;
      }
    }),
  );
}

async function resolveAll(entries: SpotifyEntry[], lang: Lang): Promise<Track[]> {
  const tracks = await Promise.all(entries.map((e) => resolve(e, lang)));
  const seen = new Set<string>();
  return tracks.filter((t): t is Track => !!t && !seen.has(t.id) && !!seen.add(t.id));
}

const SPOTIFY_LINK = /open\.spotify\.com\/(?:intl-[a-z]{2,5}\/)?(track|album|playlist)\/([A-Za-z0-9]{22})/;

/** A pasted Spotify link (song, album or playlist), or null when the text is something else. */
export function spotifyLink(text: string): { kind: "track" | "album" | "playlist"; id: string } | null {
  const m = SPOTIFY_LINK.exec(text);
  return m ? { kind: m[1] as "track" | "album" | "playlist", id: m[2]! } : null;
}

/** The songs behind a pasted Spotify link, as YouTube tracks ready to play. */
export async function spotifyTracks(link: { kind: "track" | "album" | "playlist"; id: string }, lang: Lang): Promise<Track[]> {
  const entries = await spotifyEntries(link.kind, link.id);
  return resolveAll(entries.slice(0, 50), lang);
}

// ---- Shelves

const shelves = memo<Shelf>(HOUR, 50);

/** YouTube Music's Explore page: the "Trending" songs and the "New albums & singles", found by what they hold (their titles are translated). */
async function explore(lang: Lang): Promise<any[]> {
  const page: any = await withClient((yt) => yt.music.getExplore(), lang);
  return page?.sections ?? [];
}

async function youtubeShelf(id: "yt-trending" | "yt-new", lang: Lang): Promise<Shelf> {
  const sections = await explore(lang);
  if (id === "yt-trending") {
    for (const s of sections) {
      const tracks = (s?.contents ?? []).map((i: any) => toTrack(i, "song")).filter((t: Track | null): t is Track => !!t);
      if (tracks.length >= 5) return { id, tracks: tracks.slice(0, SHELF_SIZE), albums: [] };
    }
  } else {
    for (const s of sections) {
      const albums = (s?.contents ?? []).map(albumCard).filter((a: AlbumCard | null): a is AlbumCard => !!a && !!a.title);
      if (albums.length >= 5) return { id, tracks: [], albums: albums.slice(0, SHELF_SIZE) };
    }
  }
  return { id, tracks: [], albums: [] };
}

export function discoverShelf(id: ShelfId, lang: Lang): Promise<Shelf> {
  return shelves(`${lang}|${id}`, async () => {
    if (id === "yt-trending" || id === "yt-new") return youtubeShelf(id, lang);
    const entries = await spotifyEntries("playlist", SPOTIFY_PLAYLISTS[id]!);
    return { id, tracks: (await resolveAll(entries.slice(0, SHELF_SIZE), lang)).slice(0, SHELF_SIZE), albums: [] };
  });
}

// ---- Apple Music (public playlist and album pages: the songs are listed in the page's structured data)

const APPLE_LINK = /music\.apple\.com\/[a-z]{2}\/(playlist|album)\/[^/\s?]+\/([A-Za-z0-9._-]+)/;

export function appleLink(text: string): string | null {
  const m = /https?:\/\/music\.apple\.com\/[a-z]{2}\/(?:playlist|album)\/[^\s]+/.exec(text);
  return m && APPLE_LINK.test(m[0]) ? m[0].split("#")[0]! : null;
}

const appleEntries = memo<SpotifyEntry[]>(3 * HOUR, 60);

function walk(node: unknown, out: SpotifyEntry[]) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, out));
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (o["@type"] === "MusicRecording" && typeof o.name === "string") {
    const by = o.byArtist;
    const artist = Array.isArray(by) ? by.map((a: any) => a?.name).filter(Boolean).join(", ") : String((by as any)?.name ?? "");
    out.push({ title: o.name, artist });
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") walk(v, out);
}

/** The songs behind a pasted Apple Music playlist or album link, as YouTube tracks ready to play. */
export async function appleTracks(url: string, lang: Lang): Promise<Track[]> {
  const entries = await appleEntries(url, async () => {
    const res = await (config.fetch ?? fetch)(url, { headers: { "user-agent": EMBED_AGENT, "accept-language": "en-US,en;q=0.9" } });
    if (!res.ok) throw new Error(`Apple Music answered ${res.status}`);
    const html = await res.text();
    const found: SpotifyEntry[] = [];
    for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
      try {
        walk(JSON.parse(m[1]!), found);
      } catch {
        /* not the block we want */
      }
    }
    if (!found.length) throw new Error("Apple Music's page changed: no songs found");
    return found;
  });
  return resolveAll(entries.slice(0, 50), lang);
}
