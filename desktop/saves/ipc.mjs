// The desktop shell's side of saving (docs/game/systems.md, Saving): the IPC channels the preload's storage API
// (preload-api.cjs) talks to, over the files in files.mjs.
//   import { register } from './saves/ipc.mjs';
//   const saves = register(ipcMain, dir, { app, dialog, BrowserWindow });   // before the window loads
// dir is the folder the files go in (Electron's userData, or a portable folder; the shell decides). With `app`
// given, a quit waits for writes still on their way (before-quit), and anything left is written at process exit.
// Returns the file store (snapshot, set, remove, flush ...), for the shell and the tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFileStore, writeAtomic } from './files.mjs';

export const CHANNELS = {
  snapshot: 'storage:snapshot',
  set: 'storage:set',
  remove: 'storage:remove',
  blobGet: 'storage:blob-get',
  blobPut: 'storage:blob-put',
  blobDel: 'storage:blob-del',
  saveFile: 'storage:save-file',
  openFile: 'storage:open-file',
};
const EXPORT_EXT = 'amakawa-save';
const MAX_IMPORT = 32 * 1024 * 1024;
const okKey = (k) => typeof k === 'string' && k.length > 0 && k.length <= 200;

export function register(ipcMain, dir, { app = null, dialog = null, BrowserWindow = null, log = console } = {}) {
  const files = createFileStore(dir, { log });
  const electron = async () => (dialog ? { dialog, BrowserWindow } : await import('electron'));
  const windowOf = (e, BW) => BW?.fromWebContents?.(e.sender) || undefined;

  // the renderer's one synchronous call, at startup: every value there is
  ipcMain.on(CHANNELS.snapshot, (e) => {
    e.returnValue = files.snapshot();
  });
  ipcMain.on(CHANNELS.set, (_e, key, text) => {
    if (okKey(key) && typeof text === 'string') files.set(key, text);
  });
  ipcMain.on(CHANNELS.remove, (_e, key) => {
    if (okKey(key)) files.remove(key);
  });
  ipcMain.handle(CHANNELS.blobGet, (_e, key) => (okKey(key) ? files.blobGet(key) : null));
  ipcMain.handle(CHANNELS.blobPut, async (_e, key, value) => {
    if (!okKey(key) || typeof value !== 'string') throw new Error('bad picture');
    await files.blobPut(key, value);
  });
  ipcMain.handle(CHANNELS.blobDel, async (_e, key) => {
    if (okKey(key)) await files.blobDel(key);
  });

  // export: a native Save dialog, then the file written atomically
  ipcMain.handle(CHANNELS.saveFile, async (e, name, text) => {
    if (typeof text !== 'string') return { ok: false, error: 'nothing to write' };
    const { dialog: d, BrowserWindow: BW } = await electron();
    const safe = String(name || 'save').replace(/[\\/:*?"<>|]/g, '-');
    const docs = app?.getPath?.('documents');
    const r = await d.showSaveDialog(windowOf(e, BW), {
      defaultPath: docs ? path.join(docs, safe) : safe,
      filters: [{ name: 'Amakawa save', extensions: [EXPORT_EXT] }],
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      await writeAtomic(r.filePath, text);
      return { ok: true, path: r.filePath };
    } catch (err) {
      log.error(`saves: export to ${r.filePath} failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });
  // import: a native Open dialog; the renderer checks the contents (game3d/js/saves/transfer.js)
  ipcMain.handle(CHANNELS.openFile, async (e) => {
    const { dialog: d, BrowserWindow: BW } = await electron();
    const r = await d.showOpenDialog(windowOf(e, BW), {
      properties: ['openFile'],
      filters: [
        { name: 'Amakawa save', extensions: [EXPORT_EXT] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    const file = r.filePaths?.[0];
    if (r.canceled || !file) return { ok: false, canceled: true };
    try {
      const st = await fs.stat(file);
      if (st.size > MAX_IMPORT) return { ok: false, error: 'too large' };
      return { ok: true, name: path.basename(file), text: await fs.readFile(file, 'utf8') };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  if (app) {
    // closing right after a save: the quit waits until it is on disk
    let flushed = false;
    app.on('before-quit', (e) => {
      if (flushed || !files.pending()) return;
      e.preventDefault();
      files
        .flush()
        .catch((err) => log.error(`saves: flush at quit failed: ${err.message}`))
        .finally(() => {
          flushed = true;
          app.quit();
        });
    });
    process.on('exit', () => files.flushSync());
  }
  return files;
}
