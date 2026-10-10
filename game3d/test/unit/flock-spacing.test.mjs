import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { Flock } = await import('../../js/creatures/birds.js');
const { flyTo, stepBird, HABITS } = await import('../../js/creatures/motion.js');
const { BirdMeshes } = await import('../../js/creatures/meshes.js');
const { groundPathFree } = await import('../../js/creatures/ground-spacing.js');
process.on('exit', () => hooks.deregister());
const point = (x = 0, z = 0) => new THREE.Vector3(x, 0, z);
function world(K = 1, free = () => true) {
  return {
    K,
    t: 0,
    groundBirds: [],
    nav: { free },
    free() {},
    claim() {
      return null;
    },
    sound() {},
    blob() {},
    inView() {
      return true;
    },
    threats: [],
    eric: point(20, 20),
    pick() {
      return { p: point() };
    },
  };
}
function flock(W, kind = 'pigeon', n = 8) {
  return new Flock({ kind }, new BirdMeshes(kind, n, W.K * 1.25), n, W);
}
function separated(groups) {
  const birds = groups.flatMap((g) => g.birds).filter((b) => b.mode === 'rest' && b.on?.kind === 'ground');
  for (let i = 0; i < birds.length; i++)
    for (let j = 0; j < i; j++) {
      const a = birds[i],
        b = birds[j];
      assert(
        Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z) + 1e-9 >= a.groundRadius + b.groundRadius,
        'ground birds overlap',
      );
    }
  return birds.length;
}
test('repeated random samples still populate an eight-bird flock without stacked landings', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  for (const K of [0.45, 0.85, 1.2]) {
    const W = world(K),
      g = flock(W);
    g.reset(true);
    assert.equal(separated([g]), 8, 'keep full flock on ample pavement');
  }
});
test('walking, hopping and pending landings remain separated across flocks', (t) => {
  let seed = 23;
  t.mock.method(Math, 'random', () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const W = world(),
    groups = [flock(W), flock(W, 'sparrow', 5)];
  for (const g of groups) g.reset(true);
  let steps = 0;
  for (let i = 0; i < 3600; i++) {
    W.t += 1 / 30;
    for (const g of groups) {
      g.step(1 / 30, true);
      steps += g.birds.filter((b) => ['walk', 'hop'].includes(b.act?.type)).length;
    }
    separated(groups);
  }
  assert(steps > 300, 'spacing must still allow ground movement');
  for (const g of groups) g.scatter(point());
  for (let i = 0; i < 90; i++) for (const g of groups) g.step(1 / 30, true);
  for (const g of groups) g.land(point(), false);
  for (let i = 0; i < 300; i++) {
    for (const g of groups) g.step(1 / 30, true);
    separated(groups);
  }
  assert(separated(groups) >= 8);
});
test('reserve the entire walking path and incoming landing before their endpoints are occupied', () => {
  const W = world(),
    a = { groundRadius: 0.2 },
    b = {
      groundRadius: 0.2,
      mode: 'rest',
      on: { kind: 'ground' },
      p: point(-1, 0),
      act: { type: 'walk', to: point(1, 0) },
    };
  W.groundBirds = [a, b];
  assert.equal(groundPathFree(W, a, point(0, -1), point(0, 1)), false);
  b.mode = 'fly';
  b.groundGoal = point(0, 0);
  assert.equal(groundPathFree(W, a, point(0, -1), point(0, 1)), false);
  assert.equal(groundPathFree(W, a, point(2, -1), point(2, 1)), true);
});
test('blocked pavement never stacks birds at the fallback home and departure cancels pending arrivals', () => {
  const W = world(1, () => false),
    g = flock(W);
  g.reset(true);
  assert(g.birds.every((b) => b.mode === 'off'));
  W.nav.free = () => true;
  g.land(point(), false);
  assert(g.birds.some((b) => b.order));
  g.scatter(point());
  assert(g.birds.every((b) => !b.order && !b.groundGoal));
  g.land(point(), false);
  g.step(0.1, false);
  assert(g.birds.every((b) => !b.order && !b.groundGoal));
});
test('clearance radius covers the real bird meshes through ground pecks and wing shakes', () => {
  for (const kind of ['pigeon', 'sparrow']) {
    const g = flock(world(0.85), kind, 1),
      b = g.birds[0],
      v = new THREE.Vector3(),
      m = new THREE.Matrix4();
    b.p.set(0, 0, 0);
    b.yaw = 0;
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      b.pitch = 0.65 * Math.sin(Math.PI * k);
      b.fold = 1 - 0.55 * Math.sin(Math.PI * k);
      b.flap = 0.25 * Math.sin(k * 40);
      g.meshes.pose(0, b);
      for (const mesh of [g.meshes.body, g.meshes.left, g.meshes.right]) {
        mesh.getMatrixAt(0, m);
        for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
          v.fromBufferAttribute(mesh.geometry.attributes.position, j).applyMatrix4(m);
          assert(Math.hypot(v.x, v.z) <= b.groundRadius, `${kind} vertex exceeds ground clearance`);
        }
      }
    }
  }
});

test('actual touchdown and settling wings fit the reserved landing clearance', () => {
  for (const kind of ['pigeon', 'sparrow']) {
    const W = world(0.85),
      g = flock(W, kind, 1),
      b = g.birds[0],
      v = new THREE.Vector3(),
      m = new THREE.Matrix4();
    function covered() {
      g.meshes.pose(0, b);
      for (const mesh of [g.meshes.body, g.meshes.left, g.meshes.right]) {
        mesh.getMatrixAt(0, m);
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          v.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(m).sub(b.p);
          assert(Math.hypot(v.x, v.z) <= b.groundRadius, `${kind}: landing pose outside clearance`);
        }
      }
    }
    b.p.set(0, 0, 0);
    b.pitch = -0.5;
    b.fold = 0;
    b.flap = 0.175;
    covered();
    for (let i = 0; i < 80; i++) {
      b.p.set(Math.sin(i) * 7, 3 + Math.cos(i), Math.cos(i) * 7);
      b.yaw = i;
      b.pitch = 0;
      b.roll = 0;
      b.fold = 0;
      b.flap = 0;
      flyTo(b, point(), { kind: 'ground' }, HABITS[kind], W.K);
      while (b.mode === 'fly') stepBird(b, 1 / 30, HABITS[kind], W);
      covered();
      for (let j = 0; j < 15; j++) {
        stepBird(b, 1 / 30, HABITS[kind], W);
        covered();
      }
    }
  }
});
