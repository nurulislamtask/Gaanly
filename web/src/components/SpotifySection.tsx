import { useState } from "react";
import { api } from "../lib/api";
import type { Track } from "../lib/types";
import { likedSongs, login, myPlaylists, playlistSongs, redirectUri, useSpotify, type SpotifySong } from "../lib/spotifyAuth";
import { useLibrary } from "../stores/library";
import { useUi } from "../stores/ui";

/** Matches each Spotify song to its YouTube version, a few at a time. */
async function toTracks(list: SpotifySong[], progress: (done: number) => void): Promise<Track[]> {
  const out: (Track | null)[] = new Array(list.length).fill(null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      try {
        out[i] = (await api.search(`${list[i]!.title} ${list[i]!.artist}`, "song"))[0] ?? null;
      } catch {
        out[i] = null;
      }
      progress(++done);
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  const seen = new Set<string>();
  return out.filter((t): t is Track => !!t && !seen.has(t.id) && !!seen.add(t.id));
}

/** Settings: log in to Spotify and bring in Liked Songs and playlists (played from YouTube). */
export function SpotifySection() {
  const { clientId, connected, error, setClientId, disconnect } = useSpotify();
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const toast = useUi((s) => s.toast);
  const [busy, setBusy] = useState<string | null>(null);
  const [lists, setLists] = useState<{ id: string; name: string; total: number }[] | null>(null);

  const run = async (label: string, name: string, fetchSongs: () => Promise<SpotifySong[]>) => {
    setBusy(`${label}…`);
    try {
      const songs = await fetchSongs();
      const tracks = await toTracks(songs, (n) => setBusy(`${label}: ${n}/${songs.length}`));
      if (!tracks.length) throw new Error("No songs found");
      await createPlaylist(name, tracks);
      toast(`${name}: ${tracks.length} songs added`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const btn = "h-10 rounded-full bg-surface-2 px-4 text-sm font-medium ring-1 ring-line hover:bg-surface-3 disabled:opacity-50";
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-fg-3">Spotify</h3>
      <div className="flex flex-col gap-3 rounded-[16px] bg-surface-1 p-4 ring-1 ring-line">
        {!connected ? (
          <>
            <p className="text-[13px] text-fg-2">
              Log in to bring your Liked Songs and playlists. Create a free app at developer.spotify.com, add this Redirect URI, then paste its Client ID.
            </p>
            <code className="rounded-lg bg-surface-2 px-2 py-1 text-xs break-all select-all">{redirectUri()}</code>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Spotify Client ID"
              className="h-10 rounded-xl bg-surface-2 px-3 text-sm ring-1 ring-line outline-none"
            />
            <button type="button" className={btn} disabled={!clientId} onClick={() => login().catch((e: Error) => toast(e.message, "error"))}>
              Log in with Spotify
            </button>
            {error && <p className="text-xs text-danger">{error}</p>}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={!!busy} onClick={() => void run("Liked Songs", "Spotify Liked Songs", () => likedSongs())}>
                Import Liked Songs
              </button>
              <button
                type="button"
                className={btn}
                disabled={!!busy}
                onClick={() => myPlaylists().then(setLists, (e: Error) => toast(e.message, "error"))}
              >
                My playlists
              </button>
              <button type="button" className={btn} onClick={disconnect}>
                Log out
              </button>
            </div>
            {busy && <p className="text-xs text-fg-2">{busy}</p>}
            {lists && (
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {lists.map((p) => (
                  <li key={p.id}>
                    <button type="button" disabled={!!busy} onClick={() => void run(p.name, p.name, () => playlistSongs(p.id))} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2">
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-fg-3">{p.total}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
