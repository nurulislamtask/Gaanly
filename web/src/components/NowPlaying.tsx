import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  RadioIcon,
  VideoCameraSlashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "../i18n";
import { cn } from "../lib/format";
import type { Track } from "../lib/types";
import { selectCurrent, usePlayer, useStatusText } from "../player/player";
import { useUi, type PanelTab } from "../stores/ui";
import { Artwork } from "./Artwork";
import { FavoriteButton, ModeSwitch, Scrubber } from "./Controls";
import { IconButton } from "./IconButton";
import { DownloadButton, ListenTools } from "./ListenTools";
import { LyricsView } from "./LyricsView";
import { QueueList } from "./Queue";
import { SLOT, VideoSlot } from "./Video";

/** The phone's player controls: shuffle, previous, a big play button, next, repeat, all on one row. */
const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* no vibration motor */
  }
};

function PhoneControls() {
  const t = useT();
  const p = usePlayer((s) => s);
  const playing = p.status === "playing" || p.status === "loading";
  const side = "grid size-12 shrink-0 place-items-center rounded-full text-white/90 transition-transform active:scale-90";
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={() => (buzz(), p.toggleShuffle())} aria-label={p.shuffle ? t.player.shuffleOn : t.player.shuffleOff} className={cn(side, p.shuffle ? "text-accent-text" : "text-white/60")}>
        <ShuffleIcon size={22} />
      </button>
      <button type="button" onClick={() => (buzz(), p.prev())} aria-label={t.player.previous} className={side}>
        <SkipBackIcon size={30} weight="fill" />
      </button>
      <button
        type="button"
        onClick={() => (buzz(), p.toggle())}
        aria-label={playing ? t.common.pause : t.common.play}
        className={cn(
          "grid size-[72px] shrink-0 place-items-center bg-accent text-accent-ink shadow-[0_14px_34px_color-mix(in_srgb,var(--accent)_40%,transparent)] transition-[border-radius,transform] duration-300 active:scale-95",
          playing ? "rounded-full" : "rounded-[26px]",
        )}
      >
        {playing ? <PauseIcon size={32} weight="fill" /> : <PlayIcon size={32} weight="fill" />}
      </button>
      <button type="button" onClick={() => (buzz(), p.next())} aria-label={t.player.next} className={side}>
        <SkipForwardIcon size={30} weight="fill" />
      </button>
      <button
        type="button"
        onClick={() => (buzz(), p.cycleRepeat())}
        aria-label={p.repeat === "off" ? t.player.repeatOff : p.repeat === "one" ? t.player.repeatOne : t.player.repeatAll}
        className={cn(side, p.repeat !== "off" ? "text-accent-text" : "text-white/60")}
      >
        {p.repeat === "one" ? <RepeatOnceIcon size={22} /> : <RepeatIcon size={22} />}
      </button>
    </div>
  );
}

/** Artwork or the live video, with a soft ambient glow from the cover behind it. */
function Stage({ track, slot, className }: { track: Track; slot: number; className?: string }) {
  const t = useT();
  const showsVideo = usePlayer((s) => s.mediaKind === "video");
  const aspect = usePlayer((s) => s.videoAspect);
  // In Video mode on a song: say we're looking for its clip, or that it has none.
  const note = usePlayer((s) =>
    s.preferVideo ? (s.videoNote ?? (s.statusText === "findingClip" ? s.statusText : null)) : null,
  );
  if (showsVideo) {
    const portrait = aspect < 1;
    return (
      <div className="flex justify-center">
        <VideoSlot
          priority={slot}
          expandable
          className={cn("rounded-[16px]", portrait ? "h-[min(52dvh,560px)]" : "w-full")}
          style={{ aspectRatio: Math.min(16 / 9, Math.max(9 / 16, aspect)) }}
        />
      </div>
    );
  }
  return (
    <div className={cn("relative mx-auto aspect-square w-full", className)}>
      <img
        src={track.thumb}
        alt=""
        aria-hidden="true"
        className="absolute inset-[8%] h-[84%] w-[84%] scale-110 rounded-full object-cover opacity-50 blur-3xl"
      />
      <Artwork
        src={track.art}
        fallback={track.thumb}
        alt={t.nowPlaying.coverOf(track.title)}
        iconSize={48}
        className="relative size-full rounded-[18px] shadow-[0_24px_60px_rgb(0_0_0/0.45)]"
      />
      {note && (
        <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full bg-black/65 px-3 py-2 text-center text-[13px] font-medium text-white backdrop-blur-md">
          {note === "findingClip" ? (
            <MagnifyingGlassIcon size={16} className="shrink-0" />
          ) : (
            <VideoCameraSlashIcon size={16} className="shrink-0" />
          )}{" "}
          {note === "findingClip" ? t.player.status.findingClip : t.player.noClip}
        </span>
      )}
    </div>
  );
}

function TrackHeading({ track, large = false }: { track: Track; large?: boolean }) {
  const statusText = useStatusText();
  const status = usePlayer((s) => s.status);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h2 className={cn("truncate font-semibold tracking-tight", large ? "text-[22px] leading-tight" : "text-lg")}>{track.title}</h2>
        <p className={cn("truncate", large ? "text-base" : "text-sm", status === "error" ? "text-danger" : "text-fg-2")}>
          {statusText ?? [track.artist, track.album].filter(Boolean).join(" · ")}
        </p>
      </div>
      <DownloadButton />
      <FavoriteButton track={track} size={large ? "lg" : "md"} />
    </div>
  );
}

function PanelBody({ tab, slot }: { tab: PanelTab; slot: number }) {
  const track = usePlayer(selectCurrent);
  const startRadio = usePlayer((s) => s.startRadio);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const t = useT();

  if (tab === "queue") return <QueueList />;
  if (tab === "lyrics") return track ? <LyricsView className="h-[calc(100dvh-230px)]" /> : <p className="px-2 py-16 text-center text-sm text-fg-2">{t.nowPlaying.playSomething}</p>;
  if (!track) {
    return <p className="px-2 py-16 text-center text-sm text-fg-2">{t.nowPlaying.playSomething}</p>;
  }
  const nextUp = queue[index + 1];
  return (
    <div className="flex flex-col gap-5 px-1 pb-4">
      <Stage track={track} slot={slot} />
      <TrackHeading track={track} />
      <ModeSwitch />
      <ListenTools />
      <button
        type="button"
        onClick={() => void startRadio(track)}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-surface-1 text-sm font-medium ring-1 ring-line transition-colors hover:bg-surface-3 active:scale-[0.98]"
      >
        <RadioIcon size={18} /> {t.nowPlaying.startRadio}
      </button>
      {nextUp && (
        <div className="rounded-[14px] bg-surface-1 p-3 ring-1 ring-line">
          <p className="pb-2 text-xs font-medium text-fg-3">{t.nowPlaying.upNext}</p>
          <div className="flex items-center gap-3">
            <Artwork src={nextUp.thumb} className="size-10 rounded-[8px]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{nextUp.title}</p>
              <p className="truncate text-xs text-fg-2">{nextUp.artist}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelTabs({ tab, onTab }: { tab: PanelTab; onTab: (t: PanelTab) => void }) {
  const t = useT();
  return (
    <div role="tablist" className="flex gap-1">
      {(
        [
          ["playing", t.nowPlaying.tabPlaying],
          ["lyrics", t.listen.lyrics],
          ["queue", t.nowPlaying.tabQueue],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={tab === id}
          onClick={() => onTab(id)}
          className={cn(
            "h-9 rounded-full px-4 text-sm font-medium transition-colors",
            tab === id ? "bg-surface-4 text-fg" : "text-fg-2 hover:text-fg",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Docked right column (≥1280px). */
export function SidePanel() {
  const tab = useUi((s) => s.panelTab);
  const openPanel = useUi((s) => s.openPanel);
  const togglePanel = useUi((s) => s.togglePanel);
  const t = useT();
  return (
    <aside className="island hidden w-[360px] shrink-0 xl:flex" aria-label={t.nowPlaying.panel}>
      <div className="island-core flex w-full flex-col overflow-hidden">
        <div className="flex h-16 items-center justify-between px-3">
          <PanelTabs tab={tab} onTab={openPanel} />
          <IconButton label={t.nowPlaying.closePanel} size="sm" onClick={() => togglePanel(tab)}>
            <XIcon size={18} />
          </IconButton>
        </div>
        <div className="scroll-area flex-1 overflow-y-auto px-2">
          <PanelBody tab={tab} slot={SLOT.panel} />
        </div>
      </div>
    </aside>
  );
}

/** Same content as an overlay drawer for tablets and small laptops (768-1279px). */
export function PanelDrawer() {
  const open = useUi((s) => s.drawerOpen);
  const tab = useUi((s) => s.panelTab);
  const openPanel = useUi((s) => s.openPanel);
  const close = useUi((s) => s.closePanel);
  const reduce = useReducedMotion();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 hidden md:block xl:hidden">
          <motion.div className="absolute inset-0 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            aria-label={t.nowPlaying.panel}
            data-escape-closes
            initial={reduce ? { opacity: 0 } : { x: "105%" }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: "105%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="island drawer-top absolute right-2 bottom-2 flex w-[380px] max-w-[calc(100vw-16px)]"
          >
            <div className="island-core flex w-full flex-col overflow-hidden">
              <div className="flex h-16 items-center justify-between px-3">
                <PanelTabs tab={tab} onTab={openPanel} />
                <IconButton label={t.common.close} size="sm" onClick={close}>
                  <XIcon size={18} />
                </IconButton>
              </div>
              <div className="scroll-area flex-1 overflow-y-auto px-2">
                <PanelBody tab={tab} slot={SLOT.panel} />
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Full-screen Now Playing for phones. Drag down (or Back) to close. */
export function NowPlayingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const track = usePlayer(selectCurrent);
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const [view, setView] = useState<"player" | "queue" | "lyrics">("player");
  const showsVideo = usePlayer((s) => s.mediaKind === "video");
  const t = useT();

  return createPortal(
    <AnimatePresence onExitComplete={() => setView("player")}>
      {open && track && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t.nowPlaying.title}
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          drag="y"
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 700) onClose();
          }}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg md:hidden"
        >
          <img
            src={track.art || track.thumb}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-3xl"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg/30 via-bg/60 to-bg" />

          <div className="overlay-top relative flex flex-1 flex-col px-5">
            <div className="flex h-16 touch-none items-center gap-2" onPointerDown={(e) => drag.start(e)}>
              <IconButton label={t.common.close} onClick={onClose} className="size-11! rounded-full! bg-black/30 text-white ring-1 ring-white/20 backdrop-blur-md">
                <CaretDownIcon size={22} />
              </IconButton>
              <span className="mx-auto text-[11px] font-semibold tracking-[0.18em] text-white/80 uppercase">{t.nowPlaying.title}</span>
              <DownloadButton className="size-11! rounded-full bg-black/30 text-white ring-1 ring-white/20 backdrop-blur-md" />
              <IconButton
                label={view === "queue" ? t.nowPlaying.backToPlayer : t.nowPlaying.showQueue}
                active={view === "queue"}
                onClick={() => setView(view === "queue" ? "player" : "queue")}
                className="size-11! rounded-full! bg-black/30 text-white ring-1 ring-white/20 backdrop-blur-md"
              >
                <QueueIcon size={22} />
              </IconButton>
            </div>

            {view === "lyrics" ? (
              <>
                <LyricsView className="min-h-0 flex-1" full />
                <div className="flex items-center justify-center gap-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => setView("player")}
                    className="h-12 rounded-full bg-black/30 px-6 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md active:scale-95"
                  >
                    {t.nowPlaying.backToPlayer}
                  </button>
                </div>
              </>
            ) : view === "queue" ? (
              <div className="scroll-area -mx-3 flex-1 overflow-y-auto pb-6">
                <QueueList />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
                <div className="relative min-h-0 flex-1 touch-none" onPointerDown={(e) => drag.start(e)}>
                  <div className="absolute inset-0 grid place-items-center">
                    {showsVideo ? (
                      <Stage track={track} slot={SLOT.sheet} />
                    ) : (
                      <Artwork
                        src={track.art}
                        fallback={track.thumb}
                        alt={t.nowPlaying.coverOf(track.title)}
                        iconSize={48}
                        className="aspect-square h-full max-w-full rounded-[28px] shadow-[0_24px_60px_rgb(0_0_0/0.5)] ring-1 ring-white/10"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-2xl leading-tight font-bold tracking-tight text-white">{track.title}</h2>
                    <p className="mt-0.5 truncate text-base text-white/70">{[track.artist, track.album].filter(Boolean).join(" · ")}</p>
                  </div>
                  <FavoriteButton track={track} size="lg" />
                  <IconButton label={t.listen.lyrics} onClick={() => setView("lyrics")} className="size-11! rounded-full! bg-white/10 ring-1 ring-white/15">
                    <MicrophoneStageIcon size={22} />
                  </IconButton>
                </div>
                <Scrubber touch />
                <PhoneControls />
                <ModeSwitch />
                <ListenTools grid />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
