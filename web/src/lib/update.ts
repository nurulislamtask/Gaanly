import { create } from "zustand";
import { getT } from "../i18n";
import { toast } from "../stores/ui";
import { desktop } from "./desktop";

/** Where Gaanly's releases live. The app checks this for new versions. */
export const REPO = "nurulislamtask/Gaanly";

export interface ReleaseAsset {
  name: string;
  url: string;
}

export interface Release {
  version: string;
  notes: string;
  page: string;
  assets: ReleaseAsset[];
}

/** What the phone apps add (web/src/native/android.ts): Android installs the APK itself, iOS can only point to it. */
export interface NativeUpdater {
  platform: "android" | "ios";
  install?: (url: string, onProgress: (percent: number) => void) => Promise<void>;
}

let nativeUpdater: NativeUpdater | null = null;
export const registerNativeUpdater = (updater: NativeUpdater) => {
  nativeUpdater = updater;
};

/** desktop: the Windows/macOS/Linux app · android/ios: the phone apps · web: the browser (PWA) and Docker. */
export type UpdateKind = "desktop" | "android" | "ios" | "web";
export const updateKind = (): UpdateKind => (desktop?.installUpdate ? "desktop" : (nativeUpdater?.platform ?? "web"));

const parts = (v: string) => v.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);

export function isNewer(candidate: string, current: string): boolean {
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

type Phase = "idle" | "checking" | "downloading" | "installing";

interface UpdateState {
  phase: Phase;
  release: Release | null;
  progress: number;
  checkedAt: number;
  /** The newest version the user chose "Later" for: the banner stays quiet until a newer one appears. */
  dismissed: string | null;
  /** The outcome of the last check the user asked for by hand. */
  manual: "latest" | "failed" | null;
  check: (manual?: boolean) => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
}

const DISMISS_KEY = "gaanly:update-dismissed";
const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

interface ApiRelease {
  tag_name?: string;
  body?: string;
  html_url?: string;
  assets?: { name?: string; browser_download_url?: string }[];
}

export const useUpdate = create<UpdateState>((set, get) => ({
  phase: "idle",
  release: null,
  progress: 0,
  checkedAt: 0,
  dismissed: readDismissed(),
  manual: null,

  check: async (manual = false) => {
    const { phase } = get();
    if (phase === "checking" || phase === "downloading" || phase === "installing") return;
    set({ phase: "checking", manual: null });
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      // No release published yet.
      if (res.status === 404) {
        set({ phase: "idle", release: null, checkedAt: Date.now(), manual: manual ? "latest" : null });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as ApiRelease;
      const version = String(data.tag_name ?? "").replace(/^v/i, "");
      if (!version) throw new Error("no version");
      const assets: ReleaseAsset[] = [];
      for (const a of data.assets ?? []) if (a.name && a.browser_download_url) assets.push({ name: a.name, url: a.browser_download_url });
      const release = isNewer(version, __APP_VERSION__)
        ? { version, notes: data.body ?? "", page: data.html_url ?? `https://github.com/${REPO}/releases/latest`, assets }
        : null;
      set({ phase: "idle", release, checkedAt: Date.now(), manual: manual && !release ? "latest" : null });
    } catch {
      set({ phase: "idle", checkedAt: Date.now(), manual: manual ? "failed" : null });
    }
  },

  install: async () => {
    const { release } = get();
    if (!release) return;
    const t = getT();
    const kind = updateKind();
    try {
      if (kind === "desktop" && desktop?.installUpdate) {
        set({ phase: "downloading", progress: 0 });
        const stop = desktop.onUpdateProgress?.((progress) => set({ progress }));
        try {
          const result = await desktop.installUpdate(release.assets);
          if (result === "opened") {
            set({ phase: "idle" });
            toast(t.update.opened);
          } else {
            // The app closes and the installer (or the new AppImage) reopens it.
            set({ phase: "installing" });
          }
        } finally {
          stop?.();
        }
      } else if (kind === "android" && nativeUpdater?.install) {
        const apk = release.assets.find((a) => /-Android\.apk$/.test(a.name));
        if (!apk) {
          window.open(release.page, "_blank");
          return;
        }
        set({ phase: "downloading", progress: 0 });
        await nativeUpdater.install(apk.url, (progress) => set({ progress }));
        set({ phase: "idle" });
      } else if (kind === "ios") {
        const ipa = release.assets.find((a) => /-iOS\.ipa$/.test(a.name));
        window.open(ipa?.url ?? release.page, "_blank");
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      set({ phase: "idle" });
      toast(err.code === "permission" ? t.update.allow : t.update.failed(err.message ?? ""), "error");
    }
  },

  dismiss: () => {
    const version = get().release?.version ?? null;
    try {
      if (version) localStorage.setItem(DISMISS_KEY, version);
    } catch {
      /* private mode */
    }
    set({ dismissed: version });
  },
}));

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWO_HOURS = 2 * 60 * 60 * 1000;

/** Looks for a new release shortly after start, every few hours, and when the app comes back to the front. */
export function startAutoUpdateChecks(): () => void {
  if (updateKind() === "web") return () => {};
  const run = () => void useUpdate.getState().check();
  const first = setTimeout(run, 4000);
  const every = setInterval(run, SIX_HOURS);
  const onVisible = () => {
    if (document.visibilityState === "visible" && Date.now() - useUpdate.getState().checkedAt > TWO_HOURS) run();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearTimeout(first);
    clearInterval(every);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
