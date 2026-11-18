import { contextBridge, ipcRenderer } from "electron";

// The only bridge between the web app and the desktop shell.
contextBridge.exposeInMainWorld("gaanlyDesktop", {
  platform: process.platform,
  setTheme: (theme: "dark" | "light") => ipcRenderer.send("gaanly:theme", theme),
  setLanguage: (lang: string) => ipcRenderer.send("gaanly:lang", lang),
  retry: () => ipcRenderer.send("gaanly:retry"),
  /** Downloads and installs a new release; resolves with what happened: "installing", "relaunching" or "opened". */
  installUpdate: (assets: { name: string; url: string }[]) => ipcRenderer.invoke("gaanly:install-update", assets) as Promise<string>,
  onUpdateProgress: (callback: (percent: number) => void) => {
    const listener = (_event: unknown, percent: number) => callback(percent);
    ipcRenderer.on("gaanly:update-progress", listener);
    return () => ipcRenderer.removeListener("gaanly:update-progress", listener);
  },
});
