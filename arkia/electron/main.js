import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { parseFile } from "music-metadata";
import fsExtra from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    const devURL = process.env.VITE_DEV_SERVER_URL;
    if (devURL) {
      console.log("Loading dev URL:", devURL);
      win.loadURL(devURL);
    } else {
      const indexPath = path.join(__dirname, "../client/dist/index.html");
      const indexUrl = `file://${indexPath}`;
      console.log("Dev URL missing — loading built file:", indexUrl);
      win.loadURL(indexUrl);
    }
    // Open DevTools so we can see console messages while developing
    win.webContents.openDevTools();
  } catch (err) {
    console.error("Error loading window URL:", err);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// IPC handlers
ipcMain.handle("dialog:openAudioFiles", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Audio", extensions: ["mp3", "m4a", "flac", "wav", "ogg", "aac"] }]
  });
  return canceled ? [] : filePaths;
});

ipcMain.handle("metadata:read", async (_, filePath) => {
  const meta = await parseFile(filePath).catch(() => ({}));
  return {
    title: meta?.common?.title || path.basename(filePath),
    artist: meta?.common?.artist || "Unknown",
    lyrics: meta?.common?.lyrics?.join("\n") || null
  };
});

ipcMain.handle('file:readDataUrl', async (_, filePath) => {
  try {
    const data = await fsExtra.readFile(filePath);
    const ext = (path.extname(filePath) || '').toLowerCase();
    let mime = 'audio/mpeg';
    if (ext === '.m4a' || ext === '.mp4') mime = 'audio/mp4';
    else if (ext === '.wav') mime = 'audio/wav';
    else if (ext === '.ogg') mime = 'audio/ogg';
    else if (ext === '.flac') mime = 'audio/flac';
    const base64 = data.toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error('readDataUrl error', err);
    throw err;
  }
});

ipcMain.handle("lyrics:save", async (_, { path, lyrics }) => {
  try {
    const lrcPath = path + ".txt";
    await fsExtra.writeFile(lrcPath, lyrics, "utf-8");
    return true;
  } catch (err) {
    console.error("Lyrics save error:", err);
    return false;
  }
});
