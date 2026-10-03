import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test, beforeEach } from 'node:test';

// the same browser stand-ins as save-restore.test.mjs, so the real sim save runs in Node
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
const canvas = { width: 100, height: 100 };
globalThis.document = {
  querySelector: selector => selector === '#c' ? canvas : null,
  addEventListener() {},
  createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,fixture' }),
  body: { classList: { contains: () => false, add() {} } },
};
const S = await import('../../js/sim.js');
const { flags, cond } = await import('../../js/narrative/state.js');
const { createTickets, statusFlag, readFlag } = await import('../../js/tickets/model.js');
const story = (await import('../../story/tickets.js')).default;

const defs = {
  'T-0001': { title: 'Doors', from: 'emi', text: 'Test the doors.', pay: 5000, done: 'doors_tested' },
  'T-0002': { title: 'Second', from: 'mori', text: 'Another.', pay: 3000 },
};
let paid = [];
const make = () => createTickets({ flags, cond, defs: () => defs, onClose: (id, pay) => paid.push([id, pay]) });
let game;
beforeEach(() => {
  paid = [];
  globalThis.localStorage.clear();
  for (const k of Object.keys(flags)) delete flags[k];
  game = { found: new Set(), hooks: {}, runner: { run: async () => {}, trigger: () => {} },
    place: { name: 'dorms', people: {} }, story: {}, busy: false, queue: [], beat: fn => fn() };
  globalThis.window.__game = game;
  S.restore(game, { v: 1, day: 2, period: 'morning', rel: { bonds: { v: 1, day: 2, p: {}, rel: {} } } });
  S.installSim(game);
});

test('a ticket goes new, in progress, done; its status is a flag conditions can read', () => {
  const t = make();
  assert.equal(statusFlag('T-0002'), 'ticket_T0002');
  assert.equal(t.status('T-0002'), null);
  assert.deepEqual(t.list(), []);
  assert.equal(t.add('T-0002'), true);
  assert.equal(t.add('T-0002'), false, 'adding twice does nothing');
  assert.equal(cond("ticket_T0002 == 'new'"), true);
  assert.equal(t.start('T-0002'), true);
  assert.equal(cond("ticket_T0002 == 'progress'"), true);
  assert.equal(t.add('T-0002'), false, 'adding an existing ticket never resets it');
  assert.equal(t.close('T-0002'), true);
  assert.equal(t.start('T-0002'), false, 'a closed ticket is not reopened by taking it');
  assert.equal(cond("ticket_T0002 == 'done'"), true);
  assert.equal(t.add('T-9999'), false, 'unknown ids are refused');
  assert.equal(flags.ticket_T9999, undefined);
});

test('a ticket closes itself when its done condition holds, and the list is in id order', () => {
  const t = make();
  t.add('T-0002');
  t.add('T-0001');
  assert.deepEqual(t.list().map(x => x.id), ['T-0001', 'T-0002']);
  assert.deepEqual(t.sync(), []);
  flags.doors_tested = true;
  assert.deepEqual(t.sync(), ['T-0001']);
  assert.equal(t.status('T-0001'), 'done');
  assert.equal(t.open(), 1);
  t.markRead('T-0001');
  assert.equal(flags[readFlag('T-0001')], true);
  assert.equal(t.list()[0].read, true);
  assert.equal(t.list()[1].read, false);
});

test('tickets survive a save and a restore', () => {
  const t = make();
  t.add('T-0001');
  t.add('T-0002');
  t.start('T-0002');
  t.markRead('T-0002');
  S.save(game);
  const saved = JSON.parse(JSON.stringify(S.loadSave()));
  for (const k of Object.keys(flags)) delete flags[k];
  assert.deepEqual(make().list(), []);
  S.restore(game, saved);
  const back = make();
  assert.deepEqual(back.list().map(x => [x.id, x.status, x.read]), [['T-0001', 'new', false], ['T-0002', 'progress', true]]);
});

test('closing a ticket pays Eric once, by hook or by its condition, and never on taking it', () => {
  const t = make();
  t.add('T-0001');
  t.add('T-0002');
  t.start('T-0002');
  assert.deepEqual(paid, []);
  t.close('T-0002');
  t.close('T-0002');
  assert.deepEqual(paid, [['T-0002', 3000]], 'paid once');
  flags.doors_tested = true;
  t.sync();
  t.sync();
  assert.deepEqual(paid, [['T-0002', 3000], ['T-0001', 5000]]);
  assert.equal(t.earned(), 8000);
  assert.equal(t.list()[0].pay, 5000);
});

test('the story tickets have the fields the app shows', () => {
  for (const [id, d] of Object.entries(story)) {
    assert.match(id, /^T-\d{4}$/);
    for (const k of ['title', 'from', 'text']) assert.equal(typeof d[k], 'string', `${id}.${k}`);
    assert.ok(Number.isInteger(d.pay) && d.pay > 0, `${id}.pay is a whole number of yen`);
  }
});
