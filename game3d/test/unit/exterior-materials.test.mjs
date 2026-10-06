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
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { groundPatches, TOWN } = await import('../../js/scenes/town.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { facadeDrainage } = await import('../../js/scenes/outdoor/facade-detail.js');
const { skylineSteps } = await import('../../js/scenes/skyline.js');
const { kindOf, isPatched } = await import('../../js/look/procedural.js');
const dispose = (root) =>
  root.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });

test('shared ground keeps one batch per colour and distinguishes lawn, road and paving', () => {
  const root = new THREE.Group();
  groundPatches(root, [
    [0, 2, 0, 2, TOWN.grass],
    [3, 5, 0, 2, TOWN.grass],
    [0, 2, 3, 5, TOWN.road],
    [3, 5, 3, 5, TOWN.paving],
  ]);
  assert.equal(root.children.length, 3);
  assert.deepEqual(
    root.children.map((o) => o.userData.surf),
    ['grass', 'asphalt', 'concrete'],
  );
  assert.equal(root.children[0].geometry.index.count, 72, 'both lawns remain in one mesh');
  dispose(root);
});

test('mixed skyline ground applies lawn detail without changing sea/path or its draw budget', () => {
  const root = new THREE.Group();
  const layout = {
    BUILDINGS: [],
    CHUNKS: {},
    toLocal: (id, x, z) => [x, z],
    GREEN: [{ rect: [0, 0, 2, 2] }],
    PATHS: [
      { rect: [3, 0, 4, 2] },
      {
        points: [
          [8, 0],
          [8, 2],
        ],
        width: 1,
      },
    ],
    MOWN: [{ rect: [5, 0, 7, 2], y: -0.14, color: TOWN.grass }],
  };
  const it = skylineSteps(root, 'test', {
    layout,
    tier: 0,
    land: [
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
    ],
    landColor: TOWN.grass,
  });
  let result = it.next();
  while (!result.done) result = it.next();
  const ground = root.getObjectByName('skyline:ground');
  assert.equal(result.value.stats.meshes, 1);
  assert.ok(isPatched(ground.material));
  const { position, aLook } = ground.geometry.attributes;
  assert.equal(aLook.count, position.count);
  const roles = new Map();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i).toFixed(3);
    if (!roles.has(y)) roles.set(y, new Set());
    roles.get(y).add(aLook.getX(i));
  }
  for (const y of ['-0.160', '-0.145', '-0.140']) assert.deepEqual([...roles.get(y)], [kindOf('grass')]);
  for (const y of ['-0.200', '-0.130'])
    assert.deepEqual([...roles.get(y)], [0], 'sea and paths retain their existing treatment');
  dispose(root);
});

test('facade hardware stays attached, clear of front doors and batched once across buildings', () => {
  const root = new THREE.Group(),
    p = new Parts();
  facadeDrainage(p, [0, 8, 0, 6], 5);
  facadeDrainage(p, [10, 18, 0, 6], 5);
  const meshes = p.build(root);
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].userData.surf, 'metal');
  assert.equal(meshes[0].castShadow, false);
  const a = meshes[0].geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i),
      y = a.getY(i),
      z = a.getZ(i);
    assert.ok(y >= 0 && y <= 5);
    assert.ok(z >= 0 && z <= 6);
    assert.ok(
      [0, 8, 10, 18].some((w) => Math.abs(x - w) <= 0.181),
      'hardware cannot spill into a doorway or path',
    );
  }
  assert.ok(a.count / 3 < 400, 'two buildings cost fewer than 400 added triangles');
  dispose(root);
});

hooks.deregister();
