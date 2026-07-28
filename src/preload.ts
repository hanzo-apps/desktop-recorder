import { contextBridge, ipcRenderer } from "electron";

// The ENTIRE renderer surface: one method. contextIsolation stays on and
// nodeIntegration stays off, so a compromised page can reach exactly the
// commands the main process chose to expose and nothing else.
contextBridge.exposeInMainWorld("hanzo", {
  call: (cmd: string, args?: unknown) => ipcRenderer.invoke("hanzo:call", cmd, args),
});
