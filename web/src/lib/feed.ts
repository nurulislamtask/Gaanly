/**
 * What Home is made of. Everything is found by searching YouTube Music (plus the YouTube / Spotify chart shelves the
 * server builds), so it works on every platform and always has fresh songs. The artists and moods are shuffled by a
 * seed (the day, plus a counter the refresh button bumps) so Home looks different every time you come back.
 */

export const CHIPS = ["all", "bangla", "hindi", "english", "punjabi", "kpop", "romantic", "chill", "workout", "party"] as const;
export type Chip = (typeof CHIPS)[number];

export type ShelfDef =
  | { kind: "discover"; id: string }
  | { kind: "songs"; key: string; query: string; title: { type: "new" | "old" | "hits" | "mood" | "artist"; text: string } };

const ARTISTS: Record<string, string[]> = {
  bangla: ["Anupam Roy", "Habib Wahid", "Tahsan", "James", "Minar Rahman", "Ayub Bachchu", "Warfaze", "Artcell", "Arijit Singh", "Shreya Ghoshal", "Kishore Kumar", "Nancy", "Imran Mahmudul", "Pritom Hasan", "Bhoomi", "Hemanta Mukherjee"],
  hindi: ["Arijit Singh", "Atif Aslam", "Neha Kakkar", "Badshah", "Jubin Nautiyal", "Shreya Ghoshal", "Sonu Nigam", "Pritam", "A. R. Rahman", "Darshan Raval", "Kumar Sanu", "Lata Mangeshkar", "Kishore Kumar", "Mohit Chauhan", "Armaan Malik"],
  english: ["Taylor Swift", "The Weeknd", "Ed Sheeran", "Dua Lipa", "Coldplay", "Billie Eilish", "Imagine Dragons", "Drake", "Bruno Mars", "Post Malone", "Adele", "Eminem", "Justin Bieber", "Ariana Grande", "Harry Styles", "Queen", "Michael Jackson"],
  punjabi: ["Diljit Dosanjh", "AP Dhillon", "Sidhu Moose Wala", "Karan Aujla", "Guru Randhawa", "Jazzy B", "Amrinder Gill", "Sharry Mann"],
  kpop: ["BTS", "BLACKPINK", "NewJeans", "Stray Kids", "TWICE", "IVE", "aespa", "SEVENTEEN", "Jungkook"],
};

const MOODS: Record<string, string[]> = {
  romantic: ["romantic songs", "love songs", "slow love songs", "sad love songs", "wedding songs", "heartbreak songs"],
  chill: ["lofi chill beats", "acoustic chill songs", "relaxing songs", "late night songs", "rainy day songs", "sleep music"],
  workout: ["gym workout music", "running songs", "motivation songs", "EDM workout", "hip hop workout"],
  party: ["party songs", "dance hits", "club hits", "wedding dance songs", "road trip songs"],
};

const LANG_WORD: Record<string, string> = { bangla: "Bangla", hindi: "Hindi", english: "English", punjabi: "Punjabi", kpop: "K-pop" };

/** A small seeded random generator, so the same seed gives the same Home. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: T[], n: number, rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}

const KEY = "gaanly:feedSeed";

/** Today's seed, plus how many times the person asked for a refresh today. */
export function currentSeed(): number {
  const d = new Date();
  const day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  let bump = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { day: number; bump: number } | null;
    if (saved?.day === day) bump = saved.bump;
  } catch {
    /* storage unavailable */
  }
  return day * 100 + bump;
}

export function bumpSeed(): number {
  const seed = currentSeed();
  const day = Math.floor(seed / 100);
  const bump = (seed % 100) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, bump }));
  } catch {
    /* storage unavailable */
  }
  return day * 100 + bump;
}

export function feedFor(chip: Chip, seed: number): ShelfDef[] {
  const rand = rng(seed * 31 + CHIPS.indexOf(chip));
  const songs = (key: string, query: string, type: "new" | "old" | "hits" | "mood" | "artist", text: string): ShelfDef => ({
    kind: "songs",
    key,
    query,
    title: { type, text },
  });

  if (chip === "all") {
    const langs = pick(["bangla", "hindi", "english", "punjabi", "kpop"], 3, rand);
    const shelves: ShelfDef[] = [
      { kind: "discover", id: "yt-trending" },
      { kind: "discover", id: "sp-global" },
      { kind: "discover", id: "yt-new" },
      { kind: "discover", id: "sp-hits" },
    ];
    for (const l of langs) {
      shelves.push(songs(`new-${l}`, `${LANG_WORD[l]} new songs 2026`, "new", LANG_WORD[l]!));
    }
    for (const a of pick(Object.values(ARTISTS).flat(), 5, rand)) shelves.push(songs(`a-${a}`, `${a} best songs`, "artist", a));
    shelves.push({ kind: "discover", id: "sp-india" });
    for (const l of langs) shelves.push(songs(`old-${l}`, `${LANG_WORD[l]} old classic songs`, "old", LANG_WORD[l]!));
    return shelves;
  }

  if (MOODS[chip]) {
    return pick(MOODS[chip]!, 6, rand).map((q) => songs(`m-${q}`, q, "mood", q[0]!.toUpperCase() + q.slice(1)));
  }

  const word = LANG_WORD[chip]!;
  const shelves: ShelfDef[] = [
    songs("new", `${word} new songs 2026`, "new", word),
    songs("hits", `${word} hit songs`, "hits", word),
  ];
  for (const a of pick(ARTISTS[chip] ?? [], 6, rand)) shelves.push(songs(`a-${a}`, `${a} best songs`, "artist", a));
  shelves.push(songs("old", `${word} old classic songs`, "old", word));
  shelves.push(songs("romantic", `${word} romantic songs`, "mood", `${word} romantic`));
  return shelves;
}
