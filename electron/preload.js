// Мост между BOS и программой: только две безопасные функции для Браузера.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bosNative', {
  onOpenTab: (callback) => ipcRenderer.on('bos:open-tab', (_event, url) => callback(url)),
  openExternal: (url) => ipcRenderer.send('bos:open-external', url),
});
