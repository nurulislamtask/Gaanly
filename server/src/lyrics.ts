import { config } from "./config.js";

/** Lyrics for a song from LRCLIB, a free community database (no key, no account). Synced lines when it has them. */
export interface Lyrics {
  /** Timed lines, in seconds, for the karaoke-style view. Empty when only plain text exists. */
  synced: { t: number; text: string }[];
  plain: string;
}

const clean = (s: string) =>
  s
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\s[-–—|]\s.*$/, " ")
    .replace(/\b(official|lyrics?|video|audio|remaster(ed)?|hd|4k)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

function parseLrc(lrc: string): Lyrics["synced"] {
  const lines: Lyrics["synced"] = [];
  for (const raw of lrc.split("\n")) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text });
  }
  return lines.sort((a, b) => a.t - b.t);
}

interface Hit {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
}

async function ask(path: string): Promise<unknown> {
  const res = await (config.fetch ?? fetch)(`https://lrclib.net/api/${path}`, { headers: { "user-agent": "Gaanly (https://github.com/nurulislamtask/Gaanly)" } });
  if (!res.ok) return null;
  return res.json();
}

const cache = new Map<string, Lyrics | null>();

export async function lyricsFor(title: string, artist: string, duration: number): Promise<Lyrics | null> {
  const track = clean(title) || title;
  const who = (artist.split(",")[0] ?? "").trim();
  const key = `${track}|${who}`;
  if (cache.has(key)) return cache.get(key)!;

  const q = new URLSearchParams({ track_name: track, artist_name: who });
  let hit: Hit | null = null;
  try {
    if (duration > 0) hit = (await ask(`get?${q}&duration=${Math.round(duration)}`)) as Hit | null;
    if (!hit?.syncedLyrics && !hit?.plainLyrics) {
      const list = (await ask(`search?${q}`)) as Hit[] | null;
      const usable = (Array.isArray(list) ? list : []).filter((h) => h.syncedLyrics || h.plainLyrics);
      const close = duration ? usable.filter((h) => Math.abs((h.duration ?? 0) - duration) <= 8) : usable;
      hit = close.find((h) => h.syncedLyrics) ?? close[0] ?? null;
    }
  } catch {
    return null; // a network hiccup is not "no lyrics": don't remember it
  }

  const result: Lyrics | null =
    hit && (hit.syncedLyrics || hit.plainLyrics)
      ? {
          synced: hit.syncedLyrics ? parseLrc(hit.syncedLyrics) : [],
          plain: (hit.plainLyrics ?? parseLrc(hit.syncedLyrics ?? "").map((l) => l.text).join("\n")).trim(),
        }
      : null;
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
