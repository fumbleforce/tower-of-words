import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';
register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.window = globalThis;
globalThis.location = { search: '' };
globalThis.addEventListener = () => {};
globalThis.fetch = async () => ({ ok: false });
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { newFrame, readCheckpoint } = await import('../../js/narrative/checkpoint.js');
const { migrateSwimmingSave } = await import('../../js/saves/swimming.js');
const legacy = JSON.parse(readFileSync(new URL('../fixtures/swimming-legacy-stories.json', import.meta.url)));
const { Runner, flags } = await import('../../js/runner.js');
const { poolAction, completedPoolAction } = await import('../../js/places/day3/pool-action.js');
const CLUBS = (await import('../../story/clubs.js')).default;
const STORY = (await import('../../story/ongoing/pool.js')).default;
function fixture(extra = {}, choices = []) {
  for (const key of Object.keys(flags)) delete flags[key];
  Object.assign(flags, { day: 10, place: 'pool', period: 'evening', period_evening: true, club_swimming: true, d3_kuro_intro: true, met_emi: true, d3_emi_intro: true }, extra);
  const awards = [], actions = [], menus = [], lines = [];
  const P = { name: 'pool', space: {} }, game = { place: P, ui: {}, hooks: {} };
  const action = poolAction(game);
  const run = async step => { actions.push(step); if (game.pause?.(step)) await action.wait(new Promise(resolve => { game.unblock = resolve; })); };
  game.hooks.poolSession = completedPoolAction(game, P.space, action, run);
  for (const id of ['cam', 'gesture', 'sit', 'stand', 'goal', 'ongoingGoal', 'save', 'meet', 'face', 'fact']) game.hooks[id] = () => {};
  game.hooks.trip = ({ to }) => { game.place.name = to; };
  for (const id of ['bond', 'bondStep', 'remember']) game.hooks[id] = step => awards.push(step);
  globalThis.__saveTestUI = { say: (_who, line) => lines.push(line), choose: (_who, _prompt, options) => {
    menus.push(options); const text = choices.shift(); const index = options.findIndex(o => o.html.includes(text));
    assert.ok(index >= 0, `missing ${text} in ${JSON.stringify(options)}`); return index;
  } };
  game.runner = new Runner(game); game.runner.use(P, { ...STORY, nodes: { ...CLUBS.nodes, ...STORY.nodes } });
  return { game, P, action, actions, awards, menus, lines };
}
test('unfinished first visit is offered after any number of attended/declined meetings', async () => {
  const f = fixture({ clubprog_swimming: 4 }, ['Leave them to their evening.']);
  await f.game.runner.run('ongoing_swimming');
  assert.equal(flags.d3_swim_done, undefined); assert.equal(flags.d3_swimming_shared, undefined);
  assert.equal(f.awards.filter(a => a.do === 'bond').length, 0);
  f.game.place.name = 'pool'; flags.day = 17;
  globalThis.__saveTestUI.choose = (_who, _prompt, options) => options.findIndex(o => o.html.includes('Sit on the deck') || o.html.includes('Sit with them after'));
  await f.game.runner.run('ongoing_swimming');
  assert.equal(flags.d3_swim_done, true); assert.equal(flags.d3_swimming_shared, true);
  assert.equal(flags.swim_practice_done, undefined);
  assert.equal(f.awards.filter(a => a.do === 'bond').length, 2);
});
test('repeat swimming and watching use the current sheet handover and pay their own award only once', async () => {
  const f = fixture({ d3_swim_done: true, d3_swimming_shared: true }, ['Sit on the deck and watch.', 'Sit with them after the swim.']);
  await f.game.runner.run('ongoing_swimming');
  assert.ok(f.actions.some(a => a.state === 'list' && a.from === 'attendant'));
  assert.equal(flags.swim_practice_done, true); assert.equal(f.awards.filter(a => a.do === 'bond').length, 2);
  assert.ok(!f.lines.some(text => /nearly stayed upstairs|goggles in my work bag/.test(text)));
  globalThis.__saveTestUI.choose = (_who, _prompt, options) => options.findIndex(o => o.html.includes('Swim with Kuro.') || o.html.includes('Sit with them after'));
  flags.day = 17; await f.game.runner.run('ongoing_swimming');
  assert.equal(flags.d3_player_swims, true); assert.equal(f.awards.filter(a => a.do === 'bond').length, 2);
});
test('completed historical practice does not pay again and a first pool visit retains its previous shared award', async () => {
  const f = fixture({ d3_swim_done: true, d3_swimming_shared: true, winter_practice_done: true }, ['Sit on the deck and watch.', 'Sit with them after the swim.']);
  await f.game.runner.run('ongoing_swimming'); assert.equal(f.awards.filter(a => a.do === 'bond').length, 0);
});
test('Emi milestone follows completed physical sheet collection, swimming and sitting, and cannot replay', async () => {
  const f = fixture({ d3_swim_done: true, d3_swimming_shared: true, bondready_emi: 3 }, ['Could he keep the sheet while you swim?']);
  await f.game.runner.run('ongoing_swimming');
  assert.equal(flags.ms3_emi, true);
  assert.deepEqual(f.actions.slice(-5).map(a => a.state), ['sheetBack', 'emiEnter', 'length', 'sit', 'free']);
  assert.equal(f.awards.filter(a => a.do === 'bondStep').length, 1);
  globalThis.__saveTestUI.choose = (_who, _prompt, options) => options.findIndex(o => o.html.includes('Leave them to their evening.'));
  await f.game.runner.run('ongoing_swimming'); assert.equal(f.awards.filter(a => a.do === 'bondStep').length, 1);
});
test('declining the booking-sheet milestone leaves it available and awards nothing', async () => {
  const f = fixture({ d3_swim_done: true, bondready_emi: 3 }, ['Leave her to it for now.']);
  await f.game.runner.run('ongoing_swimming'); assert.equal(flags.ms3_emi, undefined); assert.deepEqual(f.awards, []);
});
test('canceled real pool action stops Runner before Emi milestone, memory and practice awards', async () => {
  const f = fixture({ d3_swim_done: true, bondready_emi: 3 }, ['Could he keep the sheet while you swim?']);
  let reached; const started = new Promise(resolve => { reached = resolve; });
  f.game.pause = step => { if (step.state === 'length') { reached(); return true; } return false; };
  const pending = f.game.runner.run('ongoing_swimming'); await started;
  f.action.cancel(); await pending; f.game.unblock();
  assert.equal(flags.pool_action_completed, false); assert.equal(flags.ms3_emi, undefined);
  assert.equal(flags.swim_practice_done, undefined); assert.deepEqual(f.awards, []);
});

test('actual historical Runner checkpoint includes entry and a nested water action, and upgrades without losing its journal', async () => {
  const f = fixture(); f.game.runner.use(f.P, { nodes: legacy.pool });
  let reached; const started = new Promise(resolve => { reached = resolve; });
  f.game.pause = step => { if (step.state === 'length') { reached(); return true; } return false; };
  f.game.captureStaging = () => ({ world: { water: true, list: 'bench' } });
  const pending = f.game.runner.run('club_swimming_length'); await started;
  const before = { day: 3, place: 'pool', flags: { ...flags }, runner: f.game.runner.snapshot() };
  assert.ok(before.runner.execution.frames.every(frame => frame.done.includes('entry')));
  const after = migrateSwimmingSave(before);
  assert.ok(readCheckpoint(after.runner.execution, 'pool', { nodes: { ...CLUBS.nodes, ...STORY.nodes } }));
  assert.ok(after.runner.execution.frames.every(frame => frame.done.includes('entry')));
  assert.deepEqual(after.runner.execution.frames[0].worldAfter, before.runner.execution.frames[0].worldAfter);
  f.game.pause = null; globalThis.__saveTestUI.choose = () => 0;
  f.action.cancel(); f.game.unblock(); await pending;
});
for (const paid of [false, true]) test(`real Runner resumes historical Emi set flag with gate already paid ${paid}`, async () => {
  const f = fixture({ ms3_emi: true });
  const frame = newFrame('ongoing_winter_sheet', legacy.gym.ongoing_winter_sheet);
  frame.done = ['entry', '[7]:set', ...(paid ? ['[8]:hook'] : [])];
  frame.cursors = [{ path: [], index: paid ? 8 : 7, phase: 'step' }];
  const saved = migrateSwimmingSave({ day: 10, place: 'gym', flags: { ...flags }, runner: { execution: { v: 3, place: 'gym', frames: [frame] } } });
  Object.assign(flags, saved.flags); f.P.name = saved.place;
  f.game.runner.restore(saved.runner); assert.equal(await f.game.runner.resume(), true);
  assert.equal(f.awards.filter(step => step.do === 'bondStep').length, paid ? 0 : 1);
  assert.equal(f.awards.filter(step => step.do === 'remember').length, 1);
  assert.equal(f.awards.filter(step => step.do === 'bond').length, 0);
  assert.equal(f.game.runner.recoveryError, null);
});
test('real Runner resumes partial historical practice award without paying Emi twice', async () => {
  const f = fixture();
  const frame = newFrame('ongoing_winter_done', legacy.gym.ongoing_winter_done);
  frame.done = ['entry', '[0,"then",0]:hook']; frame.branches = { '[0]': true };
  frame.cursors = [{ path: [], index: 0, phase: 'branch' }, { path: [0, 'then'], index: 0, phase: 'step' }];
  const saved = migrateSwimmingSave({ day: 10, place: 'gym', flags: { ...flags }, visited: {}, runner: { execution: { v: 3, place: 'gym', frames: [frame] } } });
  Object.assign(flags, saved.flags); f.P.name = saved.place;
  f.game.runner.restore(saved.runner); assert.equal(await f.game.runner.resume(), true);
  assert.deepEqual(f.awards.filter(step => step.do === 'bond').map(step => step.who), ['kuro']);
  assert.equal(flags.winter_practice_done, true); assert.equal(flags.d3_swimming_shared, true);
  assert.equal(f.game.runner.recoveryError, null);
});
