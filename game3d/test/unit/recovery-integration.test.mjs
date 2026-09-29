// Evaluate the shipped boundary callbacks, without booting WebGL or duplicating their bodies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'espree';
import * as THREE from '../../vendor/three/three.module.js';
import { needsLegacyOpening } from '../../js/narrative/legacy-opening.js';
import { visitSource } from '../../../tools/lib/source-data.mjs';

const source = readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
const declaration = ast.body.find(n => n.type === 'ExportNamedDeclaration'
  && n.declaration?.declarations?.some(d => d.id.name === 'game'));
const gameObject = declaration.declaration.declarations.find(d => d.id.name === 'game').init;
const beat = gameObject.properties.find(p => p.key.name === 'beat').value;
const recovery = ast.body.find(n => n.type === 'ExpressionStatement'
  && n.expression.type === 'AssignmentExpression' && n.expression.left.object?.name === 'game'
  && n.expression.left.property?.name === 'onRecoveryError').expression.right;
const text = node => source.slice(...node.range);

test('the actual Continue branch migrates old openings after hydration and preserves current idle saves', async () => {
  let branch;
  visitSource(ast, node => {
    if (node.type === 'IfStatement' && node.test.type === 'LogicalExpression' &&
      node.test.left.left?.name === 'pick' && node.test.left.right?.value === 'continue' &&
      node.test.right.name === 'saved') branch = node.consequent;
  });
  assert.ok(branch, 'Continue branch must exist');
  for (const current of [false, true]) {
    const events = [], flags = { stale: true };
    const saved = { place: 'office', flags: { held_doors: true }, ...(current ? { pendingStart: null } : {}) };
    const game = { saveEnabled: false, busy: false, story: { start: 'opening', nodes: { opening: [{ set: 'localProgress' }] } },
      place: { name: 'office', restoreState(value) { assert.equal(value, saved); flags.hydrated = true; events.push('world'); } },
      resumeWalks() { events.push('walks'); } };
    const enter = async (place, options) => {
      assert.equal(place, 'office'); assert.deepEqual(options, { persist: false, resuming: true });
      assert.equal(game.busy, true); flags.schedule = true; events.push('enter');
    };
    const ui = Object.fromEntries(['refreshWords', 'refreshPeople', 'refreshBag', 'goal', 'sideGoal']
      .map(name => [name, () => events.push(name)]));
    const dependencies = { game, flags, ui, sim: { met: new Set() }, enter, needsLegacyOpening,
      restore: (target, value) => { assert.equal(target, game); assert.equal(value, saved); events.push('restore'); },
      startScene: place => { assert.equal(place, 'office'); events.push('start'); },
      save: () => events.push('save'), showEnd: () => { throw new Error('Unexpected end'); }, NEXT: {}, PLACES: {},
      travel: () => { throw new Error('Unexpected travel'); } };
    const run = new Function(...Object.keys(dependencies), `return async function(saved) ${text(branch)}`)(...Object.values(dependencies));
    await run(saved);
    assert.deepEqual(flags, saved.flags);
    assert.equal(game.busy, false); assert.equal(game.saveEnabled, true);
    assert.deepEqual(events, ['restore', 'enter', 'world', 'refreshWords', 'refreshPeople', 'refreshBag', 'goal', 'sideGoal',
      ...(current ? ['walks', 'save'] : ['start'])]);
  }
});

test('real staging boundary restores world, camera and prompts while retaining durable flags', () => {
  const callbacks = Object.fromEntries(ast.body.filter(n => n.type === 'ExpressionStatement'
    && n.expression.type === 'AssignmentExpression' && n.expression.left.object?.name === 'game'
    && ['captureStaging', 'restoreStaging'].includes(n.expression.left.property?.name))
    .map(n => [n.expression.left.property.name, n.expression.right]));
  const events = [], flags = { paid: false }, initialFlags = { ...flags };
  let world = { chair: [5, 0, -1] };
  const ui = { goalText: 'Find the chair.', sideText: '', goal(s) { this.goalText = s; }, sideGoal(s) { this.sideText = s; } };
  const cam = { close: { target: new THREE.Vector3(1, 2, 3), zoom: 1.6 }, snap() { events.push('camera'); } };
  const game = { hold: 'mori', player: { root: { position: new THREE.Vector3() } },
    walker: { stop() { events.push('stop'); } }, resumeWalks() { events.push('walks'); },
    place: { name: 'office', cam, snapshotState: () => structuredClone(world), restoreState(saved) {
      events.push('world');
      assert.deepEqual(saved.flags, initialFlags);
      assert.equal(saved.runner.execution, true);
      world = structuredClone(saved.world);
    } } };
  for (const [name, body] of Object.entries(callbacks)) {
    game[name] = new Function('game', 'ui', 'flags', 'THREE', `return ${text(body)}`)(game, ui, flags, THREE);
  }
  const captured = game.captureStaging();
  flags.paid = true; world.chair[0] = 2; cam.close.target.x = 10;
  ui.goalText = 'After purchase'; game.hold = null;
  game.restoreStaging(captured);
  assert.deepEqual(events, ['stop', 'world', 'camera', 'walks']);
  assert.deepEqual(world.chair, [5, 0, -1]);
  assert.equal(flags.paid, true);
  assert.equal(ui.goalText, 'Find the chair.');
  assert.equal(game.hold, 'mori');
  assert.deepEqual(cam.close.target.toArray(), [1, 2, 3]);
  cam.close.target.x = 20;
  assert.deepEqual(captured.camera.target, [1, 2, 3]);
  assert.throws(() => game.restoreStaging({ ...captured, place: 'train' }), /another place/);
});

test('the real beat boundary keeps recovery locked and does not run deferred work', async () => {
  let after = 0, queued = 0;
  const classes = new Set();
  const doc = { body: { classList: { add: name => classes.add(name),
    toggle: (name, on) => on ? classes.add(name) : classes.delete(name) } } };
  const ui = { closeSayMenu() {}, closeTalk() {} };
  const game = { busy: false, runner: {}, walker: { locked: false, stop() {} },
    after: () => after++, queue: [() => queued++] };
  game.beat = new Function('ui', 'document', `return async function${text(beat)}`)(ui, doc);
  await game.beat(() => { game.runner.recoveryError = 'broken scene'; });
  assert.equal(game.busy, true);
  assert.equal(game.walker.locked, true);
  assert.equal(classes.has('busy'), true);
  assert.equal(after, 0);
  assert.equal(queued, 0);
  let ran = false;
  await game.beat(() => { ran = true; });
  assert.equal(ran, false);
});

test('the real recovery notice freezes updates and offers a working return to title', () => {
  const nodes = [];
  const doc = { createElement: tag => {
    const node = { tag, attributes: {}, events: {}, children: [],
      setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener(k, fn) { this.events[k] = fn; },
      append(child) { this.children.push(child); }, showModal() { this.modal = true; } };
    nodes.push(node); return node;
  }, body: { append() {} } };
  const game = { saveEnabled: true, paused: false };
  let reloaded = false;
  const fail = new Function('game', 'document', 'location', `return ${text(recovery)}`)(game, doc,
    { reload: () => { reloaded = true; } });
  fail('Changed scene.');
  assert.equal(game.saveEnabled, false);
  assert.equal(game.paused, true);
  const notice = nodes.find(n => n.tag === 'dialog');
  assert.equal(notice.modal, true);
  assert.equal(notice.attributes.role, 'alertdialog');
  assert.match(notice.textContent, /last save is preserved/);
  let cancelled = false;
  notice.events.cancel({ preventDefault() { cancelled = true; } });
  assert.equal(cancelled, true);
  notice.children[0].events.click();
  assert.equal(reloaded, true);
});

test('menu capture cannot unpause recovery and preserves native button activation', () => {
  const menuSource = readFileSync(new URL('../../js/menu.js', import.meta.url), 'utf8');
  const menuAst = parse(menuSource, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const canPause = menuAst.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'canPause');
  const setPaused = menuAst.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'setPaused');
  const capture = menuAst.body.find(n => n.type === 'ExpressionStatement'
    && n.expression.type === 'CallExpression' && n.expression.callee.object?.name === 'window'
    && n.expression.callee.property?.name === 'addEventListener'
    && n.expression.arguments[0]?.value === 'keydown').expression.arguments[1];
  const game = { paused: true, runner: { recoveryError: 'broken' } };
  const code = node => menuSource.slice(...node.range);
  const callbacks = new Function('game', `${code(canPause)}; ${code(setPaused)};
    return { canPause, setPaused, keydown: ${code(capture)} };`)(() => game);
  assert.equal(callbacks.canPause(), false);
  for (const key of ['Escape', 'Escape', 'Enter', 'Space', 'Tab', 'KeyQ']) {
    let prevented = false, stopped = false;
    callbacks.keydown({ code: key, key, stopImmediatePropagation() { stopped = true; },
      preventDefault() { prevented = true; } });
    assert.equal(stopped, true);
    assert.equal(prevented, key === 'Escape');
    callbacks.setPaused(false);
    assert.equal(game.paused, true);
  }
});
