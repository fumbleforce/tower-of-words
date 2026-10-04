import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test, beforeEach } from 'node:test';
import savedBaseline from '../fixtures/save-v1.json' with { type: 'json' };

register(new URL('../support/save-loader.mjs', import.meta.url));
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), clear: () => data.clear() };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.fetch = async () => ({ ok: false, json: async () => [] });
globalThis.location = { search: '', reload() {} };
const classes = new Set();
const canvas = { width: 100, height: 100 };
globalThis.document = {
  querySelector: selector => selector === '#c' ? canvas : null,
  addEventListener() {},
  createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,fixture' }),
  body: { classList: { contains: name => classes.has(name), add: name => classes.add(name) } },
};
const S = await import('../../js/sim.js');
const { flags } = await import('../../js/runner.js');
const { known, seen } = await import('../../js/lang.js');
const { Bonds } = await import('../../js/bonds/model.js');
const { CAST } = await import('../../js/bonds/cast.js');
const initialSim = structuredClone(S.sim);
// Prevent shell background loops during import; later only scheduled reload and
// thumbnail callbacks are controlled. No game saving operation is replaced.
const realInterval = globalThis.setInterval, realTimeout = globalThis.setTimeout;
globalThis.setInterval = () => 0;
globalThis.setTimeout = () => 0;
const menu = await import('../../js/menu.js');
globalThis.setInterval = realInterval;
globalThis.setTimeout = realTimeout;
let game;
function reset() {
  localStorage.clear(); sessionStorage.clear(); classes.clear();
  known.clear(); seen.clear();
  for (const key of Object.keys(flags)) delete flags[key];
  Object.assign(S.sim, structuredClone(initialSim));
  Object.assign(S.bonds, new Bonds({ cast: CAST, flag: key => !!flags[key] }));
  S.bonds.relChanged = new Set();
  game = { found: new Set(), hooks: {}, runner: { run: async () => {}, trigger: () => {} },
    place: { name: 'office', people: {} }, story: {}, busy: false, queue: [], beat: fn => fn() };
  window.__game = game;
  S.restore(game, { v: 1, day: 1, period: 'early', rel: { bonds: { v: 1, day: 1, p: {}, rel: {} } } });
  S.installSim(game);
}
beforeEach(reset);

test('simulation saves earlier-place gates and restores them before entering the current story', () => {
  S.absorb({ gates: { mio: { 3: 'train_trust', 4: 'train_close' } } });
  S.save(game);
  const saved = S.loadSave();
  reset();
  S.restore(game, saved);
  S.absorb({ gates: { mio: { 4: 'office_close' } } });
  assert.equal(S.bonds.gate('mio', 3), 'train_trust');
  assert.equal(S.bonds.gate('mio', 4), 'office_close');
  S.bonds.person('mio').met = true;
  S.bonds.person('mio').pts = 14;
  flags.train_trust = true;
  assert.equal(S.bonds.step('mio'), 3);
  S.save(game);
  assert.deepEqual(S.loadSave().rel.bonds.gates.mio, { 3: 'train_trust', 4: 'office_close' });
});

function seed() {
  S.absorb({ people: { mio: { name: 'Mio' }, mori: { name: 'Mr. Mori' } } });
  S.sim.period = 'lunch'; flags.period = 'lunch'; flags.place = 'office';
  flags.copier = true; flags.practice_ugoite = 3;
  S.meet(game, 'mio'); S.meet(game, 'mori');
  S.bond(game, 'mio', 2, { source: 'scene', key: 'save-fixture', why: 'fixture' });
  S.remember(game, 'mio', 'held_doors', 'Held the doors.');
  S.learnFact(game, 'mio', 'her_list', 'She keeps a list.', 'coffee');
  S.relate('mio', 'mori', 'owes');
  assert.equal(S.buy(game, 'coffee'), true);
  assert.equal(S.buy(game, 'tea'), true);
  S.noteTeacher('mio', 'ugoite');
  known.add('ugoite'); known.add('ohayo'); seen.add('ugoite');
  game.found.add('office:copier');
  S.sim.momentsDone.add('office/lunch'); S.sim.firedBonds.add('mio@2');
  S.save(game);
  const snapshot = S.loadSave();
  snapshot.rel.ambient = ['office-chat@1.lunch'];
  S.restore(game, snapshot);
  S.save(game);
  return S.loadSave();
}
test('whole simulation save restores words, inventory, flags, relationships and one-shot state', () => {
  const saved = seed();
  assert.deepEqual(saved, { ...savedBaseline, pendingStart: null }, 'legacy values plus explicit completed-opening marker');
  assert.deepEqual(saved.known, ['ugoite', 'ohayo']);
  assert.deepEqual(saved.inv, ['coffee', 'tea']);
  assert.equal(saved.yen, 750);
  assert.equal(saved.rel.bonds.p.mio.pts, 2);
  assert.deepEqual(saved.rel.bonds.p.mio.seen, ['held_doors']);
  assert.equal(saved.rel.bonds.p.mio.facts[0].key, 'her_list');
  assert.equal(saved.rel.bonds.rel['mio>mori'], 'owes');
  reset();
  S.restore(game, JSON.parse(JSON.stringify(saved)));
  assert.equal(S.sim.steps.mio, 1);
  assert.equal(S.sim.date, 'Thu 1 Oct');
  assert.deepEqual([...known], saved.known);
  assert.deepEqual([...seen], saved.seen);
  assert.deepEqual([...game.found], saved.found);
  assert.equal(S.rememberedBy('mio', 'held_doors'), true);
  assert.equal(S.bonds.relation('mio', 'mori'), 'owes');
  S.save(game);
  assert.deepEqual(S.loadSave(), saved, 'entire v1 save survives a round trip');
});
test('legacy commute saves migrate periods and numeric bonds without clearing existing flags or words', () => {
  flags.existing = 9; known.add('ohayo'); seen.add('ohayo'); game.found.add('existing');
  S.restore(game, { v: 1, day: 2, period: 'commute', bonds: { mio: 7 }, met: ['mio'],
    flags: { old: true }, known: ['matte'], seen: ['matte'], found: ['old'], place: 'train' });
  assert.equal(S.sim.period, 'early');
  assert.equal(S.sim.date, 'Fri 2 Oct');
  assert.equal(S.sim.yen, 1000);
  assert.equal(S.bonds.day, 2);
  assert.equal(S.bonds.p.mio.pts, 7);
  assert.equal(S.sim.steps.mio, 2);
  assert.equal(flags.existing, 9);
  assert.deepEqual([...known], ['ohayo', 'matte']);
  assert.deepEqual([...seen], ['ohayo', 'matte']);
  assert.deepEqual([...game.found], ['existing', 'old']);
  assert.equal(game.place.name, 'office', 'restore leaves actual place entry to main');
});
test('save loading rejects corrupt and unsupported versions; disabled storage stays nonfatal', () => {
  for (const value of ['{', 'null', '{"v":2}']) {
    localStorage.setItem('amakawa-day1-save', value);
    assert.equal(S.loadSave(), null);
  }
  const original = globalThis.localStorage;
  globalThis.localStorage = new Proxy({}, { get: () => () => { throw new Error('storage denied'); } });
  try {
    assert.doesNotThrow(() => S.save(game));
    assert.equal(S.loadSave(), null);
    assert.doesNotThrow(() => S.clearSave());
  } finally { globalThis.localStorage = original; }
});
test('real menu slots retain separate saves and thumbnails, and loading stages Continue', async () => {
  seed();
  const reloads = [], originalTimeout = globalThis.setTimeout, originalReload = location.reload;
  let reloadCount = 0;
  location.reload = () => { reloadCount++; };
  globalThis.setTimeout = (fn, delay) => { if (delay === 0) fn(); else reloads.push({ fn, delay }); return 0; };
  globalThis.requestAnimationFrame = fn => fn();
  try {
    for (const i of [1, 2, 3, 12, 'quick']) {
      S.sim.yen = 100 * (i === 'quick' ? 7 : i);
      assert.equal(await menu.saving.saveTo(i), true);
      const slot = menu.saving.store.info(i);
      assert.equal(slot.data.yen, 100 * (i === 'quick' ? 7 : i));
      assert.equal(await menu.saving.store.thumb(i), 'data:image/jpeg;base64,fixture');
      assert.equal(slot.place, 'office');
      assert.equal(slot.period, 'lunch');
      assert.equal(slot.date, 'Thu 1 Oct');
      assert.ok(slot.at > 0);
    }
    assert.equal(menu.saving.store.info(1).data.yen, 100);
    assert.equal(menu.saving.store.info(2).data.yen, 200);
    assert.equal(menu.saving.store.info(3).data.yen, 300);
    await menu.saving.loadInto(menu.saving.store.info(2));
    assert.equal(S.loadSave().yen, 200);
    assert.equal(await menu.saving.store.thumb('auto'), 'data:image/jpeg;base64,fixture');
    assert.equal(sessionStorage.getItem('amakawa-continue'), '1');
    assert.equal(classes.has('reloading'), true);
    assert.equal(reloads.at(-1).delay, 250);
    reloads.at(-1).fn();
    assert.equal(reloadCount, 1);
    S.clearSave();
    assert.equal(S.loadSave(), null);
    assert.equal(menu.saving.store.info(1).data.yen, 100, 'clearing autosave preserves manual slots');
  } finally { globalThis.setTimeout = originalTimeout; location.reload = originalReload; delete globalThis.requestAnimationFrame; }
});
test('restored schedule applies its real instant placement, seating and hide operations', () => {
  S.restore(game, { v: 1, day: 1, period: 'lunch', flags: { allow: true } });
  const calls = [];
  game.story = { schedule: { mio: { lunch: { at: 'bench' } }, mori: { lunch: { sit: 'chair' } },
    kenji: { lunch: { hide: true } } } };
  for (const id of ['mio', 'mori', 'kenji']) game.place.people[id] = { root: { visible: true, position: { x: 0, z: 0 } } };
  game.posOf = id => id === 'bench' ? [3, 4] : null;
  game.place.placeSeated = (who, at) => calls.push(['seat', who, at]);
  game.hooks.hide = ({ id }) => calls.push(['hide', id]);
  S.applySchedule(game, { instant: true });
  assert.deepEqual(game.place.people.mio.root.position, { x: 3, z: 4 });
  assert.deepEqual(calls, [['seat', 'mori', 'chair'], ['hide', 'kenji']]);
});
test('autosave at the title continues directly; manual slot reload consumes its Continue flag once', () => {
  seed();
  let clicks = 0;
  const button = { click: () => { clicks++; } };
  const title = { hidden: false, dataset: { shell: '1' }, querySelector: selector =>
    selector === '.cont' ? button : { querySelector: () => ({}) } };
  const originalQuery = document.querySelector;
  document.querySelector = selector => selector === '#title' ? title : selector === '#title .cont' ? button : null;
  globalThis.requestAnimationFrame = () => 0;
  try {
    classes.add('at-title');
    menu.saving.loadInto(menu.saving.store.info('auto'));
    assert.equal(clicks, 1);
    assert.equal(sessionStorage.getItem('amakawa-continue'), null);
    assert.equal(classes.has('reloading'), false);
    sessionStorage.setItem('amakawa-continue', '1');
    menu.onTitleShow();
    assert.equal(clicks, 2);
    assert.equal(sessionStorage.getItem('amakawa-continue'), null);
    menu.onTitleShow();
    assert.equal(clicks, 2, 'repeated title notifications cannot continue twice');
  } finally { document.querySelector = originalQuery; delete globalThis.requestAnimationFrame; }
});

test('restore preserves zero yen and replaces existing one-shot state', () => {
  S.sim.momentsDone.add('stale/moment'); S.sim.firedBonds.add('stale@2');
  S.restore(game, { ...structuredClone(savedBaseline), yen: 0,
    rel: { ...structuredClone(savedBaseline.rel), moments: ['saved/moment'], fired: ['saved@2'] } });
  assert.equal(S.sim.yen, 0);
  assert.deepEqual([...S.sim.momentsDone], ['saved/moment']);
  assert.deepEqual([...S.sim.firedBonds], ['saved@2']);
});
test('unknown purchases leave money and inventory unchanged', () => {
  const before = { yen: S.sim.yen, inv: [...S.sim.inv] };
  assert.equal(S.buy(game, 'nope'), false);
  assert.deepEqual({ yen: S.sim.yen, inv: S.sim.inv }, before);
});

test('boot suppression preserves the existing autosave and real saves retain once triggers and room state', () => {
  const saved = seed();
  game.saveEnabled = false;
  S.sim.yen = 0;
  S.save(game);
  assert.deepEqual(S.loadSave(), saved);
  game.saveEnabled = true;
  game.runner.onceDone = new Set(['zone:past_gate>past_gate']);
  game.place.snapshotState = () => ({ gateOpen: true, cardOk: true });
  S.save(game);
  const current = S.loadSave();
  assert.equal(current.yen, 0);
  assert.deepEqual(current.runner, { onceDone: ['zone:past_gate>past_gate'] });
  assert.deepEqual(current.world, { gateOpen: true, cardOk: true });
  game.runner.onceDone.add('stale');
  S.restore(game, current);
  assert.deepEqual([...game.runner.onceDone], ['zone:past_gate>past_gate']);
  S.restore(game, savedBaseline);
  assert.deepEqual([...game.runner.onceDone], [], 'legacy saves have no completed-once metadata');
});

test('save retains pending travel, destination opening and the completed-day state', () => {
  game.transition = { from: 'gate', to: 'office', phase: 'arriving' };
  game.pendingStart = 'office';
  S.save(game);
  const travelling = S.loadSave();
  S.restore(game, travelling);
  assert.deepEqual(game.transition, travelling.transition);
  assert.equal(game.pendingStart, 'office');
  game.transition = null; game.pendingStart = null; game.ended = true;
  S.save(game);
  const ended = S.loadSave();
  assert.equal(ended.ended, true);
  assert.equal(ended.transition, undefined);
  assert.equal(ended.pendingStart, null);
  S.restore(game, savedBaseline);
  assert.equal(game.ended, false);
  assert.equal(game.transition, null);
  assert.equal(game.pendingStart, null);
});

test('quick save keeps the game, progress after it counts as unsaved, and quick load restores it exactly', async () => {
  seed();
  const originalTimeout = globalThis.setTimeout, originalReload = location.reload;
  location.reload = () => {};
  globalThis.setTimeout = (fn, delay) => { if (delay === 0) fn(); return 0; };
  globalThis.requestAnimationFrame = fn => fn();
  try {
    S.save(game);
    const before = S.loadSave();
    assert.equal(await menu.saving.saveTo('quick'), true);
    assert.equal(menu.saving.unsaved(), false, 'nothing since the quick save');
    assert.equal(S.buy(game, 'melon'), true);
    flags.after_quick = true;
    assert.equal(menu.saving.unsaved(), true, 'a purchase and a flag after it are unsaved progress');
    assert.equal(await menu.saving.loadInto(menu.saving.store.info('quick')), true);
    assert.equal(game.saveEnabled, false, 'nothing in play writes over the loaded save before the reload');
    const loaded = S.loadSave();
    assert.deepEqual(loaded, before);
    assert.equal(sessionStorage.getItem('amakawa-continue'), '1');
    reset();
    S.restore(game, loaded);
    assert.equal(S.sim.yen, before.yen);
    assert.deepEqual(S.sim.inv, before.inv);
    assert.equal(flags.after_quick, undefined);
  } finally { globalThis.setTimeout = originalTimeout; location.reload = originalReload; delete globalThis.requestAnimationFrame; }
});
