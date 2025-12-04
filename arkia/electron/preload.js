const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arkiaAPI", {
  openAudioFiles: () => ipcRenderer.invoke("dialog:openAudioFiles"),
  readMetadata: (p) => ipcRenderer.invoke("metadata:read", p),
  readFileDataUrl: (p) => ipcRenderer.invoke("file:readDataUrl", p),
  saveLyrics: (path, lyrics) => ipcRenderer.invoke("lyrics:save", { path, lyrics })
});