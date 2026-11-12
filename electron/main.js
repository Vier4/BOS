// BOS как программа для компьютера. Здесь Браузер BOS открывает любые сайты в настоящем webview,
// потому что запреты на показ внутри чужих страниц к webview не применяются.
const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');

const WEB_PARTITION = 'persist:bos-web';
const isWebUrl = (url) => /^https?:\/\//i.test(url || '');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: 'BOS',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  // Сама BOS никуда не уходит со своей страницы (перезагрузка разрешена),
  // а внешние ссылки открываются в системном браузере.
  win.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== win.webContents.getURL().split('#')[0]) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

app.on('web-contents-created', (_event, contents) => {
  // Сайты во вкладках не получают доступа к Node.js и к внутренностям BOS.
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    if (!isWebUrl(params.src) || params.partition !== WEB_PARTITION) event.preventDefault();
  });

  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      if (isWebUrl(url) && contents.hostWebContents) contents.hostWebContents.send('bos:open-tab', url);
      return { action: 'deny' };
    });
  }
});

app.whenReady().then(() => {
  const web = session.fromPartition(WEB_PARTITION);
  // Без пометок Electron и BOS сайты видят обычный Chrome и не отказываются работать.
  web.setUserAgent(web.getUserAgent().replace(/\s(Electron|bos)\/\S+/g, ''));
  web.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'fullscreen'));

  ipcMain.on('bos:open-external', (_event, url) => {
    if (isWebUrl(url)) shell.openExternal(url);
  });

  createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
