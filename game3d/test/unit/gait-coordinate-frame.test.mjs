import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.core.js';

registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === 'three' ? new URL('../../vendor/three/three.core.js', import.meta.url).href : specifier,
      context,
    );
  },
});
const { startGaitCheck } = await import('../../js/movement/gait-watch.js');

function fixture() {
  globalThis.window = {};
  globalThis.requestAnimationFrame = () => 1;
  const scene = new THREE.Scene(),
    space = new THREE.Group(),
    root = new THREE.Group();
  scene.add(space);
  space.add(root);
  const feet = [new THREE.Object3D(), new THREE.Object3D()];
  const knees = feet.map((foot) => {
    const knee = new THREE.Object3D();
    knee.add(foot);
    return knee;
  });
  root.add(...knees);
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const player = { root, feet, knees, state: 'walk', _walk: false };
  const game = {
    place: { name: 'first', space, camera, people: {} },
    player,
    t: 0,
  };
  const report = startGaitCheck(game);
  let offset = 0;
  return {
    game,
    report,
    sample(t, speed = 1, footTime = t, clock = 'step') {
      game.t = t;
      root.position.x = t * speed + offset;
      const p = footTime % 0.8,
        leftLow = p < 0.4,
        x = leftLow ? 0.2 - p : p - 0.6;
      feet[0].position.set(x, leftLow ? 0 : 0.08, 0.1);
      feet[1].position.set(-x, leftLow ? 0.08 : 0, -0.1);
      scene.updateMatrixWorld(true);
      report.sample(clock);
    },
    offset(n) {
      offset = n;
    },
    changeFrame(n, changePlace = true) {
      const next = new THREE.Group();
      next.position.x = -n;
      scene.add(next);
      next.updateMatrixWorld(true);
      next.attach(root);
      offset = n;
      if (changePlace) game.place = { ...game.place, name: 'next-' + n, space: next };
    },
  };
}

test('gait windows do not interpret a changed local coordinate origin as foot sliding', () => {
  const f = fixture();
  for (let i = 0; i < 240; i++) {
    if (i === 74) f.changeFrame(40);
    if (i === 105) f.changeFrame(-35);
    f.sample(i / 60);
  }
  assert.ok(f.report.windows >= 4, 'actual sampler completed windows');
  assert.deepEqual(f.report.episodes, []);
});

test('changing carriers within the same place also starts a fresh measurement frame', () => {
  const f = fixture();
  for (let i = 0; i < 240; i++) {
    if (i === 74) f.changeFrame(40, false);
    if (i === 105) f.changeFrame(-35, false);
    f.sample(i / 60);
  }
  assert.ok(f.report.windows >= 4, 'actual sampler completed windows');
  assert.deepEqual(f.report.episodes, []);
});

test('the same sampler still reports real sliding within one coordinate frame', () => {
  const f = fixture();
  for (let i = 0; i < 180; i++) f.sample(i / 60, 4);
  assert.ok(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 2));
});

test('completed steps resolve strides that alias at a slow rendered-frame cadence', () => {
  const coarse = fixture();
  // One drawn frame per stride: the feet appear nearly stationary in sparse samples.
  for (let i = 0; i < 8; i++) coarse.sample(i * 0.8 + 0.01);
  assert.ok(coarse.report.episodes.some((e) => e.kind === 'slide'));

  const stepped = fixture();
  // The same motion and frame boundaries, with all completed simulation steps measured.
  for (let frame = 0; frame < 8; frame++)
    for (let step = 0; step < 16; step++) stepped.sample(frame * 0.8 + step * 0.05 + 0.01);
  assert.ok(stepped.report.windows >= 8);
  assert.deepEqual(stepped.report.episodes, []);
});

test('fine sampling still catches frozen feet and stepping on the spot across uneven frames', () => {
  for (const frozen of [true, false]) {
    const f = fixture();
    let t = 0;
    for (const frameSteps of [1, 16, 8, 3, 16, 16, 4, 16, 16]) {
      for (let step = 0; step < frameSteps; step++) {
        t += 0.05;
        f.sample(t, frozen ? 1 : 0, frozen ? 0.1 : t);
      }
    }
    assert.ok(f.report.episodes.some((e) => e.kind === (frozen ? 'slide' : 'on the spot') && e.windows >= 4));
  }
});

test('authored walkers keep their own sampling clock and still report genuine sliding', () => {
  const f = fixture();
  f.game.player._walk = true;
  for (let i = 0; i < 240; i++) {
    f.sample(i / 60, 4, i / 60, 'step');
    if (i % 2 === 0) f.sample(i / 60, 4, i / 60, 'drawn');
  }
  assert.ok(f.report.windows >= 4);
  assert.ok(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 4));
});

test('handing free movement to an authored walk starts a new cadence window', () => {
  const f = fixture();
  for (let i = 0; i < 120; i++) f.sample(i / 60);
  // The authored action begins between clocks; its first position is not a free-walk sample.
  f.game.player.scripted = true;
  f.offset(10);
  f.sample(3, 1, 3, 'step');
  f.sample(3, 1, 3, 'drawn');
  for (let i = 181; i < 300; i++) f.sample(i / 60, 1, i / 60, 'drawn');
  f.game.player.scripted = false;
  f.offset(-10);
  f.sample(6, 1, 6, 'drawn');
  f.sample(6, 1, 6, 'step');
  for (let i = 361; i < 480; i++) f.sample(i / 60);
  assert.deepEqual(f.report.episodes, []);
});

test('named, crowd and ambient actors retain drawn-frame sliding detection', () => {
  const f = fixture();
  const actors = Array.from({ length: 3 }, () => {
    const root = new THREE.Group(),
      feet = [new THREE.Object3D(), new THREE.Object3D()];
    root.add(...feet);
    f.game.place.space.add(root);
    return { root, feet, state: 'walk' };
  });
  f.game.place.people.named = actors[0];
  f.game.place.crowd = [actors[1]];
  f.game.place.ambient = { pool: [{ r: actors[2], state: 'walk' }] };
  for (let i = 0; i < 240; i++) {
    actors.forEach((r, n) => {
      r.root.position.set(i / 60, 0, n);
    });
    f.sample(i / 60, 0, 0);
    f.report.sample('drawn');
  }
  for (const id of ['named', 'crowd0', 'amb0']) {
    assert.ok(
      f.report.episodes.some((e) => e.line.includes(`: ${id} slide`) && e.windows >= 4),
      id,
    );
  }
});

test('real frozen-foot sliding remains detectable after both cadence handoffs', () => {
  const f = fixture();
  let t = 0;
  for (const authored of [false, true, false]) {
    f.game.player.scripted = authored;
    for (let i = 0; i < 200; i++) {
      t += 1 / 60;
      f.sample(t, 1, 0.1, authored ? 'drawn' : 'step');
    }
  }
  assert.equal(f.report.episodes.filter((e) => e.kind === 'slide' && e.windows >= 4).length, 3);
});

test('long-running free steps keep strict limits while the drawn clock retains coarse tolerance', () => {
  const free = fixture();
  free.offset(-20000);
  for (let i = 0; i < 120; i++) free.sample(10000 + i * 0.05, 2);
  assert.ok(free.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 4));
  const drawn = fixture();
  drawn.game.player.scripted = true;
  drawn.offset(-20000);
  for (let i = 0; i < 60; i++) drawn.sample(10000 + i * 0.1, 2, 10000 + i * 0.1, 'drawn');
  assert.ok(drawn.report.windows >= 8);
  assert.deepEqual(drawn.report.episodes, []);
});

const readerTrace = JSON.parse(readFileSync(new URL('../fixtures/reader-gait-samples.json', import.meta.url), 'utf8'));

function replayReader(movement, bodySpeed = 1) {
  const f = fixture();
  const reader = f.game.player;
  Object.assign(reader, movement);
  f.game.player = null;
  f.game.place.people.reader = reader;
  for (const [t, clock, x, z, lx, lz, ly, rx, rz, ry] of readerTrace.samples) {
    f.game.t = t;
    reader.root.position.set(x * bodySpeed, 0, z * bodySpeed);
    reader.feet[0].position.set(lx, ly, lz);
    reader.feet[1].position.set(rx, ry, rz);
    f.report.sample(clock);
  }
  return f;
}

test('recorded train reader strides are coherent at their completed step cadence', () => {
  const stepped = replayReader({ _walk() {} });
  assert.ok(stepped.report.windows >= 8, 'the real sampler measured the retained walk');
  assert.deepEqual(stepped.report.episodes, []);
  assert.ok(stepped.report.people.reader.ratio.every((r) => r > 1 && r < 1.3));

  // The same poses sampled on the former drawn clock recreate the native aliasing.
  const drawn = replayReader({ _walk: true });
  assert.ok(drawn.report.episodes.some((e) => e.kind === 'slide' && e.windows === 3));
  assert.deepEqual(drawn.report.people.reader.ratio, [2.4, 0.99, 1.69, 3.61, 8.93, 17.24, 4.37, 2.61]);
});

test('procedural step sampling still detects movement that outruns the recorded feet', () => {
  const f = replayReader({ _walk() {} }, 4);
  assert.ok(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 4));
});

test('independently posed and unsupported callback rigs retain their drawn-frame cadence', () => {
  for (const movement of [
    { _walk() {}, meshy: true },
    { _walk() {}, setGait() {} },
    { _walk() {}, selfGait: true },
    { _walk() {}, knees: null },
  ]) {
    const f = replayReader(movement);
    assert.ok(f.report.episodes.some((e) => e.kind === 'slide' && e.windows === 3));
    assert.equal(f.report.people.reader.windows, 8);
  }
});

test('procedural callback handoff resets its window without hiding later sliding', () => {
  const f = fixture(),
    reader = f.game.player;
  f.game.player = null;
  f.game.place.people.reader = reader;
  reader._walk = () => {};
  for (let i = 0; i < 120; i++) f.sample(i / 60);
  reader._walk = true;
  f.offset(10);
  f.sample(3, 1, 3, 'step');
  f.sample(3, 1, 3, 'drawn');
  for (let i = 181; i < 300; i++) f.sample(i / 60, 1, i / 60, 'drawn');
  assert.deepEqual(f.report.episodes, []);
  reader._walk = () => {};
  f.offset(-10);
  f.sample(6, 1, 6, 'drawn');
  f.sample(6, 1, 6, 'step');
  for (let i = 361; i < 600; i++) f.sample(i / 60, 1, 6);
  assert.ok(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 4));
});
