import { ArrowDownIcon, MinusIcon, PlusIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { api, saveFile } from "../lib/api";
import type { Lyrics, Translated } from "../lib/apiTypes";
import { cn } from "../lib/format";
import { quoteCard, shareImage } from "../lib/quoteCard";
import { selectCurrent, usePlayer } from "../player/player";
import { useUi } from "../stores/ui";

interface Views {
  original: boolean;
  banglish: boolean;
  english: boolean;
  bangla: boolean;
}
const VIEWS_KEY = "gaanly:lyricViews";
function readViews(): Views {
  try {
    const v = JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "null") as Partial<Views> | null;
    if (v) return { original: v.original ?? true, banglish: !!v.banglish, english: !!v.english, bangla: !!v.bangla };
  } catch {
    /* ignore */
  }
  return { original: true, banglish: false, english: false, bangla: false };
}

type State = { id: string; lyrics: Lyrics | null } | "loading";

/**
 * Lyrics that follow the song: the current line is big and bright with a soft glow, the rest fade and blur with
 * distance. Tap a line to jump there; a nudge control fixes lyrics that run early or late.
 * `full` is the phone's full-screen reading view: bigger, left-aligned text.
 */
export function LyricsView({ className, full = false }: { className?: string; full?: boolean }) {
  const t = useT();
  const track = usePlayer(selectCurrent);
  const position = usePlayer((s) => s.position);
  const seek = usePlayer((s) => s.seek);
  const toast = useUi((s) => s.toast);
  const [picked, setPicked] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [detached, setDetached] = useState(false);
  const [state, setState] = useState<State>("loading");
  const [view, setView] = useState<Views>(readViews);
  const [extra, setExtra] = useState<Record<string, Translated | "loading">>({});
  const box = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLButtonElement | null)[]>([]);
  const programmatic = useRef(false);
  const id = track?.id;

  useEffect(() => {
    if (!track) return;
    setState("loading");
    setOffset(0);
    setDetached(false);
    setExtra({});
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
    if (synced[i]!.t <= position + offset + 0.25) active = i;
    else break;
  }

  const texts = synced.length ? synced.map((l) => l.text) : (lyrics?.plain ?? "").split("\n");
  const wants = [...new Set([view.banglish || view.english ? "en" : "", view.bangla ? "bn" : ""].filter(Boolean))];
  useEffect(() => {
    if (!lyrics || !id) return;
    for (const lang of wants) {
      const key = `${id}|${lang}`;
      if (extra[key]) continue;
      setExtra((e) => ({ ...e, [key]: "loading" }));
      api.translate(texts, lang).then(
        (r) => setExtra((e) => ({ ...e, [key]: r })),
        () => {
          setExtra((e) => {
            const { [key]: _gone, ...rest } = e;
            return rest;
          });
          toast(t.listen.translateFailed, "error");
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wants.join(), id, lyrics]);
  const got = (lang: string) => {
    const v = extra[`${id}|${lang}`];
    return v && v !== "loading" ? v : null;
  };
  const en = got("en");
  const bn = got("bn");
  const pending = wants.some((l) => extra[`${id}|${l}`] === "loading");
  const toggle = (k: keyof Views) => {
    const next = { ...view, [k]: !view[k] };
    if (!next.original && !next.banglish && !next.english && !next.bangla) return;
    setView(next);
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const center = (i: number, smooth = true) => {
    const el = lines.current[i];
    const parent = box.current;
    if (!el || !parent) return;
    programmatic.current = true;
    parent.scrollTo({ top: el.offsetTop - parent.clientHeight / 3 + el.clientHeight / 2, behavior: smooth ? "smooth" : "auto" });
    setTimeout(() => (programmatic.current = false), 700);
  };

  useEffect(() => {
    if (!detached) center(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, detached]);

  if (state === "loading" || state.id !== id) {
    return <p className="px-2 py-16 text-center text-sm text-fg-2">{t.listen.loadingLyrics}</p>;
  }
  if (!lyrics || (!synced.length && !lyrics.plain)) {
    return <p className="px-2 py-16 text-center text-sm text-fg-2">{t.listen.noLyrics}</p>;
  }

  const line = synced.length ? synced[picked ?? Math.max(active, 0)]?.text : lyrics.plain.split("\n")[picked ?? -1];

  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      <div className="flex items-center gap-2 px-1 pb-2 text-xs text-fg-2">
        <span className="rounded-full bg-black/25 px-3 py-1.5 font-medium ring-1 ring-white/10">{synced.length ? t.listen.synced : t.listen.plainLyrics} · LRCLIB</span>
        {synced.length > 0 && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-black/25 p-1 ring-1 ring-white/10" aria-label={t.listen.syncOffset} title={t.listen.syncOffset}>
            <button type="button" onClick={() => setOffset((o) => Math.round((o - 0.5) * 10) / 10)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" aria-label="-0.5s">
              <MinusIcon size={14} />
            </button>
            <span className="w-11 text-center font-mono tabular-nums">{offset > 0 ? "+" : ""}{offset.toFixed(1)}s</span>
            <button type="button" onClick={() => setOffset((o) => Math.round((o + 0.5) * 10) / 10)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" aria-label="+0.5s">
              <PlusIcon size={14} />
            </button>
          </span>
        )}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-2">
        {(
          [
            ["original", "Original"],
            ["banglish", "Banglish"],
            ["english", "English"],
            ["bangla", "বাংলা"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={view[k]}
            onClick={() => toggle(k)}
            className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium ring-1 ring-white/15", view[k] ? "bg-accent text-accent-ink" : "bg-black/25 text-white/80")}
          >
            {label}
          </button>
        ))}
        {pending && <span className="self-center text-xs text-white/60">…</span>}
      </div>

      <div
        ref={box}
        onScroll={() => !programmatic.current && setDetached(true)}
        className={cn("scroll-area relative flex-1 overflow-y-auto", full ? "px-1 pt-[18%] pb-[60%]" : "px-3 py-[30%] text-center")}
      >
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
                  setDetached(false);
                  seek(l.t);
                }}
                style={{
                  filter: d === 0 ? "none" : `blur(${Math.min(3.5, d * 0.9)}px)`,
                  opacity: d === 0 ? 1 : Math.max(0.28, 0.75 - d * 0.14),
                  textShadow: d === 0 ? "0 0 24px rgb(255 255 255 / 0.35)" : undefined,
                }}
                className={cn(
                  "block w-full text-balance transition-[filter,opacity,transform,color] duration-500",
                  full ? "origin-left py-3 text-left" : "py-2",
                  full ? "text-[30px] leading-[1.15] font-bold" : d === 0 ? "text-[22px] leading-snug font-bold" : "text-lg leading-snug font-semibold",
                  d === 0 ? (full ? "text-white" : "scale-105 text-accent-text") : "text-fg",
                )}
              >
                {view.original || !en?.romanized[i] ? l.text || "♪" : en.romanized[i]}
                {view.original && view.banglish && en?.romanized[i] && <span className="block text-[0.6em] leading-snug font-medium opacity-70">{en.romanized[i]}</span>}
                {view.english && en?.translation[i] && <span className="block text-[0.6em] leading-snug font-medium text-accent-text">{en.translation[i]}</span>}
                {view.bangla && bn?.translation[i] && <span className="block text-[0.6em] leading-snug font-medium text-accent-text">{bn.translation[i]}</span>}
              </button>
            );
          })
        ) : (
          lyrics.plain.split("\n").map((l, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPicked(i)}
              className={cn("block w-full py-1 text-[17px] leading-7 font-medium", full && "text-left text-[22px] leading-9", picked === i ? "text-accent-text" : "text-fg")}
            >
              {l || " "}
            </button>
          ))
        )}
      </div>

      {detached && synced.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setDetached(false);
            center(active);
          }}
          className="absolute right-2 bottom-16 flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-lg active:scale-95"
        >
          <ArrowDownIcon size={16} weight="bold" /> {t.listen.returnCurrent}
        </button>
      )}

      {synced.length > 0 && track && (
        <button
          type="button"
          onClick={() => {
            const stamp = (s: number) => `[${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}]`;
            const body = synced.map((l) => `${stamp(l.t)}${l.text}`).join("\n");
            const name = `${track.artist} - ${track.title}`.replace(/[\\/:*?"<>|]+/g, " ").slice(0, 80);
            void saveFile(`${name}.lrc`, `[ti:${track.title}]\n[ar:${track.artist}]\n${body}\n`).catch(() => {});
          }}
          className="mx-auto mt-2 flex h-10 items-center gap-2 rounded-full bg-black/30 px-5 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md active:scale-95"
        >
          {t.listen.exportLrc}
        </button>
      )}

      {line?.trim() && track && (
        <button
          type="button"
          onClick={() =>
            quoteCard(line, track).then(
              (blob) => shareImage(blob, `${track.title}`.slice(0, 40)).then(() => toast(t.listen.cardMade)),
              () => {},
            )
          }
          className="mx-auto mt-2 flex h-10 items-center gap-2 rounded-full bg-black/30 px-5 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md active:scale-95"
        >
          <ShareNetworkIcon size={17} /> {t.listen.shareCard}
        </button>
      )}
    </div>
  );
}
