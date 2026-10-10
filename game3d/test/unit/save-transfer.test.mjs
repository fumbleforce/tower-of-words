// Export and import of one save (game3d/js/saves/transfer.js): an exported slot reads back into a slot unchanged,
// and a file that isn't a save, is damaged, or comes from a newer build is refused before it touches a slot.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportText, exportName, parseSave, saveFile, openFile, FORMAT, VERSION } from '../../js/saves/transfer.js';
import { createSlotStore } from '../../js/saves/store.js';
import fixture from '../fixtures/save-v1.json' with { type: 'json' };

const JPEG = 'data:image/jpeg;base64,/9j/AAAA';
const info = { data: structuredClone(fixture), line: 'Find Mio', date: 'Thu 1 Oct', at: 5, day: 1, place: 'office' };

function memStore() {
  const m = new Map(),
    t = new Map();
  const kv = { get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => (m.set(k, JSON.stringify(v)), true) };
  const thumbs = { get: async (k) => t.get(k) || null, set: async (k, v) => void t.set(k, v), del: async (k) => void t.delete(k) };
  return createSlotStore({ kv, thumbs });
}

test('an exported save imports into a slot with its game, line, date and picture', async () => {
  const text = exportText(info, JPEG);
  const f = JSON.parse(text);
  assert.equal(f.format, FORMAT);
  assert.equal(f.version, VERSION);
  const check = parseSave(text);
  assert.equal(check.ok, true);
  const store = memStore();
  assert.equal(await store.write(4, check.slot), true);
  const s = store.info(4);
  assert.deepEqual(s.data, fixture);
  assert.equal(s.line, 'Find Mio');
  assert.equal(s.date, 'Thu 1 Oct');
  assert.equal(await store.thumb(4), JPEG);
  assert.match(exportName(info, new Date(2026, 9, 10, 9, 5)), /^amakawa-day1-office-2026-10-10-0905\.amakawa-save$/);
});

test('files that are not saves, damaged saves and saves from a newer build are refused with a reason', () => {
  const good = JSON.parse(exportText(info, null));
  const bad = (mut) => {
    const f = structuredClone(good);
    mut(f);
    return parseSave(JSON.stringify(f));
  };
  for (const r of [
    parseSave(''),
    parseSave('not json'),
    parseSave('[]'),
    parseSave('{"hello":1}'),
    parseSave(JSON.stringify(fixture)), // a bare save without the envelope
    bad((f) => (f.format = 'other-game')),
  ])
    assert.deepEqual(r, { ok: false, error: "That file isn't an Amakawa save." });
  const newer = bad((f) => (f.version = VERSION + 1));
  assert.equal(newer.ok, false);
  assert.match(newer.error, /newer version/);
  for (const mut of [
    (f) => (f.version = 0),
    (f) => (f.version = '1'),
    (f) => delete f.slot,
    (f) => (f.slot.data = 'x'),
    (f) => (f.slot.data.v = 2),
    (f) => delete f.slot.data.place,
    (f) => (f.slot.data.day = 0),
    (f) => (f.slot.data.flags = []),
    (f) => (f.slot.data.inv = 'coffee'),
    (f) => (f.slot.data.yen = '100'),
    (f) => (f.thumb = 'javascript:alert(1)'),
    (f) => (f.thumb = 42),
  ]) {
    const r = bad(mut);
    assert.equal(r.ok, false, String(mut));
    assert.match(r.error, /damaged/);
  }
});

test('the line and date are trimmed to text, and a missing picture is fine', () => {
  const f = JSON.parse(exportText(info, null));
  f.slot.line = 'x'.repeat(1000);
  f.slot.date = 7;
  const r = parseSave(JSON.stringify(f));
  assert.equal(r.ok, true);
  assert.equal(r.slot.line.length, 300);
  assert.equal(r.slot.date, '');
  assert.equal(r.slot.thumb, null);
});

test('on the desktop the files go through its dialogs', async () => {
  const calls = [];
  const files = {
    save: async (name, text) => (calls.push(['save', name, text.length]), { ok: true, path: '/x/' + name }),
    open: async () => (calls.push(['open']), { ok: true, name: 'a.amakawa-save', text: '{}' }),
  };
  assert.equal((await saveFile('n.amakawa-save', 'abc', files)).ok, true);
  assert.equal((await openFile(files)).text, '{}');
  assert.deepEqual(calls, [['save', 'n.amakawa-save', 3], ['open']]);
});
