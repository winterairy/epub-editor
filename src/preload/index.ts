import { contextBridge, ipcRenderer } from "electron";
import { isCommand, type Command } from "../shared/commands";
contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  onCommand(callback: (command: Command) => void) {
    const listener = (_event: Electron.IpcRendererEvent, command: unknown) => {
      if (isCommand(command)) callback(command);
    };
    ipcRenderer.on("editor:command", listener);
    return () => ipcRenderer.removeListener("editor:command", listener);
  },
});
