import { create } from "zustand";
import { getT } from "../i18n";
import { setSoundEffects } from "../player/effects";
import { applyPlaybackSpeed, audioElement, setFadeLevel, usePlayer } from "../player/player";
import { useUi } from "./ui";

export const EFFECTS = ["off", "slowed", "nightcore", "bass", "reverb", "dream"] as const;
export type Effect = (typeof EFFECTS)[number];
/** What each effect does: speed with the pitch following it, bass boost in dB, reverb amount. */
const RECIPE: Record<Effect, { rate: number | null; bass: number; reverb: number }> = {
  off: { rate: null, bass: 0, reverb: 0 },
  slowed: { rate: 0.85, bass: 0, reverb: 0 },
  nightcore: { rate: 1.25, bass: 0, reverb: 0 },
  bass: { rate: null, bass: 9, reverb: 0 },
  reverb: { rate: null, bass: 0, reverb: 0.4 },
  dream: { rate: 0.88, bass: 0, reverb: 0.5 },
};
export const FADES = [0, 3, 6] as const;

export const SPEEDS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2] as const;
/** Minutes, or "end" to stop when the current song finishes. */
export const SLEEP_OPTIONS = [15, 30, 45, 60, "end"] as const;
export type Sleep = (typeof SLEEP_OPTIONS)[number];

const KEY = "gaanly:speed";

function savedSpeed(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return (SPEEDS as readonly number[]).includes(v) ? v : 1;
  } catch {
    return 1;
  }
}

interface ListeningState {
  speed: number;
  /** With a changed speed: keep the voice's pitch (true) or let it follow the speed ("chipmunk" / "slowed"). */
  keepPitch: boolean;
  togglePitch: () => void;
  effect: Effect;
  /** Seconds of fade at the start and end of each song (0 = off). */
  fade: number;
  /** Returns false when this device can't apply the effect. */
  setEffect: (v: Effect) => boolean;
  cycleEffect: () => boolean;
  cycleFade: () => void;
  sleep: Sleep | null;
  /** When the minutes timer fires (ms since epoch). */
  sleepAt: number | null;
  /** The song the "end of song" timer is waiting for. */
  sleepTrack: string | null;
  setSpeed: (v: number) => void;
  cycleSpeed: () => void;
  setSleep: (v: Sleep | null) => void;
}

let timer: ReturnType<typeof setInterval> | undefined;

export const useListening = create<ListeningState>((set, get) => {
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const fire = () => {
    stop();
    set({ sleep: null, sleepAt: null, sleepTrack: null });
    const p = usePlayer.getState();
    if (p.status === "playing" || p.status === "loading") p.toggle();
    useUi.getState().toast?.(getT().listen.sleepDone);
  };
  const tick = () => {
    const { sleepAt, sleepTrack } = get();
    if (sleepAt && Date.now() >= sleepAt) return fire();
    if (sleepTrack) {
      const p = usePlayer.getState();
      const current = p.queue[p.index]?.id;
      // The song changed, or the last second of it: stop here.
      if (current !== sleepTrack || (p.duration > 0 && p.duration - p.position < 1)) fire();
    }
  };

  const initial = savedSpeed();
  applyPlaybackSpeed(initial);

  // Fade: a smooth ramp down at the end of a song and up at the start of the next.
  let fading = false;
  setInterval(() => {
    const { fade } = get();
    if (!fade) {
      if (fading) setFadeLevel(1);
      fading = false;
      return;
    }
    const p = usePlayer.getState();
    if (p.status !== "playing" || p.duration <= 0) return;
    fading = true;
    const level = Math.min(1, p.position / fade + 0.1, (p.duration - p.position) / fade);
    setFadeLevel(Math.max(0.05, level));
  }, 150);

  return {
    speed: initial,
    keepPitch: true,
    togglePitch: () => {
      const keepPitch = !get().keepPitch;
      set({ keepPitch });
      if (get().effect === "off") applyPlaybackSpeed(get().speed, keepPitch);
    },
    effect: "off",
    fade: (() => {
      try {
        const v = Number(localStorage.getItem("gaanly:fade"));
        return (FADES as readonly number[]).includes(v) ? v : 0;
      } catch {
        return 0;
      }
    })(),
    setEffect: (v) => {
      const r = RECIPE[v];
      if (!setSoundEffects(audioElement(), r.bass, r.reverb)) return false;
      applyPlaybackSpeed(r.rate ?? get().speed, r.rate === null);
      set({ effect: v });
      return true;
    },
    cycleEffect: () => {
      // Step to the next effect this device can apply; unsupported ones are skipped, so "off" is always reachable.
      const start = EFFECTS.indexOf(get().effect);
      for (let step = 1; step <= EFFECTS.length; step++) {
        if (get().setEffect(EFFECTS[(start + step) % EFFECTS.length]!)) return true;
      }
      return false;
    },
    cycleFade: () => {
      const next = FADES[(FADES.indexOf(get().fade as (typeof FADES)[number]) + 1) % FADES.length]!;
      try {
        localStorage.setItem("gaanly:fade", String(next));
      } catch {
        /* storage unavailable */
      }
      set({ fade: next });
    },
    sleep: null,
    sleepAt: null,
    sleepTrack: null,
    setSpeed: (v) => {
      if (get().effect === "off") applyPlaybackSpeed(v, get().keepPitch);
      try {
        localStorage.setItem(KEY, String(v));
      } catch {
        /* storage unavailable */
      }
      set({ speed: v });
    },
    cycleSpeed: () => {
      const i = SPEEDS.indexOf(get().speed as (typeof SPEEDS)[number]);
      get().setSpeed(SPEEDS[(i + 1) % SPEEDS.length]!);
    },
    setSleep: (v) => {
      stop();
      if (v === null) return set({ sleep: null, sleepAt: null, sleepTrack: null });
      const p = usePlayer.getState();
      set({
        sleep: v,
        sleepAt: v === "end" ? null : Date.now() + v * 60_000,
        sleepTrack: v === "end" ? (p.queue[p.index]?.id ?? null) : null,
      });
      timer = setInterval(tick, 500);
    },
  };
});
