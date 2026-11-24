import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { create } from "zustand";

/**
 * Spotify login (PKCE, no server and no client secret) and the person's own library: Liked Songs and playlists.
 * Spotify only lets an app log people in with a Client ID, so each person creates a free one at
 * developer.spotify.com and pastes it into Settings. Songs are never played from Spotify (it gives no audio):
 * they are matched to YouTube by title and artist.
 */
const K = { id: "gaanly:spotifyClientId", tok: "gaanly:spotifyToken", ver: "gaanly:spotifyVerifier" };
const SCOPE = "user-library-read playlist-read-private playlist-read-collaborative";

interface Token {
  access: string;
  refresh: string;
  expires: number;
}

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
};

/** The address Spotify sends the person back to; it has to be added to the Spotify app's Redirect URIs. */
export const redirectUri = () => (Capacitor.isNativePlatform() ? "gaanly://spotify" : `${location.origin}/`);

function loadToken(): Token | null {
  try {
    return JSON.parse(read(K.tok) ?? "null") as Token | null;
  } catch {
    return null;
  }
}

interface State {
  clientId: string;
  connected: boolean;
  error: string | null;
  setClientId: (id: string) => void;
  disconnect: () => void;
}

export const useSpotify = create<State>((set) => ({
  clientId: read(K.id) ?? "",
  connected: !!loadToken(),
  error: null,
  setClientId: (id) => {
    write(K.id, id.trim());
    set({ clientId: id.trim() });
  },
  disconnect: () => {
    write(K.tok, null);
    set({ connected: false });
  },
}));

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function login(): Promise<void> {
  const clientId = useSpotify.getState().clientId;
  if (!clientId) throw new Error("Paste your Spotify Client ID first");
  const verifier = b64(crypto.getRandomValues(new Uint8Array(48)).buffer);
  write(K.ver, verifier);
  const challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const url =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirectUri(), scope: SCOPE, code_challenge_method: "S256", code_challenge: challenge });
  if (Capacitor.isNativePlatform()) window.open(url, "_system");
  else location.href = url;
}

async function tokenRequest(body: Record<string, string>): Promise<Token> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: useSpotify.getState().clientId, ...body }),
  });
  const j = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !j.access_token) throw new Error(j.error_description ?? `Spotify answered ${res.status}`);
  const old = loadToken();
  const tok = { access: j.access_token, refresh: j.refresh_token ?? old?.refresh ?? "", expires: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000 };
  write(K.tok, JSON.stringify(tok));
  useSpotify.setState({ connected: true, error: null });
  return tok;
}

/** Finishes a login: Spotify sent the person back with ?code=. */
export async function finishLogin(code: string): Promise<void> {
  const verifier = read(K.ver);
  if (!verifier) return;
  try {
    await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: verifier });
  } catch (e) {
    useSpotify.setState({ error: (e as Error).message });
  }
  write(K.ver, null);
}

/** Call once at start: picks up the code when Spotify returns to the page, or to the app on Android. */
export function startSpotifyReturn(): void {
  const code = new URLSearchParams(location.search).get("code");
  if (code && read(K.ver)) {
    history.replaceState(null, "", location.pathname);
    void finishLogin(code);
  }
  if (Capacitor.isNativePlatform()) {
    void App.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith("gaanly://spotify")) return;
      const c = new URL(url).searchParams.get("code");
      if (c) void finishLogin(c);
    });
  }
}

async function access(): Promise<string> {
  let tok = loadToken();
  if (!tok) throw new Error("Not connected to Spotify");
  if (Date.now() > tok.expires) tok = await tokenRequest({ grant_type: "refresh_token", refresh_token: tok.refresh });
  return tok.access;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${await access()}` } });
  if (!res.ok) throw new Error(`Spotify answered ${res.status}`);
  return (await res.json()) as T;
}

export interface SpotifySong {
  title: string;
  artist: string;
}
interface Item {
  track?: { name: string; artists: { name: string }[] } | null;
}
interface Page {
  items: Item[];
  next: string | null;
}

const songs = (items: Item[]): SpotifySong[] =>
  items.flatMap((i) => (i.track ? [{ title: i.track.name, artist: i.track.artists.map((a) => a.name).join(", ") }] : []));

async function pages(first: string, max: number): Promise<SpotifySong[]> {
  const out: SpotifySong[] = [];
  let url: string | null = first;
  while (url && out.length < max) {
    const p: Page = await get<Page>(url);
    out.push(...songs(p.items));
    url = p.next;
  }
  return out.slice(0, max);
}

export const likedSongs = (max = 300) => pages("https://api.spotify.com/v1/me/tracks?limit=50", max);

export async function myPlaylists(): Promise<{ id: string; name: string; total: number }[]> {
  const j = await get<{ items: { id: string; name: string; tracks?: { total: number } }[] }>("https://api.spotify.com/v1/me/playlists?limit=50");
  return j.items.map((p) => ({ id: p.id, name: p.name, total: p.tracks?.total ?? 0 }));
}

export const playlistSongs = (id: string, max = 300) => pages(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`, max);
