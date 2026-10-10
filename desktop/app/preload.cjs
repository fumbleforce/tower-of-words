// window.desktop for the page: { release } (a release build: the game keeps its dev features off, game3d/js/dev.js)
// and { storage } when the build carries the save-file API (desktop/saves/preload-api.cjs, #422). A sandboxed preload
// can't require files of its own, so build.mjs pastes that API in where the marker line is.
const { contextBridge, ipcRenderer } = require('electron');

let storageApi = null;
// @storage-api

const desktop = { release: process.argv.includes('--app-release') };
if (typeof storageApi === 'function') desktop.storage = storageApi(ipcRenderer);
contextBridge.exposeInMainWorld('desktop', desktop);
