// The desktop app's main process: one window on app://game/game3d/index.html, its files served from a content source
// (serve.mjs): a plain folder in a dev build, the encrypted pack in a release (desktop/pak/source.mjs).
//
// build.mjs writes config.json next to this file: { release, content: "pak" or "folder" }. A release turns DevTools off, refuses the
// debugging switches and tells the page (preload.cjs: window.desktop.release) so its dev features stay off.
// An optional module, ./full/full.mjs, adds its own routes, start page and navigation (only some builds carry it).
// Saves: userData, or a folder beside the app when a file named "portable" sits next to it (installDir()).
// What the hardening does and doesn't stop: docs/desktop-release.md.
import { app, BrowserWindow, Menu, dialog, protocol, session, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHandler, HOST } from './serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'));
const RELEASE = config.release === true;
const GAME = `app://${HOST}/game3d/index.html`;

if (RELEASE) {
  // Chromium's and Node's own debugging switches would hand over the page or the main process
  const banned = ['remote-debugging-port', 'remote-debugging-pipe', 'remote-debugging-address', 'inspect', 'inspect-brk', 'inspect-port', 'js-flags'];
  if (banned.some((s) => app.commandLine.hasSwitch(s)) || process.argv.some((a) => /^--(inspect|remote-debugging)/.test(a))) {
    process.exit(1);
  }
}

// Where the player put the app: the folder holding the .exe, the AppImage, or the .app bundle
function installDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR; // Windows portable .exe
  if (process.env.APPIMAGE) return path.dirname(process.env.APPIMAGE);
  if (process.platform === 'darwin') return path.resolve(path.dirname(process.execPath), '../../..');
  return path.dirname(process.execPath);
}
if (app.isPackaged && fs.existsSync(path.join(installDir(), 'portable'))) {
  app.setPath('userData', path.join(installDir(), `${app.getName()} data`));
}

if (!app.requestSingleInstanceLock()) app.exit(0);

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, codeCache: true } },
]);

// The content beside the app: content.pak, opened with this build's key (two shares, joined only here), or a plain
// content/ folder in a dev build. The key never leaves the main process.
async function openSource() {
  const { openDir, openPak } = await import('./pak/source.mjs');
  if (config.content !== 'pak') return openDir(path.join(process.resourcesPath, 'content'));
  const [{ a }, { b }] = await Promise.all([import('./ka.mjs'), import('./kb.mjs')]);
  return openPak(path.join(process.resourcesPath, 'content.pak'), Buffer.from(a.map((x, i) => x ^ b[i])));
}

async function loadExtra(source, quit) {
  const file = path.join(here, 'full', 'full.mjs');
  if (!fs.existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href);
  return mod.create({ source, userData: app.getPath('userData'), quit });
}

// The storage API's main half (desktop/saves/ipc.mjs, #422), when the build carries it
async function registerSaves() {
  const file = path.join(here, 'saves', 'ipc.mjs');
  if (!fs.existsSync(file)) return;
  const { register } = await import(pathToFileURL(file).href);
  register(ipcMain, app.getPath('userData'), { app, dialog, BrowserWindow });
}

function lockDown(extra) {
  const ses = session.defaultSession;
  // only this app's own scheme (and in-memory data/blob URLs); no network at all
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (d, cb) => cb({ cancel: !/^(app|data|blob|devtools):/.test(d.url) }));
  const allowed = new Set(['fullscreen', 'pointerLock', 'clipboard-sanitized-write']);
  ses.setPermissionRequestHandler((_wc, perm, cb, details) => {
    if (perm === 'media') return cb((details.mediaTypes || []).every((t) => t === 'audio')); // the speaking practice
    cb(allowed.has(perm));
  });
  ses.setPermissionCheckHandler((_wc, perm) => allowed.has(perm) || perm === 'media');
  ses.setDevicePermissionHandler(() => false);

  const ours = (u) => {
    try {
      const x = new URL(u);
      return x.protocol === 'app:' && x.host === HOST;
    } catch {
      return false;
    }
  };
  app.on('web-contents-created', (_e, wc) => {
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-attach-webview', (e) => e.preventDefault());
    wc.on('will-navigate', (e, u) => {
      const step = extra?.navigate?.(u);
      if (step) {
        e.preventDefault();
        if (step.quit) app.quit();
        else if (step.to) wc.loadURL(step.to === 'game' ? GAME : step.to);
        return;
      }
      const x = ours(u) && new URL(u);
      if (!x || x.pathname !== '/game3d/index.html') e.preventDefault();
    });
    wc.on('will-frame-navigate', (e) => {
      if (!e.isMainFrame && !ours(e.url)) e.preventDefault();
    });
    wc.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F11') {
        const win = BrowserWindow.fromWebContents(wc);
        win?.setFullScreen(!win.isFullScreen());
        e.preventDefault();
      }
    });
  });
}

function createWindow(start) {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0e121c',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      devTools: !RELEASE,
      spellcheck: false,
      navigateOnDragDrop: false,
      webviewTag: false,
      autoplayPolicy: 'no-user-gesture-required',
      additionalArguments: RELEASE ? ['--app-release'] : [],
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(start);
  return win;
}

app.on('window-all-closed', () => app.quit());

app.whenReady().then(async () => {
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]));
  else Menu.setApplicationMenu(null);
  const source = await openSource();
  const extra = await loadExtra(source, () => app.quit());
  await registerSaves();
  lockDown(extra);
  protocol.handle('app', createHandler({ source, extra, ready: () => extra?.ready?.() ?? true }));
  const start = extra?.start?.() || GAME;
  const win = createWindow(start);
  app.on('second-instance', () => {
    if (win.isMinimized()) win.restore();
    win.focus();
  });
});
