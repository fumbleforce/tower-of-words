import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { migrateSwimmingSave } from '../../js/saves/swimming.js';
import revisions from '../../js/saves/swimming-revisions.js';
import { newFrame, readCheckpoint, nodeFingerprint } from '../../js/narrative/checkpoint.js';
import CLUBS from '../../story/clubs.js';
import POOL from '../../story/day3/pool.js';
import ONGOING from '../../story/ongoing/pool.js';
const legacy = JSON.parse(readFileSync(new URL('../fixtures/swimming-legacy-stories.json', import.meta.url)));
const story = { nodes: { ...CLUBS.nodes, ...POOL.nodes } };
const later = { nodes: { ...CLUBS.nodes, ...ONGOING.nodes } };
const checkpoint = (node, steps, index = 0) => ({ ...newFrame(node, steps), cursors: [{ path: [], index, phase: 'step' }] });
const save = (frames, extra = {}) => ({ day: 3, place: 'pool', flags: { club_swimming: true, clubprog_swimming: 1, clubday_swimming: 3 },
  world: { player: { eric: { position: [1, -.5, 2] } }, swim: { swimmers: { eric: 'tread' } } },
  runner: { execution: { v: 3, place: 'pool', frames }, queued: [] }, ...extra });
test('migration fingerprints are from the actual pre-correction public scripts', () => {
  for (const [id, fingerprint] of Object.entries(revisions.pool)) assert.equal(nodeFingerprint(legacy.pool[id]), fingerprint, id);
  for (const [id, fingerprint] of Object.entries(revisions.gym)) assert.equal(nodeFingerprint(legacy.gym[id]), fingerprint, id);
});
test('each historical pool root cursor remains valid, including removed seasonal lines and later-day continuation', () => {
  for (const day of [3, 10, 17]) for (const id of Object.keys(revisions.pool)) {
    for (let index = 0; index < legacy.pool[id].length; index++) {
      const before = save([checkpoint(id, legacy.pool[id], index)], { day });
      const after = migrateSwimmingSave(before);
      assert.ok(readCheckpoint(after.runner.execution, 'pool', day > 5 ? later : story), `${day} ${id}[${index}]`);
      assert.equal(after.world, before.world, 'water, props and outfits retained');
      assert.equal(migrateSwimmingSave(after), after, 'idempotent');
    }
  }
});
test('nested pool water checkpoint retains all parent markers and completed child worldAfter staging', () => {
  const parent = checkpoint('club_swimming_length', legacy.pool.club_swimming_length, 4);
  parent.cursors[0].phase = 'call';
  parent.done = ['[0]:call', '[1,0,0]:hook'];
  parent.branches = { '[1]': true }; parent.worldAfter = { '[0]:call': { world: { wet: true } } };
  const child = checkpoint('d3_pool_length', legacy.pool.d3_pool_length);
  const before = save([parent, child]); const after = migrateSwimmingSave(before);
  assert.ok(readCheckpoint(after.runner.execution, 'pool', story));
  assert.deepEqual(after.runner.execution.frames[0].worldAfter, parent.worldAfter);
  assert.equal(after.runner.execution.frames[0].cursors[0].index, 2);
  assert.deepEqual(after.flags, before.flags);
});
test('completed pool effects, choice markers and post-call staging move with their root index', () => {
  const frame = checkpoint('club_swimming_length', legacy.pool.club_swimming_length, 12);
  frame.done = ['[11]:set']; frame.worldAfter = { '[12]:call': { world: { bags: 'table' } } };
  const after = migrateSwimmingSave(save([frame]));
  assert.deepEqual(after.runner.execution.frames[0].done, ['[9]:set']);
  assert.deepEqual(after.runner.execution.frames[0].worldAfter, { '[10]:call': { world: { bags: 'table' } } });
});
test('active historical gym swimming moves safely while partial milestone and unrelated queued work survive', () => {
  const frame = checkpoint('ongoing_winter_sheet', legacy.gym.ongoing_winter_sheet, 5);
  const queue = [];
  const before = save([frame], { day: 10, place: 'gym', flags: { club_swimming: true, clubprog_swimming: 2, ms3_emi: true },
    runner: { execution: { v: 3, place: 'gym', frames: [frame] }, queued: queue }, world: { winterClub: { active: true } } });
  const after = migrateSwimmingSave(before);
  assert.equal(after.place, 'pool'); assert.equal(after.world, null); assert.equal(after.surface, null);
  assert.equal(after.flags.ms3_emi, true); assert.equal(after.flags.d3_swimming_shared, undefined);
  assert.equal(after.flags.clubprog_swimming, 2); assert.deepEqual(after.runner.queued, queue);
  assert.equal(after.runner.execution, null); assert.equal(after.pendingStart, 'pool');
});
test('an unrelated queued gym repair finishes in the gym before the player goes swimming', () => {
  const frame = checkpoint('ongoing_winter_sheet', legacy.gym.ongoing_winter_sheet, 5);
  const before = save([frame], { day: 10, place: 'gym', world: { winterClub: { active: true }, booking: { screen: 'live' } },
    runner: { execution: { v: 3, place: 'gym', frames: [frame] }, queued: [{ node: 'd3_booking' }] } });
  const after = migrateSwimmingSave(before);
  assert.equal(after.place, 'gym'); assert.deepEqual(after.runner.queued, [{ node: 'd3_booking' }]);
  assert.equal(after.runner.execution, null); assert.equal(after.world.booking.screen, 'live');
  assert.equal(after.world.winterClub, undefined);
});
test('completed gym awards survive without replay, but attendance and a partial Emi milestone never imply completion', () => {
  for (const completion of ['d3_winter_intro_done', 'winter_practice_done']) {
    const before = save([], { day: 17, flags: { [completion]: true, ms3_emi: true } });
    const after = migrateSwimmingSave(before);
    assert.equal(after.flags.d3_swimming_shared, true); assert.equal(after.flags[completion], true);
    assert.equal(after.flags.d3_swim_done, undefined, 'first actual pool scene remains available');
  }
  const before = save([], { day: 17, place: 'gym', flags: { clubprog_swimming: 4, clubday_swimming: 17, ms3_emi: true } });
  assert.equal(migrateSwimmingSave(before), before);
});
test('unrelated gym repair and queue are preserved even with historic swimming flags', () => {
  const before = save([], { day: 10, place: 'gym', world: { booking: { screen: 'live' } },
    runner: { execution: { v: 3, place: 'gym', frames: [{ node: 'd3_booking', fingerprint: 'own' }] }, queued: [{ node: 'd3_print' }] } });
  assert.equal(migrateSwimmingSave(before), before);
});
test('damaged checkpoints reach ordinary validation without migration throwing first', () => {
  for (const execution of [{ v: 3, place: 'pool', frames: {} }, { v: 3, place: 'gym', frames: true },
    { v: 3, place: 'pool', frames: [null] }, ...['done', 'cursors', 'worldAfter', 'branches', 'choices'].map(key => {
      const frame = checkpoint('club_swimming_length', legacy.pool.club_swimming_length);
      frame[key] = key === 'done' ? ['broken'] : key === 'cursors' ? null : { broken: true };
      return { v: 3, place: 'pool', frames: [frame] };
    })]) {
    const before = save([], { runner: { execution, queued: null } });
    assert.doesNotThrow(() => migrateSwimmingSave(before));
    assert.equal(migrateSwimmingSave(before).runner.execution, execution);
  }
});
