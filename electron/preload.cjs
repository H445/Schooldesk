const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('schooldeskDesktop', {
  platform: process.platform,
  isDesktop: true,
  version: process.versions.electron,
  openExternal: (url) => ipcRenderer.invoke('schooldesk:open-external', url),
});
