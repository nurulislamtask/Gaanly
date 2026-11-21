import { ShareNetworkIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { api } from "../lib/api";
import type { Lyrics } from "../lib/apiTypes";
import { cn } from "../lib/format";
import { quoteCard, shareImage } from "../lib/quoteCard";
import { useUi } from "../stores/ui";
import { selectCurrent, usePlayer } from "../player/player";

type State = { id: string; lyrics: Lyrics | null } | "loading";

/** Lyrics that follow the song: the current line is bright, the rest fade and blur with distance. Tap a line to jump there. */
export function LyricsView({ className }: { className?: string }) {
  const t = useT();
  const track = usePlayer(selectCurrent);
  const position = usePlayer((s) => s.position);
  const seek = usePlayer((s) => s.seek);
  const [state, setState] = useState<State>("loading");
  const toast = useUi((s) => s.toast);
  const [picked, setPicked] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLButtonElement | null)[]>([]);
  const id = track?.id;

  useEffect(() => {
    if (!track) return;
    setState("loading");
    const ctl = new AbortController();
    const forId = track.id;
    api.lyrics(track, ctl.signal).then(
      (lyrics) => setState({ id: forId, lyrics }),
      () => !ctl.signal.aborted && setState({ id: forId, lyrics: null }),
    );
    return () => ctl.abort();
    // Only a different song needs new lyrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => setPicked(null), [id]);

  const lyrics = state !== "loading" && state.id === id ? state.lyrics : null;
  const synced = lyrics?.synced ?? [];
  let active = -1;
  for (let i = 0; i < synced.length; i++) {
    if (synced[i]!.t <= position + 0.25) active = i;
    else break;
  }

  useEffect(() => {
    const el = lines.current[active];
    const parent = box.current;
    if (!el || !parent) return;
    parent.scrollTo({ top: el.offsetTop - parent.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [active]);

  if (state === "loading" || state.id !== id) {
    return <p className="px-2 py-16 text-center text-sm text-fg-2">{t.listen.loadingLyrics}</p>;
  }
  if (!lyrics || (!synced.length && !lyrics.plain)) {
    return <p className="px-2 py-16 text-center text-sm text-fg-2">{t.listen.noLyrics}</p>;
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={box} className="scroll-area relative flex-1 overflow-y-auto px-3 py-[30%] text-center">
        {synced.length ? (
          synced.map((l, i) => {
            const d = active < 0 ? i + 1 : Math.abs(i - active);
            return (
              <button
                key={i}
                ref={(el) => {
                  lines.current[i] = el;
                }}
                type="button"
                onClick={() => {
                  setPicked(i);
                  seek(l.t);
                }}
                style={{ filter: d === 0 ? "none" : `blur(${Math.min(3.5, d * 0.9)}px)`, opacity: d === 0 ? 1 : Math.max(0.28, 0.75 - d * 0.14) }}
                className={cn(
                  "block w-full py-2 text-balance transition-[filter,opacity,transform,color] duration-500",
                  d === 0 ? "scale-105 text-[22px] leading-snug font-bold text-accent-text" : "text-lg leading-snug font-semibold text-fg",
                )}
              >
                {l.text || "♪"}
              </button>
            );
          })
        ) : (
          lyrics.plain.split("\n").map((l, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPicked(i)}
              className={cn("block w-full py-1 text-[17px] leading-7 font-medium", picked === i ? "text-accent-text" : "text-fg")}
            >
              {l || "\u00a0"}
            </button>
          ))
        )}
      </div>
      {(() => {
        const line = synced.length ? synced[picked ?? Math.max(active, 0)]?.text : lyrics.plain.split("\n")[picked ?? -1];
        if (!line?.trim() || !track) return null;
        return (
          <button
            type="button"
            onClick={() =>
              quoteCard(line, track).then(
                (blob) => shareImage(blob, `${track.title}`.slice(0, 40)).then(() => toast(t.listen.cardMade)),
                () => {},
              )
            }
            className="mx-auto mt-2 flex h-10 items-center gap-2 rounded-full bg-accent-soft px-5 text-sm font-medium text-accent-text active:scale-95"
          >
            <ShareNetworkIcon size={17} /> {t.listen.shareCard}
          </button>
        );
      })()}
      <p className="px-3 pt-2 text-center text-[11px] text-fg-3">{t.listen.lyricsSource}</p>
    </div>
  );
}
