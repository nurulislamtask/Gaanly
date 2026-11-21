import { create } from "zustand";
import { setEqualizerBands } from "../player/effects";
import { audioElement, usePlayer } from "../player/player";

/** Set by the Android app: the phone's own equaliser (the web side can't reach the speaker mix there). */
export const nativeEq: { set?: (gains: number[]) => Promise<boolean> } = {};

export const PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
  vocal: [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1],
  rock: [5, 4, 2, -1, -2, -1, 2, 4, 5, 5],
  pop: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2],
  jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  electronic: [5, 4, 1, 0, -2, 2, 1, 3, 5, 5],
  hiphop: [6, 5, 2, 3, -1, -1, 1, -1, 2, 3],
  acoustic: [4, 4, 3, 1, 2, 2, 3, 3, 3, 2],
};
export type PresetId = keyof typeof PRESETS;

const KEY = "gaanly:eq";

interface EqState {
  enabled: boolean;
  preset: string;
  gains: number[];
  /** False when this device can't apply an equaliser (shown in the dialog). */
  supported: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  setEnabled: (v: boolean) => void;
  setPreset: (id: PresetId) => void;
  setGain: (band: number, db: number) => void;
}

function read(): { enabled: boolean; preset: string; gains: number[] } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { enabled?: unknown; preset?: unknown; gains?: unknown };
    const gains = Array.isArray(v.gains) && v.gains.length === 10 ? v.gains.map((g) => Math.max(-12, Math.min(12, Number(g) || 0))) : PRESETS.flat!;
    return { enabled: v.enabled === true, preset: typeof v.preset === "string" ? v.preset : "flat", gains };
  } catch {
    return { enabled: false, preset: "flat", gains: PRESETS.flat! };
  }
}

export const useEqualizer = create<EqState>((set, get) => {
  const apply = async () => {
    const { enabled, gains } = get();
    const g = enabled ? gains : PRESETS.flat!;
    const ok = nativeEq.set ? await nativeEq.set(g).catch(() => false) : setEqualizerBands(audioElement(), g);
    set({ supported: ok });
  };
  const save = (patch: Partial<Pick<EqState, "enabled" | "preset" | "gains">>) => {
    set(patch);
    const { enabled, preset, gains } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ enabled, preset, gains }));
    } catch {
      /* storage unavailable */
    }
    void apply();
  };

  // The browser can only build the equaliser once a song is loaded, so apply again whenever the song changes.
  let last: string | undefined;
  usePlayer.subscribe((s) => {
    const id = s.queue[s.index]?.id;
    if (id !== last) {
      last = id;
      if (get().enabled) setTimeout(() => void apply(), 400);
    }
  });

  return {
    ...read(),
    supported: true,
    open: false,
    setOpen: (open) => set({ open }),
    setEnabled: (enabled) => save({ enabled }),
    setPreset: (id) => save({ preset: id, gains: [...PRESETS[id]!], enabled: true }),
    setGain: (band, db) => save({ preset: "custom", gains: get().gains.map((g, i) => (i === band ? db : g)), enabled: true }),
  };
});
