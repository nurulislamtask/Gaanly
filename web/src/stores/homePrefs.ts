import { create } from "zustand";

/** What the person wants on Home: the languages and singers to show, and which playlists sit in the shortcut row. */
interface HomePrefsState {
  /** Feed language ids (see lib/feed.ts). Empty means "everything". */
  languages: string[];
  /** Singers and bands to build shelves for. */
  artists: string[];
  /** Playlist ids for the shortcut row; null keeps the default (the first six). */
  playlistIds: string[] | null;
  tuneOpen: boolean;
  setLanguages: (v: string[]) => void;
  setArtists: (v: string[]) => void;
  setPlaylistIds: (v: string[] | null) => void;
  clearFilters: () => void;
  setTuneOpen: (open: boolean) => void;
}

const KEY = "gaanly:homePrefs";

interface Saved {
  languages: string[];
  artists: string[];
  playlistIds: string[] | null;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 60) : []);

function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    return { languages: strings(v.languages), artists: strings(v.artists), playlistIds: v.playlistIds == null ? null : strings(v.playlistIds) };
  } catch {
    return { languages: [], artists: [], playlistIds: null };
  }
}

export const useHomePrefs = create<HomePrefsState>((set, get) => {
  const save = (patch: Partial<Saved>) => {
    const { languages, artists, playlistIds } = { ...get(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify({ languages, artists, playlistIds }));
    } catch {
      /* storage unavailable */
    }
    set(patch);
  };
  return {
    ...read(),
    tuneOpen: false,
    setLanguages: (languages) => save({ languages }),
    setArtists: (artists) => save({ artists }),
    setPlaylistIds: (playlistIds) => save({ playlistIds }),
    clearFilters: () => save({ languages: [], artists: [] }),
    setTuneOpen: (tuneOpen) => set({ tuneOpen }),
  };
});

export const isFiltering = (s: { languages: string[]; artists: string[] }) => s.languages.length > 0 || s.artists.length > 0;
