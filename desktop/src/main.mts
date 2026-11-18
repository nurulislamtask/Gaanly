import { spawn } from "node:child_process";
import { chmodSync, createWriteStream, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, Menu, screen, shell } from "electron";
import type { RunningServer } from "../../server/src/app.js";
import { backupLibraryOnUpdate } from "./backup.js";

// No top-level await in this file: Electron only fires "ready" after the entry module finishes
// evaluating, so awaiting it at the top level would hang forever.

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4280; // fixed so the web origin (and its saved settings) stays the same between launches
const isMac = process.platform === "darwin";

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Everything the user owns lives in their profile, so updates and reinstalls keep it.
const userData = app.getPath("userData");
process.env.GAANLY_DATA_DIR = path.join(userData, "data");
process.env.GAANLY_CACHE_DIR = path.join(userData, "cache");
process.env.GAANLY_BIN_DIR = path.join(userData, "bin");
process.env.GAANLY_WEB_DIST = app.isPackaged ? path.join(process.resourcesPath, "web") : path.resolve(here, "..", "..", "web", "dist");

// A copy of the library from before each update, in userData/backups (the installer makes one too).
backupLibraryOnUpdate(userData, app.getVersion());

// The server reads its config when first imported, so load it only after the env above is set.
const loadServer = async () => ({
  ...(await import("../../server/src/app.js")),
  ...(await import("../../server/src/bootstrap.js")),
  ...(await import("../../server/src/tools.js")),
  ...(await import("../../server/src/i18n.js")),
  HttpError: (await import("../../server/src/types.js")).HttpError,
});

const THEME = {
  dark: { color: "#07162E", symbolColor: "#ECEEF2" },
  light: { color: "#E9EBEF", symbolColor: "#12141A" },
};
const TITLEBAR_HEIGHT = 40;

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

const stateFile = path.join(userData, "window.json");

// The language picked in the web app, kept here so the splash screen (shown before the web app loads) uses it too.
type Lang = "en" | "pt-BR";
const settingsFile = path.join(userData, "settings.json");
const isLang = (v: unknown): v is Lang => v === "en" || v === "pt-BR";

function readLang(): Lang {
  try {
    const { lang } = JSON.parse(readFileSync(settingsFile, "utf8")) as { lang?: unknown };
    if (isLang(lang)) return lang;
  } catch {
    // first launch
  }
  return "en";
}

let lang = readLang();

function readWindowState(): WindowState {
  try {
    const s = JSON.parse(readFileSync(stateFile, "utf8")) as WindowState;
    // Ignore a position that is no longer on any screen (monitor unplugged).
    const onScreen = screen
      .getAllDisplays()
      .some(({ workArea: a }) => s.x !== undefined && s.y !== undefined && s.x >= a.x - 50 && s.y >= a.y - 50 && s.x < a.x + a.width && s.y < a.y + a.height);
    return onScreen ? s : { width: s.width, height: s.height, maximized: s.maximized };
  } catch {
    return { width: 1280, height: 820 };
  }
}

function saveWindowState(win: BrowserWindow) {
  try {
    writeFileSync(stateFile, JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() }));
  } catch {
    /* not critical */
  }
}

function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    icon: path.join(here, "icon.png"),
    backgroundColor: THEME.dark.color,
    webPreferences: { preload: path.join(here, "preload.cjs"), sandbox: true, contextIsolation: true },
  });
  void splash.loadFile(path.join(here, "splash.html"), { query: { lang } });
  splash.once("ready-to-show", () => splash.show());
  return splash;
}

function createMainWindow(url: string): BrowserWindow {
  const state = readWindowState();
  const win = new BrowserWindow({
    ...state,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: "Gaanly",
    icon: path.join(here, "icon.png"),
    backgroundColor: THEME.dark.color,
    // Our own title bar (drawn by the web app) with the native window buttons on top of it:
    // macOS traffic lights on the left, centred in the bar; Windows and Linux controls on the right.
    titleBarStyle: "hidden",
    ...(isMac
      ? { trafficLightPosition: { x: 14, y: (TITLEBAR_HEIGHT - 14) / 2 } }
      : { titleBarOverlay: { ...THEME.dark, height: TITLEBAR_HEIGHT } }),
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  win.once("ready-to-show", () => {
    if (state.maximized) win.maximize();
    win.show();
  });
  win.on("close", () => saveWindowState(win));

  // Links to YouTube etc. open in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, target) => {
    if (!target.startsWith(url)) {
      event.preventDefault();
      if (/^https?:\/\//.test(target)) void shell.openExternal(target);
    }
  });

  void win.loadURL(url);
  return win;
}

let mainWindow: BrowserWindow | null = null;
let server: RunningServer | null = null;

async function launch() {
  const splash = createSplash();
  const s = await loadServer();
  // Show progress while yt-dlp and Deno download on the first launch.
  const report = setInterval(() => {
    splash.webContents.executeJavaScript(`window.update(${JSON.stringify(s.downloads(lang))})`).catch(() => {});
  }, 250);

  try {
    await s.refreshTools();
    await s.ensureEssentials();
    server ??= await s.startServer({ port: PORT, host: "127.0.0.1", portFallback: true });
    // FFmpeg is only needed for HD and some videos: fetch it in the background.
    s.ensureComponent("ffmpeg").catch(() => {});
  } catch (err) {
    clearInterval(report);
    const message = JSON.stringify(err instanceof s.HttpError ? s.tr(lang, err.text) : (err as Error).message);
    await splash.webContents.executeJavaScript(`window.fail(${message})`).catch(() => {});
    return;
  }

  clearInterval(report);
  mainWindow = createMainWindow(`http://127.0.0.1:${server.port}`);
  mainWindow.once("ready-to-show", () => splash.destroy());
}

ipcMain.on("gaanly:theme", (event, theme: "dark" | "light") => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const colors = THEME[theme] ?? THEME.dark;
  if (!isMac) win?.setTitleBarOverlay({ ...colors, height: TITLEBAR_HEIGHT });
  win?.setBackgroundColor(colors.color);
});

ipcMain.on("gaanly:lang", (_event, next: unknown) => {
  if (!isLang(next) || next === lang) return;
  lang = next;
  try {
    writeFileSync(settingsFile, JSON.stringify({ lang }));
  } catch {
    /* not critical: the splash falls back to English */
  }
});

// ---- In-app updates -------------------------------------------------------------------------------------------
// The web app checks Gaanly's GitHub releases and, when the user taps Update, sends the release's files here.
// Windows: the installer runs silently and the app reopens. Linux AppImage: the file replaces itself and restarts.
// macOS and Linux .deb: the downloaded package is opened (dragging to Applications / the software installer).
const RELEASE_PREFIX = "https://github.com/nurulislamtask/gaanly/releases/download/";

interface UpdateAsset {
  name: string;
  url: string;
}

function pickUpdateAsset(assets: UpdateAsset[]): UpdateAsset | undefined {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const find = (re: RegExp) => assets.find((a) => re.test(a.name));
  if (process.platform === "win32") return find(/-Windows\.exe$/);
  if (isMac) return find(new RegExp(`-macOS-${arch}\\.dmg$`));
  return process.env.APPIMAGE ? find(new RegExp(`-Linux-${arch}\\.AppImage$`)) : find(new RegExp(`-Linux-${arch}\\.deb$`));
}

async function download(url: string, file: string, onProgress: (percent: number) => void) {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Gaanly-Updater" } });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}).`);
  const total = Number(res.headers.get("content-length")) || 0;
  let done = 0;
  let last = -1;
  const source = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream<Uint8Array>);
  source.on("data", (chunk: Buffer) => {
    done += chunk.length;
    if (!total) return;
    const percent = Math.floor((done * 100) / total);
    if (percent !== last) {
      last = percent;
      onProgress(percent);
    }
  });
  await pipeline(source, createWriteStream(file));
  if (done < 1024 * 1024) throw new Error("The download is incomplete.");
}

let updating = false;

ipcMain.handle("gaanly:install-update", async (event, input: unknown) => {
  if (!app.isPackaged) throw new Error("Updates only work in the installed app.");
  if (updating) throw new Error("Already downloading.");
  const assets = (Array.isArray(input) ? input : []).filter(
    (a): a is UpdateAsset =>
      !!a && typeof a.name === "string" && typeof a.url === "string" && a.url.toLowerCase().startsWith(RELEASE_PREFIX) && /^Gaanly-Setup-[\w.-]+$/.test(a.name),
  );
  const asset = pickUpdateAsset(assets);
  if (!asset) throw new Error("No download for this system in the new release.");

  updating = true;
  try {
    const progress = (percent: number) => event.sender.send("gaanly:update-progress", percent);
    const dir = path.join(app.getPath("temp"), "gaanly-update");
    mkdirSync(dir, { recursive: true });

    if (process.platform === "linux" && process.env.APPIMAGE && asset.name.endsWith(".AppImage")) {
      const target = process.env.APPIMAGE;
      const fresh = `${target}.new`;
      await download(asset.url, fresh, progress);
      chmodSync(fresh, 0o755);
      renameSync(fresh, target);
      app.relaunch({ execPath: target });
      setTimeout(() => app.quit(), 400);
      return "relaunching";
    }

    const file = path.join(dir, asset.name);
    await download(asset.url, file, progress);
    if (process.platform === "win32") {
      // /S: no wizard. --updated --force-run: open Gaanly again when the install is done.
      spawn(file, ["/S", "--updated", "--force-run"], { detached: true, stdio: "ignore" }).unref();
      setTimeout(() => app.quit(), 400);
      return "installing";
    }
    await shell.openPath(file);
    return "opened";
  } finally {
    updating = false;
  }
});

ipcMain.on("gaanly:retry", (event) => {
  const failed = BrowserWindow.fromWebContents(event.sender);
  // Open the new splash before closing the old one, or "window-all-closed" would quit the app.
  void launch();
  failed?.destroy();
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => void server?.close());

void app.whenReady().then(() => {
  // macOS needs an app menu: without the Edit menu, Cmd+C/V/A don't reach text fields, and Cmd+Q has no home.
  Menu.setApplicationMenu(
    isMac ? Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "windowMenu" }]) : null,
  );
  return launch();
});
