// The storage facade (game3d/js/storage.js): the same calls work over the browser backend (localStorage with the
// game's old keys and value strings) and the desktop backend (the preload's snapshot plus async writes), and nothing
// throws when storage is off or full.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStorage, browserBackend, desktopBackend } from '../../js/storage.js';
import { createSlotStore, KEYS } from '../../js/saves/store.js';
import fixture from '../fixtures/save-v1.json' with { type: 'json' };

function fakeLocal({ quota = Infinity } = {}) {
  const m = new Map();
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      if (String(v).length > quota) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => void m.delete(k),
  };
}
function fakeDesktop(snapshot = {}) {
  const sent = [];
  const blobs = new Map();
  return {
    sent,
    blobs,
    snapshot,
    set: (k, s) => sent.push(['set', k, s]),
    remove: (k) => sent.push(['remove', k]),
    blobGet: async (k) => blobs.get(k) || null,
    blobPut: async (k, v) => void blobs.set(k, v),
    blobDel: async (k) => void blobs.delete(k),
    saveFile: async () => ({ ok: true }),
    openFile: async () => ({ ok: false }),
  };
}

test('browser: an old save, settings and flags read back exactly as the game wrote them before', () => {
  const ls = fakeLocal();
  ls.m.set(KEYS.SAVE, JSON.stringify(fixture));
  ls.m.set('amakawa-settings', '{"v":2,"textSpeed":1}');
  ls.m.set('amakawa.openingSeen', '1');
  const st = createStorage(browserBackend(() => ls, () => null));
  assert.equal(st.kind, 'browser');
  assert.equal(st.works(), true);
  assert.deepEqual(st.get(KEYS.SAVE), fixture);
  assert.deepEqual(st.get('amakawa-settings'), { v: 2, textSpeed: 1 });
  assert.equal(st.getText('amakawa.openingSeen'), '1');
  assert.equal(st.get('missing'), null);
  // writes keep the same strings: JSON for values, the text itself for flags
  assert.equal(st.set('amakawa-read', ['a', 'b']), true);
  assert.equal(ls.m.get('amakawa-read'), '["a","b"]');
  assert.equal(st.setText('amakawa-vnbar', '1'), true);
  assert.equal(ls.m.get('amakawa-vnbar'), '1');
  assert.equal(st.remove('amakawa-read'), true);
  assert.equal(ls.m.has('amakawa-read'), false);
  assert.equal(st.blobs, null, 'no IndexedDB: pictures stay in their records');
});

test('browser: storage off or full reads null and writes false, never throws', () => {
  // a blocked browser throws as soon as localStorage is touched
  const off = createStorage(
    browserBackend(
      () => {
        throw new Error('SecurityError');
      },
      () => null,
    ),
  );
  assert.equal(off.get('k'), null);
  assert.equal(off.getText('k'), null);
  assert.equal(off.set('k', 1), false);
  assert.equal(off.remove('k'), false);
  assert.equal(off.works(), false);
  const fullLocal = fakeLocal({ quota: 4 });
  const full = createStorage(browserBackend(() => fullLocal, () => null));
  assert.equal(full.set('k', 'too long'), false);
  const bad = fakeLocal();
  bad.m.set('k', '{not json');
  assert.equal(createStorage(browserBackend(() => bad, () => null)).get('k'), null);
});

test('browser: localStorage is looked up on each call, so a test can swap it after import', () => {
  let ls = fakeLocal();
  const st = createStorage(browserBackend(() => ls, () => null));
  st.set('a', 1);
  ls = fakeLocal();
  assert.equal(st.get('a'), null);
});

test('desktop: reads come from the startup snapshot, writes update it at once and go to the shell', async () => {
  const api = fakeDesktop({ [KEYS.SAVE]: JSON.stringify(fixture), 'amakawa-vnbar': '1' });
  const st = createStorage(desktopBackend(api));
  assert.equal(st.kind, 'desktop');
  assert.deepEqual(st.get(KEYS.SAVE), fixture);
  assert.equal(st.getText('amakawa-vnbar'), '1');
  assert.equal(st.set('amakawa-onboard', { moved: true }), true);
  assert.deepEqual(st.get('amakawa-onboard'), { moved: true }, 'read back before the file is written');
  st.remove('amakawa-vnbar');
  assert.equal(st.getText('amakawa-vnbar'), null);
  assert.deepEqual(api.sent, [
    ['set', 'amakawa-onboard', '{"moved":true}'],
    ['remove', 'amakawa-vnbar'],
  ]);
  await st.blobs.set('amakawa-slot-1', 'data:image/jpeg;base64,AAAA');
  assert.equal(await st.blobs.get('amakawa-slot-1'), 'data:image/jpeg;base64,AAAA');
  assert.equal(await st.blobs.get('nothing'), null);
  assert.ok(st.files, 'native file dialogs on the desktop');
});

test('the slot store runs unchanged over either backend', async () => {
  const ls = fakeLocal();
  for (const st of [
    createStorage(browserBackend(() => ls, () => null)),
    createStorage(desktopBackend(fakeDesktop())),
  ]) {
    const store = createSlotStore({ kv: st, thumbs: st.blobs });
    assert.equal(await store.write(3, { data: structuredClone(fixture), thumb: 'pic', line: 'goal' }), true);
    assert.equal(store.info(3).place, fixture.place);
    assert.equal(await store.thumb(3), 'pic');
    assert.equal(await store.adopt(3), true);
    assert.deepEqual(st.get(KEYS.SAVE), fixture);
  }
});

test('readOnly drops writes to every key but the kept ones until reload', () => {
  const ls = fakeLocal();
  ls.m.set(KEYS.SAVE, '{"v":1}');
  const st = createStorage(browserBackend(() => ls, () => null));
  st.readOnly(['amakawa-settings']);
  assert.equal(st.set(KEYS.SAVE, { v: 1, day: 9 }), true);
  assert.equal(st.remove(KEYS.SAVE), true);
  assert.equal(ls.m.get(KEYS.SAVE), '{"v":1}');
  st.set('amakawa-settings', { v: 2 });
  assert.equal(ls.m.get('amakawa-settings'), '{"v":2}');
});
