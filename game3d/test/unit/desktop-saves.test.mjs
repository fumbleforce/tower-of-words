// The desktop save files (desktop/saves/): one file per slot plus settings.json and progress.json, atomic writes
// with a .bak, recovery from a damaged file, schema migration, the flush at quit, and the IPC and preload glue.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createFileStore, fileFor, SCHEMA } from '../../../desktop/saves/files.mjs';
import { register, CHANNELS } from '../../../desktop/saves/ipc.mjs';
import { createStorage, desktopBackend } from '../../js/storage.js';
import fixture from '../fixtures/save-v1.json' with { type: 'json' };

const { storageApi } = createRequire(import.meta.url)('../../../desktop/saves/preload-api.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'amakawa-saves-'));
const quiet = () => {
  const lines = [];
  return { lines, warn: (m) => lines.push(m), error: (m) => lines.push(m) };
};
const read = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]).toString('base64');
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');

test('each key goes to its own file: the slots in saves/, settings.json, everything else in progress.json', () => {
  assert.equal(fileFor('amakawa-day1-save'), 'saves/auto.json');
  assert.equal(fileFor('amakawa-auto-meta'), 'saves/auto.json');
  assert.equal(fileFor('amakawa-slot-quick'), 'saves/quick.json');
  assert.equal(fileFor('amakawa-slot-1'), 'saves/slot-01.json');
  assert.equal(fileFor('amakawa-slot-12'), 'saves/slot-12.json');
  assert.equal(fileFor('amakawa-settings'), 'settings.json');
  for (const k of ['amakawa-onboard', 'amakawa-read', 'amakawa.openingSeen', 'some-plugin-key'])
    assert.equal(fileFor(k), 'progress.json');
});

test('values written are on disk after flush and come back in the next start-up snapshot, unknown keys too', async () => {
  const dir = tmp();
  const a = createFileStore(dir, { log: quiet() });
  const save = JSON.stringify(fixture);
  a.set('amakawa-day1-save', save);
  a.set('amakawa-auto-meta', '{"at":5,"line":"Find Mio"}');
  a.set('amakawa-slot-3', JSON.stringify({ v: 2, data: fixture, at: 9 }));
  a.set('amakawa-settings', '{"v":2,"textSpeed":"fast"}');
  a.set('amakawa.openingSeen', '1');
  a.set('another-build-key', '{"kept":true}');
  a.set('odd', 'not json');
  await a.flush();
  assert.equal(a.pending(), false);
  for (const rel of ['saves/auto.json', 'saves/slot-03.json', 'settings.json', 'progress.json'])
    assert.equal(read(dir, rel).schema, SCHEMA, rel);
  assert.deepEqual(read(dir, 'saves/auto.json').keys['amakawa-day1-save'], fixture);
  assert.equal(read(dir, 'progress.json').text.odd, 'not json');
  const snap = createFileStore(dir, { log: quiet() }).snapshot();
  assert.deepEqual(JSON.parse(snap['amakawa-day1-save']), fixture);
  assert.equal(snap['amakawa.openingSeen'], '1');
  assert.equal(snap['another-build-key'], '{"kept":true}');
  assert.equal(snap.odd, 'not json');
  // the facade over this snapshot reads what the browser build would
  const st = createStorage(desktopBackend({ snapshot: snap, set() {}, remove() {} }));
  assert.deepEqual(st.get('amakawa-day1-save'), fixture);
  assert.equal(st.getText('amakawa.openingSeen'), '1');
});

test('a write is atomic: the previous file becomes .bak and no temp file is left', async () => {
  const dir = tmp();
  const s = createFileStore(dir, { log: quiet() });
  s.set('amakawa-slot-quick', '{"n":1}');
  await s.flush();
  s.set('amakawa-slot-quick', '{"n":2}');
  await s.flush();
  assert.equal(read(dir, 'saves/quick.json').keys['amakawa-slot-quick'].n, 2);
  assert.equal(read(dir, 'saves/quick.json.bak').keys['amakawa-slot-quick'].n, 1);
  assert.deepEqual(
    fs.readdirSync(path.join(dir, 'saves')).filter((n) => n.includes('.tmp-')),
    [],
  );
});

test('many quick writes coalesce to the newest value', async () => {
  const dir = tmp();
  const s = createFileStore(dir, { log: quiet() });
  for (let i = 0; i < 50; i++) s.set('amakawa-onboard', JSON.stringify({ uses: i }));
  await s.flush();
  assert.equal(read(dir, 'progress.json').keys['amakawa-onboard'].uses, 49);
});

test('a damaged file falls back to its .bak with a warning, and is moved aside rather than wiped', async () => {
  const dir = tmp();
  const s = createFileStore(dir, { log: quiet() });
  s.set('amakawa-slot-2', '{"good":1}');
  await s.flush();
  s.set('amakawa-slot-2', '{"good":2}');
  await s.flush();
  fs.writeFileSync(path.join(dir, 'saves/slot-02.json'), '{"schema":1,"keys":{"amak');
  const log = quiet();
  const again = createFileStore(dir, { log });
  assert.equal(again.snapshot()['amakawa-slot-2'], '{"good":1}');
  assert.ok(log.lines.some((l) => /damaged/.test(l)));
  assert.ok(log.lines.some((l) => /backup/.test(l)));
  const aside = fs.readdirSync(path.join(dir, 'saves')).filter((n) => n.startsWith('slot-02.json.damaged-'));
  assert.equal(aside.length, 1, 'the damaged file is kept');
  // the next write doesn't put the damaged copy over the good backup
  again.set('amakawa-slot-2', '{"good":3}');
  await again.flush();
  assert.equal(read(dir, 'saves/slot-02.json.bak').keys['amakawa-slot-2'].good, 1);
});

test('a missing file (a crash between the two renames) is read from its .bak; both gone or bad is no crash', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'saves'));
  fs.writeFileSync(
    path.join(dir, 'saves/quick.json.bak'),
    JSON.stringify({ schema: 1, keys: { 'amakawa-slot-quick': { n: 7 } } }),
  );
  fs.writeFileSync(path.join(dir, 'settings.json'), 'garbage');
  fs.writeFileSync(path.join(dir, 'settings.json.bak'), '[]');
  const log = quiet();
  const s = createFileStore(dir, { log });
  assert.equal(s.snapshot()['amakawa-slot-quick'], '{"n":7}');
  assert.equal(s.snapshot()['amakawa-settings'], undefined);
  assert.ok(log.lines.length >= 2);
});

test('migration: a schema-0 file (just the value) is read; a newer schema is read and a copy kept', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'saves'));
  fs.writeFileSync(path.join(dir, 'saves/slot-05.json'), JSON.stringify({ v: 2, data: fixture, at: 3 }));
  fs.writeFileSync(path.join(dir, 'saves/auto.json'), JSON.stringify(fixture));
  fs.writeFileSync(path.join(dir, 'progress.json'), JSON.stringify({ 'amakawa-vnbar': 1 }));
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ schema: 99, keys: { 'amakawa-settings': { v: 2 } } }));
  const log = quiet();
  const snap = createFileStore(dir, { log }).snapshot();
  assert.deepEqual(JSON.parse(snap['amakawa-slot-5']).data, fixture);
  assert.deepEqual(JSON.parse(snap['amakawa-day1-save']), fixture);
  assert.equal(snap['amakawa-vnbar'], '1');
  assert.equal(snap['amakawa-settings'], '{"v":2}');
  assert.ok(fs.existsSync(path.join(dir, 'settings.json.schema99')));
});

test('pictures are image files beside their slot; a new type replaces the old one', async () => {
  const dir = tmp();
  const s = createFileStore(dir, { log: quiet() });
  await s.blobPut('amakawa-slot-3', JPEG);
  assert.deepEqual([...fs.readFileSync(path.join(dir, 'saves/slot-03.jpg'))], [0xff, 0xd8, 0xff, 1, 2, 3]);
  assert.equal(await s.blobGet('amakawa-slot-3'), JPEG);
  await s.blobPut('amakawa-auto-meta', PNG);
  assert.ok(fs.existsSync(path.join(dir, 'saves/auto.png')));
  await s.blobPut('amakawa-slot-3', PNG);
  assert.equal(fs.existsSync(path.join(dir, 'saves/slot-03.jpg')), false);
  assert.equal(await s.blobGet('amakawa-slot-3'), PNG);
  await s.blobDel('amakawa-slot-3');
  assert.equal(await s.blobGet('amakawa-slot-3'), null);
});

test('flushSync at exit writes what was still on its way', () => {
  const dir = tmp();
  const s = createFileStore(dir, { log: quiet() });
  s.set('amakawa-slot-quick', '{"last":true}');
  s.flushSync();
  assert.equal(read(dir, 'saves/quick.json').keys['amakawa-slot-quick'].last, true);
});

function fakeIpcMain() {
  const on = new Map(),
    handle = new Map();
  return {
    on: (ch, fn) => on.set(ch, fn),
    handle: (ch, fn) => handle.set(ch, fn),
    send: (ch, ...a) => on.get(ch)({}, ...a),
    sendSync(ch, ...a) {
      const e = {};
      on.get(ch)(e, ...a);
      return e.returnValue;
    },
    invoke: (ch, ...a) => handle.get(ch)({ sender: {} }, ...a),
  };
}

test('IPC + preload: one synchronous snapshot, async writes, and a quit waits for them', async () => {
  const dir = tmp();
  const ipc = fakeIpcMain();
  const quitHandlers = [];
  let quits = 0;
  const app = { on: (ev, fn) => ev === 'before-quit' && quitHandlers.push(fn), quit: () => quits++ };
  const exitBefore = process.listenerCount('exit');
  const files = register(ipc, dir, { app, log: quiet() });
  const exitHandler = process.listeners('exit').at(-1);
  // the preload's api, over the fake channel pair
  let syncCalls = 0;
  const renderer = {
    sendSync: (...a) => (syncCalls++, ipc.sendSync(...a)),
    send: (...a) => ipc.send(...a),
    invoke: (...a) => ipc.invoke(...a),
  };
  const api = storageApi(renderer);
  assert.equal(syncCalls, 1);
  const st = createStorage(desktopBackend(api));
  assert.equal(st.kind, 'desktop');
  await st.blobs.set('amakawa-slot-1', JPEG);
  assert.equal(await st.blobs.get('amakawa-slot-1'), JPEG);
  st.set('amakawa-slot-1', { v: 2, data: fixture });
  // quitting right after a save: the quit is held until the file is written, then goes ahead
  assert.equal(files.pending(), true);
  let prevented = false;
  quitHandlers[0]({ preventDefault: () => (prevented = true) });
  assert.equal(prevented, true);
  assert.equal(quits, 0);
  await files.flush();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(quits, 1, 'the quit goes ahead once the write is on disk');
  assert.equal(read(dir, 'saves/slot-01.json').keys['amakawa-slot-1'].v, 2);
  // the second before-quit (from that app.quit) is let through
  prevented = false;
  quitHandlers[0]({ preventDefault: () => (prevented = true) });
  assert.equal(prevented, false);
  // bad input from the renderer is ignored
  ipc.send(CHANNELS.set, 42, 'x');
  ipc.send(CHANNELS.set, 'k', { not: 'text' });
  assert.equal(files.snapshot().k, undefined);
  process.removeListener('exit', exitHandler);
  assert.equal(process.listenerCount('exit'), exitBefore);
});

test('export and import go through native dialogs', async () => {
  const dir = tmp();
  const out = path.join(dir, 'mine.amakawa-save');
  const dialog = {
    showSaveDialog: async (_w, o) => ({ canceled: false, filePath: out, o }),
    showOpenDialog: async () => ({ canceled: false, filePaths: [out] }),
  };
  const ipc = fakeIpcMain();
  register(ipc, dir, { dialog, log: quiet() });
  assert.deepEqual(await ipc.invoke(CHANNELS.saveFile, 'Slot 1.amakawa-save', '{"x":1}'), { ok: true, path: out });
  assert.deepEqual(await ipc.invoke(CHANNELS.openFile), { ok: true, name: 'mine.amakawa-save', text: '{"x":1}' });
  const cancel = { showSaveDialog: async () => ({ canceled: true }), showOpenDialog: async () => ({ canceled: true }) };
  const ipc2 = fakeIpcMain();
  register(ipc2, tmp(), { dialog: cancel, log: quiet() });
  assert.equal((await ipc2.invoke(CHANNELS.saveFile, 'a', 'b')).canceled, true);
  assert.equal((await ipc2.invoke(CHANNELS.openFile)).canceled, true);
});
