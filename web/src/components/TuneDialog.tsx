import { CheckIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useT } from "../i18n";
import { LANGUAGES, SUGGESTED_ARTISTS } from "../lib/feed";
import { cn } from "../lib/format";
import { useLibrary } from "../stores/library";
import { isFiltering, useHomePrefs } from "../stores/homePrefs";
import { Modal } from "./Modal";

const chip = (on: boolean) =>
  cn(
    "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors",
    on ? "bg-accent-soft text-accent-text ring-accent/40" : "text-fg-2 ring-line hover:text-fg",
  );

/** Choose what Home shows: languages, singers, and which playlists sit in the shortcut row. */
export function TuneDialog() {
  const t = useT();
  const prefs = useHomePrefs();
  const playlists = useLibrary((s) => s.playlists);
  const [name, setName] = useState("");
  const filtering = isFiltering(prefs);

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const addArtist = (raw: string) => {
    const v = raw.trim().slice(0, 60);
    if (v && !prefs.artists.some((a) => a.toLowerCase() === v.toLowerCase())) prefs.setArtists([...prefs.artists, v]);
    setName("");
  };
  const shown = prefs.playlistIds ?? playlists.slice(0, 6).map((p) => p.id);

  return (
    <Modal open={prefs.tuneOpen} onClose={() => prefs.setTuneOpen(false)} title={t.home.tune.title}>
      <div className="scroll-area flex max-h-[68dvh] flex-col gap-5 overflow-y-auto pr-1">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.home.tune.languages}</h3>
          <p className="text-xs text-fg-2">{t.home.tune.languagesHint}</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = prefs.languages.includes(l);
              return (
                <button key={l} type="button" role="checkbox" aria-checked={on} onClick={() => prefs.setLanguages(toggle(prefs.languages, l))} className={chip(on)}>
                  {on && <CheckIcon size={14} weight="bold" />}
                  {t.home.feed.chips[l]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.home.tune.singers}</h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addArtist(name);
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.home.tune.singerPlaceholder}
              className="h-10 min-w-0 flex-1 rounded-full bg-surface-1 px-4 text-sm ring-1 ring-line outline-none focus:ring-accent/60"
            />
            <button type="submit" className="flex h-10 items-center gap-1 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink active:scale-95">
              <PlusIcon size={16} weight="bold" /> {t.home.tune.add}
            </button>
          </form>
          {prefs.artists.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prefs.artists.map((a) => (
                <button key={a} type="button" aria-label={t.home.tune.removeX(a)} onClick={() => prefs.setArtists(prefs.artists.filter((x) => x !== a))} className={chip(true)}>
                  {a} <XIcon size={13} weight="bold" />
                </button>
              ))}
            </div>
          )}
          <p className="pt-1 text-xs text-fg-3">{t.home.tune.suggestions}</p>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {SUGGESTED_ARTISTS.filter((a) => !prefs.artists.includes(a)).map((a) => (
              <button key={a} type="button" onClick={() => addArtist(a)} className="h-7 rounded-full px-2.5 text-xs text-fg-2 ring-1 ring-line hover:text-fg">
                {a}
              </button>
            ))}
          </div>
        </section>

        {playlists.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t.home.tune.playlists}</h3>
            <p className="text-xs text-fg-2">{t.home.tune.playlistsHint}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" role="checkbox" aria-checked={prefs.playlistIds === null} onClick={() => prefs.setPlaylistIds(null)} className={chip(prefs.playlistIds === null)}>
                {t.home.tune.defaultPlaylists}
              </button>
              {playlists.map((p) => {
                const on = prefs.playlistIds !== null && shown.includes(p.id);
                return (
                  <button key={p.id} type="button" role="checkbox" aria-checked={on} onClick={() => prefs.setPlaylistIds(toggle(shown, p.id))} className={chip(on)}>
                    {on && <CheckIcon size={14} weight="bold" />}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={!filtering}
            onClick={prefs.clearFilters}
            className="text-[13px] font-medium text-fg-2 underline-offset-2 hover:text-fg hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {t.home.tune.clear}
          </button>
          <button type="button" onClick={() => prefs.setTuneOpen(false)} className="h-10 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink active:scale-95">
            {t.home.tune.done}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Settings entry: what Home shows (languages, singers, playlists). */
export function HomeSettings() {
  const t = useT();
  const prefs = useHomePrefs();
  const summary = [...prefs.languages.map((l) => t.home.feed.chips[l as keyof typeof t.home.feed.chips] ?? l), ...prefs.artists].join(", ");
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-fg-3">{t.home.tune.title}</h3>
      <button
        type="button"
        onClick={() => prefs.setTuneOpen(true)}
        className="flex items-center justify-between gap-3 rounded-[16px] bg-surface-1 px-4 py-3 text-left ring-1 ring-line transition-colors hover:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{t.home.tune.button}</span>
          <span className="block truncate text-xs text-fg-2">{summary ? t.home.tune.filtering(summary) : t.home.tune.languagesHint}</span>
        </span>
        <span className="shrink-0 text-sm font-medium text-accent-text">{t.home.tune.edit2}</span>
      </button>
    </section>
  );
}
