// The slot store (game3d/js/saves/store.js): twelve manual slots, the quick slot and the autosave; thumbnails in
// IndexedDB with the record as the fallback; old three-slot saves migrate without loss.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSlotStore, progressKey, KEYS, MANUAL, ALL_IDS, slotKey } from '../../js/saves/store.js';
import fixture from '../fixtures/save-v1.json' with { type: 'json' };

function fakeKV({ quota = Infinity } = {}) {
  const m = new Map();
  return {
    m,
    get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
    set(k, v) {
      const raw = JSON.stringify(v);
      const used = [...m].reduce((n, [key, val]) => n + (key === k ? 0 : val.length), 0);
      if (used + raw.length > quota) return false;
      m.set(k, raw);
      return true;
    },
  };
}
function fakeThumbs({ fail = false } = {}) {
  const m = new Map();
  return {
    m,
    get: async (k) => m.get(k) || null,
    set: async (k, v) => {
      if (fail) throw new Error('idb off');
      m.set(k, v);
    },
    del: async (k) => void m.delete(k),
  };
}
const data = (yen, extra = {}) => ({ ...structuredClone(fixture), yen, ...extra });

test('twelve manual slots and the quick slot each keep their own save, picture and details', async () => {
  const kv = fakeKV(), thumbs = fakeThumbs();
  let t = 1000;
  const store = createSlotStore({ kv, thumbs, now: () => t++ });
  assert.equal(MANUAL.length, 12);
  assert.deepEqual(ALL_IDS.slice(0, 2), ['quick', 'auto']);
  for (const id of [...MANUAL, 'quick']) {
    const yen = id === 'quick' ? 1 : id * 10;
    assert.equal(await store.write(id, { data: data(yen), thumb: `pic-${id}`, line: `goal ${id}`, date: 'Thu 1 Oct' }), true);
  }
  for (const id of [...MANUAL, 'quick']) {
    const s = store.info(id);
    assert.equal(s.data.yen, id === 'quick' ? 1 : id * 10);
    assert.equal(s.place, 'office');
    assert.equal(s.period, 'lunch');
    assert.equal(s.day, 1);
    assert.equal(s.line, `goal ${id}`);
    assert.equal(s.label, id === 'quick' ? 'Quick save' : `Slot ${id}`);
    assert.equal(await store.thumb(id), `pic-${id}`);
    assert.equal(kv.get(slotKey(id)).thumb, undefined, 'the picture is in IndexedDB, not localStorage');
  }
  assert.equal(store.latest().id, 'quick');
  assert.equal(store.info('auto'), null);
  assert.equal(store.list().length, 14);
});

test('the autosave is its own entry; loading a slot makes it the autosave with its picture', async () => {
  const kv = fakeKV(), thumbs = fakeThumbs();
  const store = createSlotStore({ kv, thumbs });
  kv.set(KEYS.SAVE, data(5));
  await store.noteAuto({ thumb: 'auto-pic', date: 'Thu 1 Oct', line: 'Find Mio.' });
  assert.equal(store.info('auto').data.yen, 5);
  assert.equal(store.info('auto').line, 'Find Mio.');
  assert.equal(await store.thumb('auto'), 'auto-pic');
  await store.write(5, { data: data(500), thumb: 'five', line: 'Slot five' });
  assert.equal(await store.adopt(5), true);
  assert.equal(kv.get(KEYS.SAVE).yen, 500);
  assert.equal(await store.thumb('auto'), 'five');
  assert.equal(store.info('auto').line, 'Slot five');
  assert.equal(store.info(5).data.yen, 500, 'loading leaves the slot as it was');
});

test('old three-slot saves migrate: data untouched, pictures moved to IndexedDB only once stored', async () => {
  const kv = fakeKV();
  const old = {};
  for (const i of [1, 2, 3]) {
    old[i] = { data: data(i), thumb: `data:image/jpeg;base64,old${i}`, place: 'office', period: 'lunch', date: 'Thu 1 Oct', at: i };
    kv.set(slotKey(i), old[i]);
  }
  kv.set(KEYS.SAVE, data(9));
  kv.set(KEYS.AUTO_META, { at: 4, thumb: 'data:image/jpeg;base64,auto', date: 'Thu 1 Oct' });
  // IndexedDB failing: nothing is dropped
  const failing = createSlotStore({ kv, thumbs: fakeThumbs({ fail: true }) });
  assert.equal(await failing.migrate(), 0);
  assert.equal(kv.get(slotKey(1)).thumb, old[1].thumb);
  assert.equal(await failing.thumb(1), old[1].thumb);
  // IndexedDB working
  const thumbs = fakeThumbs();
  const store = createSlotStore({ kv, thumbs });
  assert.equal(await store.migrate(), 4);
  for (const i of [1, 2, 3]) {
    const s = store.info(i);
    assert.deepEqual(s.data, old[i].data);
    assert.equal(s.at, i);
    assert.equal(s.date, 'Thu 1 Oct');
    assert.equal(kv.get(slotKey(i)).thumb, undefined);
    assert.equal(await store.thumb(i), old[i].thumb);
  }
  assert.equal(await store.thumb('auto'), 'data:image/jpeg;base64,auto');
  assert.equal(store.info('auto').data.yen, 9);
  assert.equal(kv.get(KEYS.VERSION), 2);
  assert.equal(await store.migrate(), 0, 'a second run has nothing to move');
});

test('without IndexedDB the picture stays in the record; a full storage refuses the save', async () => {
  const kv = fakeKV();
  const store = createSlotStore({ kv, thumbs: null });
  assert.equal(await store.write(2, { data: data(2), thumb: 'pic' }), true);
  assert.equal(kv.get(slotKey(2)).thumb, 'pic');
  assert.equal(await store.thumb(2), 'pic');
  const tight = createSlotStore({ kv: fakeKV({ quota: 400 }), thumbs: fakeThumbs() });
  assert.equal(await tight.write(1, { data: data(1), thumb: 'p' }), false);
  assert.equal(tight.info(1), null);
  assert.equal(await store.write('auto', { data: data(1) }), false, 'the autosave is never written by hand');
});

test('progress compares what a load would lose, not where people stand', () => {
  const kv = fakeKV();
  const store = createSlotStore({ kv });
  const a = data(100);
  kv.set(slotKey('quick'), { data: a });
  assert.equal(store.kept(a), true);
  assert.equal(store.kept({ ...a, world: { people: { mio: { position: [1, 0, 1] } } }, runner: { execution: null } }), true);
  assert.equal(store.kept({ ...a, yen: 90 }), false);
  assert.equal(store.kept({ ...a, flags: { ...a.flags, new_flag: true } }), false);
  assert.equal(store.kept({ ...a, ui: { goal: 'Something new.' } }), false);
  assert.notEqual(progressKey(a), progressKey({ ...a, place: 'gate' }));
});
