const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('schooldeskDesktop', {
  platform: process.platform,
  isDesktop: true,
  version: process.versions.electron,
});
