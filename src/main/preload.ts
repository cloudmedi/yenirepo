// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { channel } from 'diagnostics_channel';
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

const apiHandler = {
  ipcRenderer: {
    send: (channel: Channels, data: unknown) => {
      ipcRenderer.send(channel, data);
    },
    receive: (channel: Channels, func: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
  }
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('api', apiHandler);

export type ElectronHandler = typeof electronHandler;
export type ApiHandler = typeof apiHandler;