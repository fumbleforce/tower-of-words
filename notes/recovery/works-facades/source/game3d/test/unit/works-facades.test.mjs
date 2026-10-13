import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
const hook = registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
const context = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 20 }) : () => context) });
class Canvas {
  getContext() {
    return context;
  }
  toDataURL() {
    return 'data:image/png;base64,';
  }
}
Object.assign(globalThis, {
  HTMLCanvasElement: Canvas,
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null },
  document: {
    body: { classList: { contains: () => false } },
    documentElement: { style: { setProperty() {} } },
    createElement: () => new Canvas(),
  },
});
const THREE = await import('three');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { faces, faceAt } = await import('../../js/scenes/outdoor/block-face.js');
const { blockSets } = await import('../../js/scenes/outdoor/block.js');
const { buildingsSteps } = await import('../../js/scenes/works/buildings.js');
const P = await import('../../js/scenes/works/plan.js');
const { industrialShell } = await import('../../js/scenes/works/industrial-facades.js');
const { factoryOpenings } = await import('../../js/scenes/works/factory-facade.js');
function building(id) {
  const p = new Parts(),
    sets = blockSets(),
    signs = { board() {}, card() {} },
    lights = { lit: [], glowParts: [] };
  for (const _ of buildingsSteps(p, sets, signs, signs, lights, [id])) void _;
  return { p, sets, lights };
}
function rays(p, glass = false) {
  return [...p.sets.values()]
    .filter((s) => !!s.opts?.userData?.noLook === glass)
    .flatMap((s) => s.list)
    .map((g) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
}
function hit(meshes, f, t, y, far = 0.38) {
  const [x, z] = faceAt(f, t, 0.1);
  return new THREE.Raycaster(
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(-f.n[0], 0, -f.n[1]),
    0,
    far,
  ).intersectObjects(meshes);
}
function fingerprint(id) {
  const { p, sets, lights } = building(id),
    hash = createHash('sha256');
  for (const collector of [p, sets.p, sets.glass, sets.lit])
    for (const [key, set] of collector.sets) {
      hash.update(key);
      for (const g of set.list)
        for (const key of Object.keys(g.attributes)) {
          hash.update(key);
          hash.update(Buffer.from(g.attributes[key].array.buffer));
        }
    }
  for (const g of lights.glowParts) hash.update(Buffer.from(g.attributes.position.array.buffer));
  hash.update(JSON.stringify(lights.lit));
  return hash.digest('hex');
}

test('works shells leave real openings on all four faces and solid supporting wall around them', () => {
  const p = new Parts(),
    rect = [-3, 4, -5, 6],
    F = faces(rect),
    holes = Object.fromEntries(Object.keys(F).map((s) => [s, [[1, 2.5, 1, 3]]]));
  industrialShell(p, rect, 4, holes, { wall: '#aaa', surf: 'metal', rib: '#999', ribSides: ['n', 's', 'w', 'e'] });
  const meshes = rays(p);
  for (const f of Object.values(F)) {
    assert.equal(hit(meshes, f, 1.7, 1.7, 0.5).length, 0, 'wall and corrugation clear the opening');
    assert.ok(hit(meshes, f, 0.5, 1.7).length > 0, 'jamb wall remains');
    assert.ok(hit(meshes, f, 1.7, 3.4).length > 0, 'header wall remains');
  }
});

test('every factory wall window has a clear reveal and glazing recessed 21 cm inside it', () => {
  const { p } = building('factory'),
    solid = rays(p),
    glass = rays(p, true),
    F = faces(P.FACTORY);
  let checked = 0;
  for (const [side, holes] of Object.entries(factoryOpenings()))
    for (const [a, b, y0, y1] of holes) {
      if (y0 < 1) continue;
      const t = a + (b - a) * 0.23,
        y = y0 + (y1 - y0) * 0.37;
      assert.equal(hit(solid, F[side], t, y).length, 0, `${side} window free of wall/ribs`);
      const hits = hit(glass, F[side], t, y);
      assert.ok(hits.length > 0);
      assert.ok(Math.abs(hits[0].distance - 0.31) < 1e-4, 'glass behind the wall face');
      checked++;
    }
  assert.equal(checked, 15, 'the complete planned wall glazing set');
});

test('factory glazing never lies behind the existing sliding track or closed gate leaves', () => {
  const { p } = building('factory'),
    front = P.FACTORY[3];
  const obstructions = [
    { x0: P.GATES.x - P.GATES.w - 0.3, x1: P.GATES.x + P.GATES.w + 0.3, y0: P.GATES.h + 0.15, y1: P.GATES.h + 0.35 },
    { x0: P.GATES.x - P.GATES.w / 2, x1: P.GATES.x + P.GATES.w / 2, y0: 0.12, y1: P.GATES.h },
  ];
  for (const mesh of rays(p, true)) {
    const g = mesh.geometry;
    g.computeBoundingBox();
    const b = g.boundingBox;
    if (Math.abs(b.min.z - (front - 0.21)) > 1e-4) continue;
    for (const r of obstructions)
      assert.ok(
        b.max.x <= r.x0 || b.min.x >= r.x1 || b.max.y <= r.y0 || b.min.y >= r.y1,
        'glass does not overlap the gate mechanism',
      );
  }
});

test('power-plant tall glazing closes real concrete openings without a hidden solid body', () => {
  const { p } = building('plant'),
    solid = rays(p),
    glass = rays(p, true),
    F = faces(P.PLANT);
  for (const side of ['s', 'w', 'e']) {
    const f = F[side],
      n = Math.round(f.L / 2.2),
      pitch = f.L / n;
    for (let i = 0; i < n; i++) {
      const a = i * pitch + 0.45,
        b = (i + 1) * pitch - 0.45,
        t = a + (b - a) * 0.23;
      assert.equal(hit(solid, f, t, 7.09).length, 0, `${side} bay ${i} clear of concrete`);
      const hits = hit(glass, f, t, 7.09);
      assert.ok(hits.length > 0);
      assert.ok(Math.abs(hits[0].distance - 0.31) < 1e-4);
    }
  }
});

test('all four factory north lights are physical roof openings closed by inset glass', () => {
  const { p } = building('factory'),
    solid = rays(p),
    glass = rays(p, true),
    [x0, x1, z0, z1] = P.FACTORY,
    D = (z1 - z0) / 4;
  for (let i = 0; i < 4; i++) {
    const f = { a: [x1, z0 + i * D], d: [-1, 0], n: [0, -1], L: x1 - x0 },
      t = 0.3 + (f.L - 0.6) * 0.231;
    assert.equal(hit(solid, f, t, 6.93).length, 0, 'no full triangular roof volume behind north light');
    assert.ok(hit(glass, f, t, 6.93).length > 0);
  }
});

test('untouched chimney and server-hall construction retain their original primitive geometry', () => {
  // Captured from main 5f97ad4a before editing; includes the recently improved hall fittings.
  assert.equal(fingerprint('chimney'), '86c1951096250bea01dd62c392d4bdb63d690b2a642ef1bb5b559147096986ca');
  assert.equal(fingerprint('hall'), '02bbc11d3cd3d8005afe7564bdff650964649d556c130006a4b6fbc6ea96dd68');
});
process.on('exit', () => hook.deregister());
