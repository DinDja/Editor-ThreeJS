const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  getAppInfo: () => ipcRenderer.invoke('getAppInfo'),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_, action) => callback(action)),
  platform: process.platform,
});
