import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
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
  document: { body: { classList: { contains: () => false } } },
});
const THREE = await import('three');
const { vergeSteps } = await import('../../js/scenes/works/verges.js');
const { EAST_TREES, clearOfServices } = await import('../../js/scenes/works/verge-plan.js');
const { belt } = await import('../../js/scenes/dorm-court/cluster-yards.js');
const { keyaki, ginkgo, sakura } = await import('../../js/scenes/outdoor/planting.js');
const { Nav } = await import('../../js/movement/navigation.js');
const P = await import('../../js/scenes/works/plan.js');

function collector() {
  return {
    geometries: [],
    geo(color, geometry, options = {}) {
      this.geometries.push({ geometry, options });
    },
    box(color, w, h, d, x, y, z, options) {
      this.geo(color, new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), options);
    },
  };
}
const candidate = collector();
for (const step of vergeSteps(candidate)) void step;
const original = (p) => {
  for (const step of belt(p, [-45.6, -40.5, -89.5, -64.5], [keyaki, ginkgo, sakura], { seed: 505, pitch: 3.2 }))
    void step;
};

test('Works verge keeps the original belt tree identities and every trunk/branch vertex', () => {
  const before = collector(),
    roots = [],
    descriptors = collector();
  descriptors.planting = {
    tree(p, { species, x, z, scale, seed }) {
      roots.push([species, x, z, scale, seed]);
      return true;
    },
  };
  original(before);
  original(descriptors);
  assert.equal(roots.length, EAST_TREES.length);
  roots.forEach((row, i) =>
    row.forEach((value, j) => {
      if (typeof value === 'number') assert(Math.abs(value - EAST_TREES[i][j]) < 1e-10);
      else assert.equal(value, EAST_TREES[i][j]);
    }),
  );
  const bark = (p) =>
    p.geometries
      .filter(({ options }) => options.surf === 'bark')
      .map(({ geometry }) => geometry.attributes.position.array);
  const a = bark(before),
    b = bark(candidate);
  assert.equal(a.length, 40); // the street-style trees (diorama/planting.js), code-built without the models here
  assert.equal(b.length, a.length);
  a.forEach((vertices, i) => {
    assert.equal(vertices.length, b[i].length);
    assert.deepEqual(vertices, b[i]);
  });
});

test('generated Works planting stays outside real navigation and clear of gate/poles', () => {
  const [x0, x1, z0, z1] = P.BOUNDS;
  const nav = new Nav(x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, 0.14);
  nav.extra = (x, z) => P.WALKS.some((r) => P.inRect(x, z, r, -0.02));
  for (const r of P.FURNITURE) nav.block(...r);
  nav.build();
  for (const { geometry } of candidate.geometries) {
    const v = geometry.attributes.position;
    for (let i = 0; i < v.count; i++) {
      const x = v.getX(i),
        z = v.getZ(i);
      assert(!nav.free(...P.pt([x, z])), `planting enters walk at ${x}, ${z}`);
      if (x < -50) assert(clearOfServices(x, z), `planting reaches service clearance at ${x}, ${z}`);
      assert(x >= -51.901 && x <= -40.199 && z >= -89.801 && z <= -64.199);
      assert(v.getY(i) < 3.1, 'planting remains well below the utility wires');
    }
  }
});

test('soil and connected cover have separate supported surfaces, with open trunk pockets', () => {
  const surfaces = candidate.geometries.filter(({ geometry }) => geometry.type === 'ExtrudeGeometry');
  const soil = surfaces.filter(({ options }) => options.surf === 'soil');
  const cover = surfaces.filter(({ options }) => options.surf === 'foliage');
  assert.equal(soil.length, 4);
  assert.equal(cover.length, soil.length);
  assert.equal(cover[0].geometry.parameters.shapes.holes.length, EAST_TREES.length);
  soil.forEach(({ geometry }, i) => {
    geometry.computeBoundingBox();
    cover[i].geometry.computeBoundingBox();
    const a = geometry.boundingBox,
      b = cover[i].geometry.boundingBox;
    assert(a.min.y > 0.005, 'soil clears existing lawn surface');
    assert(b.min.y < a.max.y && b.max.y > a.max.y + 0.05, 'cover touches soil without coplanar top faces');
  });
  assert.deepEqual(
    new Set(candidate.geometries.map(({ options }) => options.surf)),
    new Set(['soil', 'foliage', 'bark', 'diorama-tree', 'mulch', 'stone']),
  );
});

test('foreground trees build once in the island frame with actual shadows, outside the ground cells', () => {
  const ground = collector(),
    island = new THREE.Group();
  for (const step of vergeSteps(ground, island)) void step;
  // bark, crowns, and the root beds' mulch, stone ring and leaf cover
  assert.equal(island.children.length, 5, 'bark and foliage merge into their existing material classes');
  const before = collector(),
    originalCrowns = new THREE.Box3();
  for (const [kind, x, z, scale, seed] of EAST_TREES) ({ keyaki, ginkgo, sakura })[kind](before, x, z, scale, seed);
  for (const { geometry, options } of before.geometries)
    if (options.surf === 'diorama-tree') {
      geometry.computeBoundingBox();
      originalCrowns.union(geometry.boundingBox);
    }
  const crowns = island.children.find((mesh) => mesh.userData.surf === 'diorama-tree');
  crowns.geometry.computeBoundingBox();
  for (const end of ['min', 'max'])
    for (const axis of ['x', 'y', 'z'])
      assert(
        Math.abs(crowns.geometry.boundingBox[end][axis] - originalCrowns[end][axis]) < 1e-5,
        'leaf surfaces preserve the original full tree crown envelope',
      );

  assert(ground.geometries.every(({ options }) => options.surf !== 'bark'));
  for (const mesh of island.children) {
    assert(mesh.isMesh);
    assert(mesh.receiveShadow);
    if (['bark', 'diorama-tree'].includes(mesh.userData.surf)) assert(mesh.castShadow);
    assert.deepEqual(mesh.position.toArray(), [0, 0, 0]);
    mesh.geometry.computeBoundingBox();
    assert(mesh.geometry.boundingBox.min.x > -46 && mesh.geometry.boundingBox.max.x < -40);
    mesh.geometry.dispose();
  }
});
