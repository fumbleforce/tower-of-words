// Exercise the real movement loop with a manual RAF clock and an unobstructed route.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'espree';
import { test } from 'node:test';

const source = readFileSync(new URL('../../js/movement/scripted.js', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
const node = ast.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.id?.name === 'walkRig').declaration;
function fixture() {
  const raf = [];
  const walk = new Function('requestAnimationFrame', 'THREE', 'turnToward', 'angDiff', 'BRAKE', 'ACCEL', 'FRAME_MAX',
    'STEP_MAX', 'stuck', `return ${source.slice(...node.range)}`)(fn => raf.push(fn),
    { MathUtils: { clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)) } }, (_from, to) => to,
    (a, b) => a - b, 3, 3, 0.1, 0.05, () => false);
  const rig = { root: { userData: {}, parent: {}, position: { x: 0, z: 0 }, rotation: { y: 0 }, scale: { x: 1 } },
    states: [], setState(value) { this.state = value; this.states.push(value); } };
  return { walk, rig, raf, game: { place: {}, timeScale: 1 } };
}

test('a superseded walk stops before moving or setting the new walk idle', async () => {
  const { walk, rig, raf, game } = fixture();
  const old = walk(game, rig, [10, 0], { route: false, avoid: false });
  const current = walk(game, rig, [0, 10], { route: false, avoid: false });
  const before = { ...rig.root.position };
  const statesBefore = [...rig.states];
  raf.shift()();
  await old;
  assert.deepEqual(rig.root.position, before);
  assert.equal(rig._walk, true);
  assert.deepEqual(rig.states, statesBefore);
  rig.root.position.z = 10; rig.root.position.x = 0;
  raf.shift()();
  await current;
  assert.equal(rig._walk, false);
  assert.equal(rig.state, 'idle');
});

test('pose hydration cancellation resolves an old walk without moving the restored root', async () => {
  const { walk, rig, raf, game } = fixture();
  const old = walk(game, rig, [10, 0], { route: false, avoid: false });
  rig.root.userData.walkTok++;
  rig.root.position.x = 3; rig.root.position.z = 4;
  rig._walk = null;
  raf.shift()();
  await old;
  assert.deepEqual(rig.root.position, { x: 3, z: 4 });
  assert.equal(rig._walk, null);
});

test('changing place or reparenting a shared actor cancels its old movement', async () => {
  for (const change of [({ game }) => { game.place = {}; }, ({ rig }) => { rig.root.parent = {}; },
    ({ rig }) => { rig.root.parent = null; }]) {
    const state = fixture();
    const { walk, rig, raf, game } = state;
    const old = walk(game, rig, [10, 0], { route: false, avoid: false });
    change(state);
    rig.root.position.x = 3; rig.root.position.z = 4;
    const states = [...rig.states];
    raf.shift()();
    await old;
    assert.deepEqual(rig.root.position, { x: 3, z: 4 });
    assert.deepEqual(rig.states, states);
    assert.equal(rig._walk, false);
    assert.equal(rig._noAvoid, false);
  }
});
