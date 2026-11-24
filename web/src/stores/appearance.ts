import { create } from "zustand";
import { accentCss, DEFAULT_ACCENT, isHex } from "../lib/accent";

/** How the app looks and what it shows, per device. The Now Playing panel lives in the UI store (it has a button too). */
export interface Appearance {
  accent: string;
  /** Surface colours: "ocean" is Gaanly's own. */
  palette: Palette;
  sidebarPlaylists: boolean;
  compactSidebar: boolean;
  albumColumn: boolean;
  texture: boolean;
  glass: boolean;
  /** Take the accent colour from the playing song's cover. */
  dynamic: boolean;
  homeShortcuts: boolean;
  homeRecent: boolean;
  homeFavorites: boolean;
}

export const PALETTES = ["ocean", "midnight", "graphite", "plum", "forest", "sunset", "crimson", "mocha", "slate", "teal", "rose", "indigo", "cyan", "amber", "lime", "violet", "ice"] as const;
export type Palette = (typeof PALETTES)[number];

export const DEFAULT_APPEARANCE: Appearance = {
  accent: DEFAULT_ACCENT,
  palette: "ocean",
  dynamic: false,
  sidebarPlaylists: true,
  compactSidebar: false,
  albumColumn: true,
  texture: false,
  glass: false,
  homeShortcuts: true,
  homeRecent: true,
  homeFavorites: true,
};

/** Ready-made accents. "lagoon" is Gaanly's own. */
export const ACCENTS = [
  { id: "lagoon", color: DEFAULT_ACCENT },
  { id: "mint", color: "#34d399" },
  { id: "aqua", color: "#22d3ee" },
  { id: "sky", color: "#60a5fa" },
  { id: "violet", color: "#a78bfa" },
  { id: "pink", color: "#f472b6" },
  { id: "coral", color: "#fb7c5c" },
  { id: "amber", color: "#fbbf24" },
] as const;

const KEY = "gaanly:appearance2";
// The accent CSS itself, so index.html can apply it before the app loads (no flash of the default colour).
const CSS_KEY = "gaanly:accent-css";

/** Keeps only known keys with the right types: the value may come from an old version or a backup file. */
export function cleanAppearance(input: unknown): Appearance {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Appearance = { ...DEFAULT_APPEARANCE };
  if (isHex(v.accent)) out.accent = v.accent.toLowerCase();
  if ((PALETTES as readonly unknown[]).includes(v.palette)) out.palette = v.palette as Palette;
  for (const k of Object.keys(DEFAULT_APPEARANCE) as (keyof Appearance)[]) {
    if (k !== "accent" && k !== "palette" && typeof v[k] === "boolean") (out[k] as boolean) = v[k];
  }
  return out;
}

function read(): Appearance {
  try {
    return cleanAppearance(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/** Applies what CSS needs: the accent colours and switches read by stylesheets (compact rail, texture, glass). */
function apply(a: Appearance) {
  const root = document.documentElement;
  const custom = a.accent !== DEFAULT_ACCENT;
  let style = document.getElementById("gaanly-accent");
  if (custom) {
    style ??= Object.assign(document.createElement("style"), { id: "gaanly-accent" });
    style.textContent = accentCss(a.accent);
    document.head.appendChild(style);
  } else {
    style?.remove();
  }
  if (a.palette === "ocean") delete root.dataset.palette;
  else root.dataset.palette = a.palette;
  if (a.compactSidebar) root.dataset.rail = "compact";
  else delete root.dataset.rail;
  if (a.texture) delete root.dataset.texture;
  else root.dataset.texture = "off";
  if (a.glass) delete root.dataset.glass;
  else root.dataset.glass = "off";
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
    if (custom) localStorage.setItem(CSS_KEY, accentCss(a.accent));
    else localStorage.removeItem(CSS_KEY);
  } catch {
    /* private mode */
  }
}

interface AppearanceState extends Appearance {
  set: (patch: Partial<Appearance>) => void;
  reset: () => void;
}

const initial = read();
apply(initial);

export const useAppearance = create<AppearanceState>((set, get) => ({
  ...initial,
  set: (patch) => {
    const { set: _s, reset: _r, ...current } = get();
    const next = cleanAppearance({ ...current, ...patch });
    apply(next);
    set(next);
  },
  reset: () => {
    apply(DEFAULT_APPEARANCE);
    set({ ...DEFAULT_APPEARANCE });
  },
}));

/** The current preferences without the store's functions (for backups). */
export function currentAppearance(): Appearance {
  const { set: _s, reset: _r, ...a } = useAppearance.getState();
  return a;
}
