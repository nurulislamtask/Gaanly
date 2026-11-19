// Made-up music for the README screenshots: invented artists, albums and covers, so no real artwork or names
// are used. The server below answers the same /api/* routes as the real Gaanly server.
const ARTISTS = [
  { id: "UCneonharbor0000000001", name: "Neon Harbor" },
  { id: "UClunapark00000000002", name: "Luna Park" },
  { id: "UCatlasivy0000000003", name: "Atlas & Ivy" },
  { id: "UCpapersat0000000004", name: "Paper Satellites" },
  { id: "UCvelvetstat000000005", name: "Velvet Static" },
  { id: "UCquiethours00000006", name: "The Quiet Hours" },
];

const ALBUMS = [
  { id: "MPREmidnighttransit1", title: "Midnight Transit", artist: 0, year: "2025", songs: ["Last Train Home", "Glass Avenue", "Afterglow", "Paper Moon", "Slow Signal", "Harbor Lights", "Static Bloom", "Blue Hour", "Runaway Sun", "Closing Credits"] },
  { id: "MPREsoftcollapse0002", title: "Soft Collapse", artist: 3, year: "2024", songs: ["Orbit", "Weightless", "Small Hours", "Satellite Eyes", "Drift", "Everything Hums"] },
  { id: "MPREgoldenhour000003", title: "Golden Hour Tapes", artist: 1, year: "2023", songs: ["Sunday Light", "Peach Season", "Window Seat", "Slow Dance Kitchen", "Honey", "Lemonade Sky"] },
  { id: "MPREnightbloom000004", title: "Night Bloom", artist: 4, year: "2025", songs: ["Violet", "Neon Rain", "Tidal", "Velvet Hour", "Afterimage", "Low Light"] },
  { id: "MPREquietroom0000005", title: "The Quiet Room", artist: 5, year: "2022", songs: ["Hush", "Cedar", "Lantern", "Open Window", "Kindred"] },
  { id: "MPREfieldnotes000006", title: "Field Notes", artist: 2, year: "2024", songs: ["Ivy", "Atlas", "Switchback", "North Fork", "Long Way Round", "Campfire"] },
];

const GENRES = ["Indie & alternative", "Pop", "Electronic", "Chill", "Focus", "Hip-hop", "Rock", "Jazz"].map((name, i) => ({ id: `genre-${i}`, name }));

let n = 0;
const tracks = [];
ALBUMS.forEach((album, ai) => {
  album.songs.forEach((title, si) => {
    n++;
    tracks.push({
      id: `mock${String(n).padStart(7, "0")}`,
      title,
      artist: ARTISTS[album.artist].name,
      album: album.title,
      duration: 158 + ((n * 37) % 110),
      thumb: `/mock/cover/${ai}.svg`,
      art: `/mock/cover/${ai}.svg`,
      kind: "song",
      _album: ai,
    });
  });
});
const strip = ({ _album, ...t }) => t;
export const allTracks = tracks.map(strip);
const byAlbum = (ai) => tracks.filter((t) => t._album === ai).map(strip);

const card = (ai) => ({ id: ALBUMS[ai].id, title: ALBUMS[ai].title, artist: ARTISTS[ALBUMS[ai].artist].name, year: ALBUMS[ai].year, thumb: `/mock/cover/${ai}.svg`, art: `/mock/cover/${ai}.svg` });

const pick = (ids) => ids.map((i) => allTracks[i]);
export const library = {
  favorites: pick([0, 2, 5, 11, 14, 19, 23, 27]),
  history: pick([1, 8, 12, 16, 21, 25, 3, 18, 29, 6]),
  playlists: [
    { id: "pl1", name: "Late night drive", createdAt: 1, updatedAt: 5, tracks: pick([0, 1, 2, 3, 4, 5, 6, 7]) },
    { id: "pl2", name: "Focus", createdAt: 2, updatedAt: 4, tracks: pick([10, 11, 12, 13, 14, 15]) },
    { id: "pl3", name: "Sunday morning", createdAt: 3, updatedAt: 3, tracks: pick([16, 17, 18, 19, 20]) },
    { id: "pl4", name: "Workout", createdAt: 4, updatedAt: 2, tracks: pick([22, 23, 24, 25, 26, 27, 28]) },
  ],
};

const palettes = [[258, 330], [200, 160], [32, 350], [280, 210], [170, 250], [340, 28]];
/** An abstract album cover: soft gradient, a big circle and a few arcs. */
export function coverSvg(i) {
  const [a, b] = palettes[i % palettes.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a} 78% 52%)"/><stop offset="1" stop-color="hsl(${b} 82% 46%)"/></linearGradient>
<radialGradient id="s" cx="0.3" cy="0.25" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="400" fill="url(#g)"/><rect width="400" height="400" fill="url(#s)"/>
<circle cx="${150 + (i * 47) % 120}" cy="${170 + (i * 31) % 90}" r="${96 + (i * 13) % 40}" fill="hsl(${b} 90% 78%)" opacity="0.88"/>
<circle cx="${290 - (i * 29) % 70}" cy="${110 + (i * 17) % 60}" r="54" fill="hsl(${a} 95% 88%)" opacity="0.7"/>
<path d="M0 ${300 + (i * 9) % 30} Q 100 ${240 + (i * 11) % 40} 200 ${300 + (i * 7) % 30} T 400 ${280 + (i * 5) % 40} V400 H0Z" fill="hsl(${a} 60% 22%)" opacity="0.55"/>
</svg>`;
}

export function silentWav(seconds = 214) {
  const rate = 8000;
  const size = rate * seconds;
  const buf = Buffer.alloc(44 + size, 0x80);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + size, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(size, 40);
  return buf;
}

const genreArtists = ARTISTS.map((a, i) => ({
  id: a.id,
  name: a.name,
  thumb: `/mock/cover/${i}.svg`,
  art: `/mock/cover/${i}.svg`,
  hits: ALBUMS[i].songs.slice(0, 3),
}));

/** Returns [status, body] for a /api path, or null when the path isn't one. */
export function api(method, url) {
  const u = new URL(url, "http://x");
  const p = u.pathname;
  const q = (u.searchParams.get("q") ?? "").toLowerCase();
  if (p === "/api/library") return library;
  if (p === "/api/system")
    return { ytdlp: { path: "/usr/bin/yt-dlp", version: "2026.11.01", channel: "stable", latest: { stable: "2026.11.01", nightly: "2026.11.12" }, updateAvailable: false }, deno: "2.1.4", ffmpeg: "7.1", canInstall: false, job: null };
  if (p === "/api/search") {
    const hits = q ? allTracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q)) : allTracks;
    return { tracks: (hits.length ? hits : allTracks).slice(0, 14) };
  }
  if (p === "/api/suggest") return { suggestions: ["midnight transit", "midnight drive", "midnight city lights"] };
  if (p === "/api/search/albums") return { albums: ALBUMS.map((_, i) => card(i)).slice(0, 6) };
  if (p === "/api/genres") return { genres: GENRES };
  let m;
  if ((m = p.match(/^\/api\/genres\/([^/]+)\/artists$/))) return { artists: genreArtists, hasMore: false };
  if ((m = p.match(/^\/api\/genres\/([^/]+)$/))) {
    const g = GENRES.find((x) => x.id === decodeURIComponent(m[1])) ?? GENRES[0];
    return { id: g.id, name: g.name, artists: genreArtists, hasMoreArtists: false, tracks: allTracks.slice(0, 12) };
  }
  if ((m = p.match(/^\/api\/albums\/([^/]+)$/))) {
    const ai = Math.max(0, ALBUMS.findIndex((a) => a.id === decodeURIComponent(m[1])));
    const a = ALBUMS[ai];
    return { id: a.id, title: a.title, artist: ARTISTS[a.artist].name, artistId: ARTISTS[a.artist].id, kind: `Album • ${a.year}`, info: `${a.songs.length} songs • ${Math.round(a.songs.length * 3.6)} minutes`, thumb: `/mock/cover/${ai}.svg`, art: `/mock/cover/${ai}.svg`, tracks: byAlbum(ai) };
  }
  if ((m = p.match(/^\/api\/artists\/([^/]+)$/))) {
    const i = Math.max(0, ARTISTS.findIndex((a) => a.id === decodeURIComponent(m[1])));
    return { id: ARTISTS[i].id, name: ARTISTS[i].name, description: "", banner: `/mock/cover/${i}.svg`, tracks: byAlbum(i).slice(0, 5), albums: [card(i)], singles: [] };
  }
  if (p.startsWith("/api/radio/")) return { tracks: allTracks.slice(4, 14) };
  if (p.startsWith("/api/video-for/")) return { track: null };
  if ((m = p.match(/^\/api\/prepare\/([^/]+)$/))) {
    const t = allTracks.find((x) => x.id === m[1]) ?? allTracks[0];
    return { id: t.id, title: t.title, duration: t.duration, hasSdVideo: false };
  }
  if (p === "/api/history") return { history: library.history };
  if (p.startsWith("/api/favorites")) return { favorites: library.favorites };
  return null;
}
