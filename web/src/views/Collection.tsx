import { DotsThreeIcon, MagnifyingGlassIcon, PauseIcon, PencilSimpleIcon, PlayIcon, ShuffleIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Cover, type CoverKind } from "../components/Cover";
import { NamePlaylistDialog } from "../components/Dialogs";
import { IconButton } from "../components/IconButton";
import { Modal } from "../components/Modal";
import { EmptyState, PageHeader } from "../components/Page";
import { TrackList } from "../components/TrackList";
import { useT } from "../i18n";
import { shuffled } from "../lib/format";
import { paths } from "../lib/routes";
import type { Track } from "../lib/types";
import { usePlayer } from "../player/player";
import { useLibrary } from "../stores/library";

interface Props {
  kind: CoverKind;
}

/** Playlist, Favorites and History share one layout. */
export default function Collection({ kind }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const lib = useLibrary();
  const playList = usePlayer((s) => s.playList);
  const toggle = usePlayer((s) => s.toggle);
  const queue = usePlayer((s) => s.queue);
  const status = usePlayer((s) => s.status);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"default" | "title" | "artist" | "newest">("default");
  const t = useT();

  const playlist = kind === "playlist" ? lib.playlists.find((p) => p.id === id) : undefined;
  const tracks: Track[] = kind === "favorites" ? lib.favorites : kind === "history" ? lib.history : playlist?.tracks ?? [];
  const name = kind === "favorites" ? t.nav.favorites : kind === "history" ? t.nav.recentlyPlayed : playlist?.name ?? "";
  const label =
    kind === "playlist" ? t.collection.labelPlaylist : kind === "favorites" ? t.collection.labelFavorites : t.collection.labelHistory;

  if (kind === "playlist" && !playlist) {
    if (lib.status !== "ready") return <PageHeader />;
    return (
      <>
        <PageHeader />
        <EmptyState
          icon={<MagnifyingGlassIcon size={28} />}
          title={t.collection.notFoundTitle}
          body={t.collection.notFoundBody}
          action={
            <Link to={paths.library} className="mt-2 h-11 rounded-full bg-surface-3 px-6 text-sm leading-[44px] font-medium">
              {t.collection.goToLibrary}
            </Link>
          }
        />
      </>
    );
  }

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = q ? tracks.filter((x) => `${x.title} ${x.artist} ${x.album ?? ""}`.toLowerCase().includes(q)) : tracks;
    if (sort === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "artist") list = [...list].sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sort === "newest") list = [...list].reverse();
    return list;
  }, [tracks, filter, sort]);

  const total = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  // The queue holds exactly these tracks, so this collection is the current playback context.
  const isThisPlaying = tracks.length > 0 && queue.length === tracks.length && queue.every((t) => tracks.some((x) => x.id === t.id));
  const playing = isThisPlaying && (status === "playing" || status === "loading");

  return (
    <div className="pb-8">
      <PageHeader title={name} mobileOnly />

      <div className="flex flex-col items-center gap-4 px-4 pt-2 pb-5 md:flex-row md:items-end md:gap-6 md:px-6 md:pt-10">
        <Cover kind={kind} tracks={tracks} iconSize={64} className="size-48 shrink-0 rounded-3xl shadow-[0_16px_40px_rgb(20_17_43/0.25)] md:size-52" />
        <div className="flex min-w-0 flex-col items-center gap-1 text-center md:items-start md:text-left">
          <span className="hidden text-xs font-medium text-fg-2 md:block">{label}</span>
          <h1 className="max-w-full text-2xl leading-tight font-semibold tracking-tight break-words md:text-5xl lg:text-6xl">{name}</h1>
          <p className="text-sm text-fg-3">
            {t.common.tracks(tracks.length)}
            {total > 0 && <> · {t.time.total(total)}</>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pb-5 md:justify-start md:px-6">
        <IconButton label={t.collection.shuffle} size="lg" disabled={!tracks.length} className="size-12! rounded-full! bg-surface-2" onClick={() => playList(shuffled(shown.length ? shown : tracks), 0)}>
          <ShuffleIcon size={22} />
        </IconButton>
        <button
          type="button"
          disabled={!tracks.length}
          aria-label={playing ? t.common.pause : t.common.playX(name)}
          onClick={() => (isThisPlaying ? toggle() : playList(shown, 0))}
          className="grid size-16 place-items-center rounded-full bg-accent text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--accent)_40%,transparent)] transition-transform active:scale-95 disabled:opacity-40"
        >
          {playing ? <PauseIcon size={28} weight="fill" /> : <PlayIcon size={28} weight="fill" />}
        </button>
        {kind === "playlist" ? (
          <IconButton label={t.collection.more} size="lg" className="size-12! rounded-full! bg-surface-2" onClick={() => setMoreOpen(true)}>
            <DotsThreeIcon size={24} weight="bold" />
          </IconButton>
        ) : (
          <span className="size-12" aria-hidden="true" />
        )}
      </div>

      {tracks.length > 4 && (
        <div className="flex items-center gap-2 px-4 pb-3 md:px-6">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-4 ring-1 ring-line focus-within:ring-accent/60 md:max-w-sm">
            <MagnifyingGlassIcon size={18} className="shrink-0 text-fg-3" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t.collection.filterIn}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-3"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label={t.collection.sortDefault}
            className="h-11 rounded-full bg-surface-2 px-4 text-sm ring-1 ring-line outline-none"
          >
            <option value="default">{t.collection.sortDefault}</option>
            <option value="title">{t.collection.sortTitle}</option>
            <option value="artist">{t.collection.sortArtist}</option>
            <option value="newest">{t.collection.sortNewest}</option>
          </select>
        </div>
      )}

      <div className="px-2 md:px-3">
        {tracks.length > 0 ? (
          <TrackList tracks={shown} context={shown} playlistId={playlist?.id} showAlbum />
        ) : (
          <EmptyState
            icon={<MagnifyingGlassIcon size={28} />}
            title={kind === "history" ? t.collection.emptyHistory : t.collection.empty}
            body={
              kind === "favorites"
                ? t.collection.emptyFavoritesBody
                : kind === "history"
                  ? t.collection.emptyHistoryBody
                  : t.collection.emptyPlaylistBody
            }
            action={
              <Link to={paths.search} className="mt-2 h-11 rounded-full bg-accent px-6 text-sm leading-[44px] font-semibold text-accent-ink">
                {t.common.searchMusic}
              </Link>
            }
          />
        )}
      </div>

      {playlist && (
        <>
          <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={playlist.name}>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setRenaming(true);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-3"
              >
                <PencilSimpleIcon size={18} className="text-fg-2" /> {t.collection.rename}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setConfirmDelete(true);
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-danger hover:bg-surface-3"
              >
                <TrashIcon size={18} /> {t.collection.deletePlaylist}
              </button>
            </div>
          </Modal>

          <NamePlaylistDialog
            open={renaming}
            initial={playlist.name}
            title={t.collection.renameTitle}
            action={t.collection.save}
            onClose={() => setRenaming(false)}
            onSubmit={(n) => {
              void lib.renamePlaylist(playlist.id, n);
              setRenaming(false);
            }}
          />

          <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t.collection.deleteTitle}>
            <p className="text-sm text-fg-2">
              {t.collection.deleteBody(playlist.name, playlist.tracks.length)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-full px-5 text-sm font-medium text-fg-2 hover:text-fg">
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  void lib.deletePlaylist(playlist.id);
                  navigate(paths.library);
                }}
                className="h-11 rounded-full bg-danger px-6 text-sm font-semibold text-white"
              >
                {t.collection.delete}
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
