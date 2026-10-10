// The renderer's side of the desktop save files (docs/game/systems.md, Saving). The shell's preload exposes it:
//   const { storageApi } = require('./saves/preload-api.cjs');
//   contextBridge.exposeInMainWorld('desktop', { storage: storageApi(ipcRenderer) });
// game3d/js/storage.js finds window.desktop.storage and uses it instead of localStorage. The snapshot of every kept
// value is read once, here, with the only synchronous call; writes are sent without waiting (desktop/saves/ipc.mjs
// writes them to disk in the background and flushes them before the app quits). Pictures and the export/import
// dialogs are async. It requires nothing, so a sandboxed preload can inline or bundle it.
// The channel names match CHANNELS in ipc.mjs.
function storageApi(ipcRenderer) {
  const snapshot = ipcRenderer.sendSync('storage:snapshot') || {};
  return {
    snapshot,
    set: (key, text) => ipcRenderer.send('storage:set', key, text),
    remove: (key) => ipcRenderer.send('storage:remove', key),
    blobGet: (key) => ipcRenderer.invoke('storage:blob-get', key),
    blobPut: (key, value) => ipcRenderer.invoke('storage:blob-put', key, value),
    blobDel: (key) => ipcRenderer.invoke('storage:blob-del', key),
    saveFile: (name, text) => ipcRenderer.invoke('storage:save-file', name, text),
    openFile: () => ipcRenderer.invoke('storage:open-file'),
  };
}

module.exports = { storageApi };
