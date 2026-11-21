import { App } from "@capacitor/app";
import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { registerNativeUpdater } from "../lib/update";
import { nativeEq } from "../stores/nativeEq";
import { installTvMode } from "../tv/tvMode";

/** GaanlyDevicePlugin.java: what kind of device this is, and the in-app updater. */
interface DevicePlugin {
  info(): Promise<{ tv: boolean }>;
  installUpdate(options: { url: string }): Promise<void>;
  setEqualizer(options: { gains: number[] }): Promise<{ supported: boolean }>;
  addListener(event: "updateProgress", fn: (e: { percent: number }) => void): Promise<{ remove: () => Promise<void> }>;
}
const Device = registerPlugin<DevicePlugin>("GaanlyDevice", {
  web: () => ({
    info: async () => ({ tv: false }),
    installUpdate: async () => {},
    setEqualizer: async () => ({ supported: false }),
    addListener: async () => ({ remove: async () => {} }),
  }),
});

nativeEq.set = async (gains) => (await Device.setEqualizer({ gains })).supported;

// How the app fits into Android itself: Android TV, the Back button and the system bars.
if (Capacitor.isNativePlatform()) {
  // New releases: Android downloads and installs the APK itself; iOS can only point to the new .ipa.
  if (Capacitor.getPlatform() === "android") {
    registerNativeUpdater({
      platform: "android",
      install: async (url, onProgress) => {
        const handle = await Device.addListener("updateProgress", (e) => onProgress(e.percent));
        try {
          await Device.installUpdate({ url });
        } finally {
          void handle.remove();
        }
      },
    });
  } else {
    registerNativeUpdater({ platform: "ios" });
  }

  // One APK for phones and TVs: on a TV, switch to the remote-friendly 10-foot UI (web/src/tv).
  void Device.info()
    .then(({ tv }) => {
      if (!tv) return;
      document.documentElement.dataset.tv = "1";
      installTvMode();
    })
    .catch(() => {});

  // Back closes what's on top (a dialog, a menu), then goes back through pages, then sends the app to the
  // background, where the music keeps playing.
  void App.addListener("backButton", () => {
    const overlay = [...document.querySelectorAll("[data-escape-closes]")].some((el) => el.getClientRects().length > 0);
    if (overlay) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      return;
    }
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) window.history.back();
    else void App.minimizeApp();
  });

  // Status and navigation bar icons stay readable in both themes.
  const syncBars = () => {
    const light = document.documentElement.dataset.theme === "light";
    void SystemBars.setStyle({ style: light ? SystemBarsStyle.Light : SystemBarsStyle.Dark });
  };
  syncBars();
  new MutationObserver(syncBars).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
