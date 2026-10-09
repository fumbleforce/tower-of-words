// Big merged meshes cut into pieces so what's off screen is culled, and shadows cast from lighter stand-ins (#372):
// perf/tile-geometry.js, perf/shadow-proxy.js, and how scenes/merge-static.js and outdoor/parts.js carry them.
import assert from 'node:assert/strict';
import test from 'node:test';
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
Object.assign(globalThis, { location: { search: '' }, window: {} }); // what parts.js's imports read
const THREE = await import('three');
const { tileGeometry, tilePieces, followPieces, setTiling } = await import('../../js/perf/tile-geometry.js');
const { shadowGeometry, shadowProxy, setShadowGeometry } = await import('../../js/perf/shadow-proxy.js');
const { mergeStatic } = await import('../../js/scenes/merge-static.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { mat } = await import('../../js/props.js');

// n small boxes (12 triangles each) in a row along x, every `step` metres from 0.5 at z = 5 (clear of cell edges),
// merged into one non-indexed geometry
function row(n, step = 1) {
  const p = new Parts();
  for (let i = 0; i < n; i++) p.box('#808080', 0.2, 0.2, 0.2, 0.5 + i * step, 0, 5);
  const root = new THREE.Group();
  p.build(root);
  return root.children[0].geometry;
}
const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
const centreX = (g) => (g.computeBoundingBox(), (g.boundingBox.min.x + g.boundingBox.max.x) / 2);

test('a merged geometry over the limit is cut into compact pieces with every triangle kept once', () => {
  const g = row(100); // 1200 triangles over 99 m
  assert.deepEqual(tileGeometry(g, { max: 2000 }), [g], 'small enough: left whole');
  const pieces = tileGeometry(g, { max: 300 });
  assert.ok(pieces.length >= 4 && pieces.every((p) => tris(p) <= 300));
  assert.equal(pieces.reduce((s, p) => s + tris(p), 0), 1200);
  assert.deepEqual(Object.keys(pieces[0].attributes).sort(), Object.keys(g.attributes).sort());
  // each piece is a stretch of the row, not a scatter across it
  for (const p of pieces) {
    p.computeBoundingBox();
    assert.ok(p.boundingBox.max.x - p.boundingBox.min.x < 99 / 3, 'a piece spans part of the row');
  }
});

test('in squares: one piece per cell the triangles fall in', () => {
  const g = row(40, 1); // 0.5 to 39.5 m
  const pieces = tilePieces(g, { cell: 10, max: 100 });
  assert.equal(pieces.length, 4);
  assert.deepEqual(pieces.map((l) => l.length).sort((a, b) => a - b), [120, 120, 120, 120]);
});

test('a shadow stand-in is cut to follow the pieces it belongs to', () => {
  const g = row(40, 1),
    standIn = row(40, 1); // the same row, as if lighter
  const pieces = tilePieces(g, { cell: 10, max: 100 });
  const cut = followPieces(standIn, g, pieces);
  assert.equal(cut.length, pieces.length);
  cut.forEach((c, i) => assert.ok(Math.abs(centreX(c) - centreX(tileGeometry(g, { cell: 10, max: 100 })[i])) < 1e-6));
});

test('Parts hands its stand-ins on as the merged mesh\'s shadow, the pieces without one casting themselves', () => {
  const p = new Parts();
  p.geo('#4d6b47', new THREE.DodecahedronGeometry(0.5, 0).translate(0, 1, 0), {
    shadow: new THREE.IcosahedronGeometry(0.5, 0).translate(0, 1, 0),
  });
  p.box('#808080', 1, 1, 1, 3, 0, 0);
  p.geo('#4d6b47', new THREE.DodecahedronGeometry(0.5, 0), { cast: false });
  const root = new THREE.Group();
  const [cast, still] = p.build(root);
  assert.equal(tris(shadowGeometry(cast)), 20 + 12, 'icosahedron for the ball, the box itself');
  assert.equal(shadowProxy(still), null, 'what casts nothing has no stand-in');
  assert.equal(cast.geometry.attributes.uv, undefined, 'no zero texture coordinates');
});

test('the merge carries stand-ins, cuts big sets, and leaves non-casting pieces to draw themselves', () => {
  setTiling({ cell: 10, max: 200, rest: 200 });
  try {
    const root = new THREE.Group();
    const m = mat('#9a9a9a');
    for (let i = 0; i < 40; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), m);
      box.position.set(0.5 + i, 0, 5);
      box.castShadow = true;
      setShadowGeometry(box, new THREE.BoxGeometry(0.2, 0.2, 0.2).toNonIndexed()); // as heavy, for the count
      root.add(box);
      const flat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat('#5a5a5a'));
      flat.position.set(0.5 + i, 0, 7);
      root.add(flat);
    }
    mergeStatic(root);
    const casters = root.children.filter((o) => o.castShadow),
      rest = root.children.filter((o) => !o.castShadow);
    assert.equal(casters.length, 4, 'in 10 m squares');
    assert.equal(casters.reduce((s, o) => s + tris(shadowGeometry(o)), 0), 480, 'every stand-in triangle kept once');
    assert.ok(casters.every((o) => shadowProxy(o) && !o.userData.noBatch));
    assert.ok(rest.length >= 3 && rest.every((o) => o.userData.noBatch && tris(o.geometry) <= 200));
    assert.ok(root.children.every((o) => !o.geometry.attributes.uv), 'untextured: no uv');
  } finally {
    setTiling({});
  }
});
