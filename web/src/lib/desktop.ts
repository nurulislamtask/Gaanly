/** Bridge exposed by the Electron preload script when Gaanly runs as the desktop app. */
interface DesktopBridge {
  platform: string;
  setTheme: (theme: "dark" | "light") => void;
  /** Missing in desktop builds older than 1.2. */
  setLanguage?: (lang: string) => void;
  /** Missing in desktop builds older than 1.0.0 (no in-app updates). */
  installUpdate?: (assets: { name: string; url: string }[]) => Promise<string>;
  onUpdateProgress?: (callback: (percent: number) => void) => () => void;
}

export const desktop = (window as Window & { gaanlyDesktop?: DesktopBridge }).gaanlyDesktop;

if (desktop) {
  document.documentElement.dataset.desktop = "true";
  // Match the native window buttons to the theme picked before this script ran.
  desktop.setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
}
