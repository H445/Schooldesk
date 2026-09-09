const {
  app,
  BrowserWindow,
  Menu,
  session,
  shell,
  ipcMain,
} = require('electron');
const path = require('node:path');

const rendererPath = path.join(__dirname, '..', 'dist', 'client', 'index.html');
const pdfViewerOrigin = 'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/';
const chromeResourcesOrigin = 'chrome://resources/';
const isLocalRendererResource = (url) =>
  url.startsWith('file://') ||
  url.startsWith('data:') ||
  url.startsWith('blob:') ||
  url.startsWith(pdfViewerOrigin) ||
  url.startsWith(chromeResourcesOrigin);

ipcMain.handle('schooldesk:open-external', (_event, value) => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    return shell.openExternal(url.toString()).then(() => true);
  } catch {
    return false;
  }
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#10121b',
    show: false,
    title: 'Schooldesk',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  window.loadFile(rendererPath);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    },
  );
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // data: and blob: are needed for locally stored previews. The
    // chrome-extension and chrome://resources origins are Electron's built-in
    // PDF viewer assets, not remote requests.
    callback({ cancel: !isLocalRendererResource(details.url) });
  });
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
