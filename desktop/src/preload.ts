import { contextBridge, ipcRenderer } from "electron";

// The only bridge between the web app and the desktop shell.
contextBridge.exposeInMainWorld("gaanlyDesktop", {
  platform: process.platform,
  setTheme: (theme: "dark" | "light") => ipcRenderer.send("gaanly:theme", theme),
  setLanguage: (lang: string) => ipcRenderer.send("gaanly:lang", lang),
  retry: () => ipcRenderer.send("gaanly:retry"),
});
