import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'espree';
import * as THREE from '../../vendor/three/three.module.js';
import { stepZones, snapshotZones, restoreZones, suppressArrivalZones } from '../../js/gameplay/zones.js';
import { snapshotPeople, restorePeople, cancelSavedWalk } from '../../js/places/saved-people.js';
import { snapshotGoalDestination, restoreGoal } from '../../js/saves/zones.js';
import { eventTrigger } from '../../js/narrative/events.js';

register(new URL('../support/save-loader.mjs', import.meta.url));
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.location = { search: '', hostname: 'localhost', href: 'http://localhost/' };
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.fetch = async () => ({ ok: false });
const noop = () => {};
globalThis.document = { body: { dataset: {}, classList: { contains: () => false, add: noop, remove: noop, toggle: noop } } };
const ui = new Proxy({ goalText: '', sideText: '', goal(s) { this.goalText = s; }, sideGoal(s) { this.sideText = s; } },
  { get: (target, key) => key in target ? target[key] : noop });
globalThis.__saveTestUI = ui;
const S = await import('../../js/sim.js');
const { Runner, flags } = await import('../../js/runner.js');
const { createContinue, dayStartSave } = await import('../../js/continue.js');
const { nextDaySave } = await import('../../js/days.js');

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of Object.values(node || {}).flat()) {
    if (!child?.type) continue;
    const result = find(child, predicate);
    if (result) return result;
  }
}
function sourceNode(path, predicate) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const node = find(parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true }), predicate);
  assert(node, path);
  return source.slice(...node.range);
}
const evaluate = (code, deps) => new Function(...Object.keys(deps), `return (${code});`)(...Object.values(deps));
const boundary = (name, deps) => evaluate(sourceNode('../../js/places/lifecycle.js',
  n => n.type === 'FunctionDeclaration' && n.id.name === name), deps);
class Walker { constructor() { this.keys = new Set(); } sync() {} stop() {} }

function fixture() {
  storage.clear();
  const consumed = new Set(), calls = [];
  const person = () => ({ root: new THREE.Group(), setState: noop });
  const game = { ui, hooks: {}, found: new Set(), queue: [], busy: false, saveEnabled: true,
    player: person(), mioNpc: person(), walker: new Walker(), sim: S.sim, resumeWalks: noop };
  const shippedBeat = evaluate('async function' + sourceNode('../../js/main.js',
    n => n.type === 'Property' && n.key.name === 'beat').slice('async beat'.length), { ui, document: globalThis.document });
  let beat;
  game.beat = (...args) => (beat = shippedBeat.apply(game, args));
  game.runner = new Runner(game);
  const story = { start: 'idle', on: { 'zone:lift_front': { node: 'exit', if: 'zone_ready' } },
    nodes: { idle: [{ do: 'goal', text: 'A goal.' }], exit: [{ do: 'exit' }], scene: [{ do: 'pauseScene' }], queued: [{ do: 'queued' }] } };
  game.runner.load = async () => story;
  game.hooks.goal = ({ text }) => ui.goal(text);
  game.hooks.exit = () => calls.push('exit');
  game.hooks.queued = () => calls.push('queued');
  const makePlace = name => ({ name, start: [3, 0], space: new THREE.Group(), spots: {}, things: {}, people: {}, nav: {},
    liftSite: { out: [0, 0] }, cam: { snap: noop }, zones: { lift_front: (x, z) => Math.hypot(x, z) < 0.42 },
    snapshotState: () => ({ player: snapshotPeople({ eric: game.player }) }),
    restoreState: saved => restorePeople({ eric: game.player }, saved.world?.player) });
  const places = { forecourt: makePlace('forecourt'), office: makePlace('office'), dorms: makePlace('dorms') };
  game.place = places.forecourt;
  game.story = story;
  S.restore(game, { v: 1, day: 2, period: 'evening', flags: { place: 'forecourt', zone_ready: true, d2_content_revision: 2 } });
  S.installSim(game);
  game.runner.use(game.place, story);
  game.snapshotZones = () => snapshotZones(game, consumed);
  game.restoreZones = (saved, options) => restoreZones(game, consumed, saved, options);
  for (const name of ['captureStaging', 'restoreStaging']) {
    const assignment = sourceNode('../../js/narrative/hooks/movement.js', n => n.type === 'AssignmentExpression' &&
      n.left.object?.name === 'game' && n.left.property?.name === name);
    new Function('game', 'ui', 'flags', 'THREE', 'snapshotGoalDestination', 'restoreGoal', assignment)
      (game, ui, flags, THREE, snapshotGoalDestination, restoreGoal);
  }
  const deps = { game, ui, sim: S.sim, cancelSavedWalk, SHARED_THINGS: {}, document: globalThis.document, noteVisit: noop,
    SmoothWalker: Walker, setComposer: noop, liftPeople: noop, lightPlace: noop, resize: noop, absorb: S.absorb, PERIOD_ORDER: S.PERIODS,
    applySchedule: noop, periodName: S.periodName, playMusic: noop, MUSIC: {}, syncFinds: noop, buildMarkers: noop,
    save: S.save, nearSet: new Set(), zoneSet: consumed, withConversations: s => s, withClubs: s => s,
    prepare: async name => ({ place: places[name] }), eventTrigger, clubArrival: noop };
  const enter = boundary('enter', deps), startScene = boundary('startScene', deps);
  const continueFrom = createContinue(game, { enter, startScene, travel: () => calls.push('travel'), PLACES: places });
  return { game, consumed, calls, enter, continueFrom, settled: () => beat,
    saved() { S.save(game); return S.loadSave(); }, tick() { stepZones(game, consumed); } };
}

test('a serialized arrival survives actual Continue, then leaving and reentering fires once', async () => {
  const f = fixture();
  suppressArrivalZones(f.game, f.consumed);
  const saved = f.saved();
  assert.deepEqual(saved.zones, { place: 'forecourt', consumed: ['lift_front'] });
  await f.continueFrom(saved); await f.settled(); f.tick();
  assert.deepEqual(f.calls, []);
  f.game.player.root.position.x = 1; f.tick();
  assert.equal(f.consumed.size, 0);
  f.game.player.root.position.x = 0; f.tick(); await f.settled(); f.tick();
  assert.deepEqual(f.calls, ['exit']);
});

test('explicit empty at the exact landing preserves a condition-pending entry through Continue', async () => {
  const f = fixture();
  flags.zone_ready = false;
  const saved = f.saved();
  assert.deepEqual(saved.zones.consumed, []);
  await f.continueFrom(saved); await f.settled(); f.tick();
  assert.deepEqual(f.calls, []);
  flags.zone_ready = true; f.tick(); await f.settled();
  assert.deepEqual(f.calls, ['exit']);
});

test('new-place persistence and next-day/preview saves clear previous zone history', async () => {
  const f = fixture();
  f.consumed.add('lift_front');
  await f.enter('office');
  const persisted = S.loadSave();
  assert.equal(persisted.place, 'office');
  assert.deepEqual(persisted.zones, { place: 'office', consumed: [] });
  const next = nextDaySave({ ...persisted, zones: { place: 'dorms', consumed: ['lift_front'] }, ended: true });
  assert.equal(next.zones, null);
  assert.deepEqual(next.world, { inside: true });
  await f.continueFrom(next); await f.settled();
  assert.equal(f.consumed.size, 0);
  assert.equal(dayStartSave(3, 'cold', 'office').zones, null);
});

for (const wasConsumed of [true, false]) test(`Runner checkpoint replay restores ${wasConsumed ? 'consumed' : 'pending'} entry state with its staging`, async () => {
  const f = fixture();
  if (wasConsumed) f.consumed.add('lift_front');
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  f.game.hooks.pauseScene = async () => {
    f.game.player.root.position.x = 2;
    f.tick();
    started();
    await new Promise(resolve => { release = resolve; });
  };
  const original = f.game.beat(() => f.game.runner.run('scene'));
  await ready;
  const saved = f.saved();
  assert.deepEqual(saved.zones.consumed, []);
  assert.equal(saved.world.player.eric.position[0], 2);
  assert.deepEqual(saved.runner.execution.frames[0].staging.zones.consumed, wasConsumed ? ['lift_front'] : []);
  release(); await original;
  let replayed, releaseReplay;
  const replayReady = new Promise(resolve => { replayed = resolve; });
  f.game.hooks.pauseScene = async () => {
    assert.equal(f.game.player.root.position.x, 0, 'real Runner restores the earlier staging position');
    assert.equal(f.consumed.has('lift_front'), wasConsumed);
    f.tick();
    assert.deepEqual(f.calls, [], 'busy scene does not consume a pending entry');
    replayed();
    await new Promise(resolve => { releaseReplay = resolve; });
  };
  const continued = f.continueFrom(saved);
  await replayReady;
  releaseReplay(); await continued;
  f.tick(); await f.settled();
  assert.deepEqual(f.calls, wasConsumed ? [] : ['exit']);
});

test('queued Runner work retains an explicitly pending entry until the resumed beat finishes', async () => {
  const f = fixture();
  f.game.runner.enqueue('queued', 'event:queued');
  const saved = f.saved();
  f.game.queue = [];
  await f.continueFrom(saved);
  assert.deepEqual(f.calls, ['queued']);
  f.tick(); await f.settled();
  assert.deepEqual(f.calls, ['queued', 'exit']);
});

test('legacy inference is restricted to an idle later-day forecourt save at the authored landing', () => {
  const f = fixture(), saved = f.saved();
  delete saved.zones;
  f.game.restoreZones(saved);
  assert.deepEqual([...f.consumed], ['lift_front']);
  for (const modify of [
    s => { s.day = 1; }, s => { delete s.day; }, s => { s.day = NaN; },
    s => { s.world = null; }, s => { s.world.player.eric.seated = true; },
    s => { s.world.player.eric.position[0] = 0.01; },
    s => { s.pendingStart = 'forecourt'; }, s => { s.transition = { from: 'office', to: 'forecourt' }; },
    s => { s.world.player.eric.walk = { to: [1, 0] }; },
    s => { s.runner.execution = { frames: [] }; }, s => { s.runner.queued = [{ node: 'queued' }]; },
    s => { s.zones = { place: 'forecourt', consumed: [] }; },
    s => { s.zones = { place: 'office', consumed: ['lift_front'] }; }, s => { s.zones = null; },
  ]) {
    const value = structuredClone(saved); modify(value); f.game.restoreZones(value);
    assert.equal(f.consumed.size, 0, modify.toString());
  }
  f.game.restoreZones(saved, { legacy: false });
  assert.equal(f.consumed.size, 0, 'old scene staging never infers arrival history');
  f.game.place.liftSite.out = [1, 0]; f.game.restoreZones(saved);
  assert.equal(f.consumed.size, 0, 'changed authored geometry does not infer arrival history');
});
