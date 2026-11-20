import { create } from "zustand";
import { getT } from "../i18n";
import { applyPlaybackSpeed, usePlayer } from "../player/player";
import { useUi } from "./ui";

export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
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

  return {
    speed: initial,
    sleep: null,
    sleepAt: null,
    sleepTrack: null,
    setSpeed: (v) => {
      applyPlaybackSpeed(v);
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
