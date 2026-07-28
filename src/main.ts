import { app, BrowserWindow, ipcMain, desktopCapturer, session, shell } from "electron";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Why this template is Electron and not Tauri: `desktopCapturer` enumerates
// every screen and window with thumbnails and hands back a media source id the
// renderer can open directly. There is no equivalent in a system webview, and
// no browser will ever expose it.
const COMMANDS: Record<string, (a: any, w: BrowserWindow | null) => unknown> = {
  list_sources: async () => {
    const src = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 480, height: 300 },
    });
    return src.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.id.startsWith("screen") ? "screen" : "window",
      thumb: s.thumbnail.toDataURL(),
    }));
  },

  save_recording: async ({ name, bytes }: { name: string; bytes: number[] }) => {
    const dir = path.join(app.getPath("videos"), "Hanzo Recorder");
    await mkdir(dir, { recursive: true });
    const out = path.join(dir, name);
    await writeFile(out, Buffer.from(bytes));
    return out;
  },

  winctl: ({ k }: { k: "close" | "minimize" | "toggleMaximize" }, w) => {
    if (k === "close") w?.close();
    else if (k === "minimize") w?.minimize();
    else w?.isMaximized() ? w.unmaximize() : w?.maximize();
    return k;
  },

  reveal: ({ file }: { file: string }) => {
    shell.showItemInFolder(file);
    return file;
  },
};

ipcMain.handle("hanzo:call", (_e, cmd: string, args: unknown) => {
  const fn = COMMANDS[cmd];
  if (!fn) throw new Error(`unknown command: ${cmd}`);
  return fn(args as any, BrowserWindow.getFocusedWindow());
});

function win() {
  const w = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 820,
    minHeight: 520,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0b0b0c",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const url = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
  if (url) w.loadURL(url);
  else w.loadFile(path.join(__dirname, `../renderer/${process.env.MAIN_WINDOW_VITE_NAME}/index.html`));
  return w;
}

app.whenReady().then(() => {
  // getDisplayMedia inside the app resolves to whatever the UI already picked;
  // without this handler Electron 30+ shows its own picker on top of ours.
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    const [screen] = await desktopCapturer.getSources({ types: ["screen"] });
    cb({ video: screen });
  });
  win();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && win());
});

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
