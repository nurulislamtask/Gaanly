import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { create } from "zustand";
import { streamSource } from "./api";
import type { Track } from "./types";

/**
 * Songs saved on the device to play without internet.
 * Browser, desktop and Docker keep the audio in the browser's own database (IndexedDB); Android keeps files in the app's
 * private folder. The iPhone player is native and takes streams only, so downloads are not offered there.
 */

const platform = Capacitor.getPlatform();
export const offlineSupported = platform !== "ios" && typeof indexedDB !== "undefined";
const native = platform === "android";

const INDEX_KEY = "gaanly:offline";

function readIndex(): Track[] {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]") as Track[];
    return Array.isArray(list) ? list.filter((t) => t && typeof t.id === "string") : [];
  } catch {
    return [];
  }
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("gaanly-offline", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("audio");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

async function idbDo<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction("audio", mode).objectStore("audio"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const filePath = (id: string) => `gaanly-offline/${id}.m4a`;

interface OfflineState {
  tracks: Track[];
  /** Song ids being downloaded right now. */
  busy: string[];
  has: (id: string) => boolean;
  download: (track: Track) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useOffline = create<OfflineState>((set, get) => {
  const save = (tracks: Track[]) => {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(tracks));
    } catch {
      /* storage unavailable */
    }
    set({ tracks });
  };
  return {
    tracks: readIndex(),
    busy: [],
    has: (id) => get().tracks.some((t) => t.id === id),
    download: async (track) => {
      if (!offlineSupported || get().has(track.id) || get().busy.includes(track.id)) return;
      set({ busy: [...get().busy, track.id] });
      try {
        const url = await streamSource(track.id, "audio", "sd");
        if (native) {
          await Filesystem.downloadFile({ url, path: filePath(track.id), directory: Directory.Data, recursive: true });
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          if (!blob.size) throw new Error("empty");
          await idbDo("readwrite", (s) => s.put(blob, track.id));
        }
        save([track, ...get().tracks.filter((t) => t.id !== track.id)]);
      } finally {
        set({ busy: get().busy.filter((id) => id !== track.id) });
      }
    },
    remove: async (id) => {
      try {
        if (native) await Filesystem.deleteFile({ path: filePath(id), directory: Directory.Data });
        else await idbDo("readwrite", (s) => s.delete(id));
      } catch {
        /* already gone */
      }
      save(get().tracks.filter((t) => t.id !== id));
    },
  };
});

/** A playable address for a downloaded song, or null when it isn't there (anymore). */
export async function offlineUrl(id: string): Promise<string | null> {
  if (!useOffline.getState().has(id)) return null;
  try {
    if (native) {
      const { uri } = await Filesystem.getUri({ path: filePath(id), directory: Directory.Data });
      return Capacitor.convertFileSrc(uri);
    }
    const blob = await idbDo<Blob | undefined>("readonly", (s) => s.get(id));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
