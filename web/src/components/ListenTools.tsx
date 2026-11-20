import { GaugeIcon, MoonStarsIcon } from "@phosphor-icons/react";
import { useT } from "../i18n";
import { cn } from "../lib/format";
import { SLEEP_OPTIONS, useListening } from "../stores/listening";
import { useUi } from "../stores/ui";

const pill = (on: boolean) =>
  cn(
    "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors active:scale-95",
    on ? "bg-accent-soft text-accent-text ring-accent/40" : "text-fg-2 ring-line hover:text-fg",
  );

/** Playback speed and the sleep timer: tap to step through the choices. */
export function ListenTools({ className }: { className?: string }) {
  const t = useT();
  const speed = useListening((s) => s.speed);
  const cycleSpeed = useListening((s) => s.cycleSpeed);
  const sleep = useListening((s) => s.sleep);
  const setSleep = useListening((s) => s.setSleep);
  const toast = useUi((s) => s.toast);

  const label = (v: (typeof SLEEP_OPTIONS)[number]) => (v === "end" ? t.listen.sleepEnd : t.listen.sleepMinutes(v));
  const nextSleep = () => {
    const i = sleep === null ? -1 : SLEEP_OPTIONS.indexOf(sleep);
    const next = i + 1 >= SLEEP_OPTIONS.length ? null : SLEEP_OPTIONS[i + 1]!;
    setSleep(next);
    toast(next === null ? t.listen.sleepCancelled : t.listen.sleepSet(label(next)));
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" onClick={cycleSpeed} aria-label={t.listen.speedX(String(speed))} title={t.listen.speed} className={pill(speed !== 1)}>
        <GaugeIcon size={16} /> {speed}x
      </button>
      <button type="button" onClick={nextSleep} aria-label={sleep === null ? t.listen.sleepOff : t.listen.sleepSet(label(sleep))} title={t.listen.sleep} className={pill(sleep !== null)}>
        <MoonStarsIcon size={16} /> {sleep === null ? t.listen.sleep : label(sleep)}
      </button>
    </div>
  );
}
