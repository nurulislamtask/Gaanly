import { CheckIcon, DownloadSimpleIcon, GaugeIcon, MoonStarsIcon, SlidersIcon, SlidersHorizontalIcon, WaveformIcon } from "@phosphor-icons/react";
import { useT } from "../i18n";
import { cn } from "../lib/format";
import { offlineSupported, useOffline } from "../lib/offline";
import { selectCurrent, usePlayer } from "../player/player";
import { useEqualizer } from "../stores/equalizer";
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
  const keepPitch = useListening((s) => s.keepPitch);
  const togglePitch = useListening((s) => s.togglePitch);
  const eqOn = useEqualizer((s) => s.enabled);
  const openEq = useEqualizer((s) => s.setOpen);
  const sleep = useListening((s) => s.sleep);
  const setSleep = useListening((s) => s.setSleep);
  const toast = useUi((s) => s.toast);
  const effect = useListening((s) => s.effect);
  const cycleEffect = useListening((s) => s.cycleEffect);
  const fade = useListening((s) => s.fade);
  const cycleFade = useListening((s) => s.cycleFade);
  const track = usePlayer(selectCurrent);
  const saved = useOffline((s) => (track ? s.tracks.some((x) => x.id === track.id) : false));
  const busy = useOffline((s) => (track ? s.busy.includes(track.id) : false));
  const download = useOffline((s) => s.download);
  const remove = useOffline((s) => s.remove);

  const label = (v: (typeof SLEEP_OPTIONS)[number]) => (v === "end" ? t.listen.sleepEnd : t.listen.sleepMinutes(v));
  const nextSleep = () => {
    const i = sleep === null ? -1 : SLEEP_OPTIONS.indexOf(sleep);
    const next = i + 1 >= SLEEP_OPTIONS.length ? null : SLEEP_OPTIONS[i + 1]!;
    setSleep(next);
    toast(next === null ? t.listen.sleepCancelled : t.listen.sleepSet(label(next)));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button type="button" onClick={cycleSpeed} aria-label={t.listen.speedX(String(speed))} title={t.listen.speed} className={pill(speed !== 1)}>
        <GaugeIcon size={16} /> {speed}x
      </button>
      {speed !== 1 && (
        <button type="button" onClick={togglePitch} className={pill(!keepPitch)}>
          {keepPitch ? t.listen.pitchKept : t.listen.pitchFollows}
        </button>
      )}
      <button type="button" onClick={() => openEq(true)} className={pill(eqOn)}>
        <SlidersHorizontalIcon size={16} /> {t.listen.equalizer}
      </button>
      <button type="button" onClick={nextSleep} aria-label={sleep === null ? t.listen.sleepOff : t.listen.sleepSet(label(sleep))} title={t.listen.sleep} className={pill(sleep !== null)}>
        <MoonStarsIcon size={16} /> {sleep === null ? t.listen.sleep : label(sleep)}
      </button>
      <button
        type="button"
        onClick={() => {
          if (!cycleEffect()) toast(t.listen.effectUnsupported, "error");
        }}
        title={t.listen.effects}
        className={pill(effect !== "off")}
      >
        <SlidersIcon size={16} /> {t.listen.effectNames[effect]}
      </button>
      <button type="button" onClick={cycleFade} title={t.listen.fade} className={pill(fade > 0)}>
        <WaveformIcon size={16} /> {fade ? t.listen.fadeSeconds(fade) : t.listen.fadeOff}
      </button>
      {track && offlineSupported && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (saved) return void remove(track.id);
            download(track).then(
              () => toast(t.listen.downloadDone(track.title)),
              (e: Error) => toast(`${t.listen.downloadFailed} (${e?.message ?? ""})`.slice(0, 160), "error"),
            );
          }}
          className={pill(saved)}
        >
          {saved ? <CheckIcon size={16} weight="bold" /> : <DownloadSimpleIcon size={16} />}{" "}
          {busy ? t.listen.downloading : saved ? t.listen.downloaded : t.listen.download}
        </button>
      )}
    </div>
  );
}

/** A one-tap download (or "downloaded") icon for the current song. */
export function DownloadButton({ className }: { className?: string }) {
  const t = useT();
  const toast = useUi((s) => s.toast);
  const track = usePlayer(selectCurrent);
  const saved = useOffline((s) => (track ? s.tracks.some((x) => x.id === track.id) : false));
  const busy = useOffline((s) => (track ? s.busy.includes(track.id) : false));
  const download = useOffline((s) => s.download);
  const remove = useOffline((s) => s.remove);
  if (!track || !offlineSupported) return null;
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={saved ? t.listen.removeDownload : t.listen.download}
      title={saved ? t.listen.removeDownload : t.listen.download}
      onClick={() => {
        if (saved) return void remove(track.id);
        download(track).then(
          () => toast(t.listen.downloadDone(track.title)),
          (e: Error) => toast(`${t.listen.downloadFailed} (${e?.message ?? ""})`.slice(0, 160), "error"),
        );
      }}
      className={cn("grid size-10 place-items-center rounded-full transition-colors active:scale-90", saved ? "text-accent-text" : "text-fg-2 hover:text-fg", busy && "animate-pulse", className)}
    >
      {saved ? <CheckIcon size={22} weight="bold" /> : <DownloadSimpleIcon size={22} />}
    </button>
  );
}
