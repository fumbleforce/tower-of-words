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
const context = new Proxy(
  {},
  {
    get: (_, k) => (k === 'measureText' ? () => ({ width: 20 }) : () => context),
  },
);
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
    body: { classList: { contains: () => false, toggle() {} } },
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
const { plantIvy } = await import('../../js/scenes/works/ivy.js');
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
    .filter((s) => (s.opts?.finish === 'glass') === glass)
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
          hash.update(
            Buffer.from(
              g.attributes[key].array.buffer,
              g.attributes[key].array.byteOffset,
              g.attributes[key].array.byteLength,
            ),
          );
        }
    }
  for (const g of lights.glowParts)
    hash.update(
      Buffer.from(
        g.attributes.position.array.buffer,
        g.attributes.position.array.byteOffset,
        g.attributes.position.array.byteLength,
      ),
    );
  hash.update(JSON.stringify(lights.lit));
  return hash.digest('hex');
}

test('works shells leave real openings on all four faces and solid supporting wall around them', () => {
  const p = new Parts(),
    rect = [-3, 4, -5, 6],
    F = faces(rect),
    holes = Object.fromEntries(Object.keys(F).map((s) => [s, [[1, 2.5, 1, 3]]]));
  industrialShell(p, rect, 4, holes, {
    wall: '#aaa',
    surf: 'metal',
    rib: '#999',
    ribSides: ['n', 's', 'w', 'e'],
  });
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
    {
      x0: P.GATES.x - P.GATES.w - 0.3,
      x1: P.GATES.x + P.GATES.w + 0.3,
      y0: P.GATES.h + 0.15,
      y1: P.GATES.h + 0.35,
    },
    {
      x0: P.GATES.x - P.GATES.w / 2,
      x1: P.GATES.x + P.GATES.w / 2,
      y0: 0.12,
      y1: P.GATES.h,
    },
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

test('factory gates and inset personnel doors remain physically closed', () => {
  const closures = [
    ...[-P.GATES.w / 4, 0, P.GATES.w / 4].map((offset) => [
      'factory',
      's',
      P.GATES.x - P.FACTORY[0] + offset,
      P.FACTORY,
    ]),
    ['plant', 'e', P.PLANT[3] - P.PLANT_DOOR.z, P.PLANT],
    ['shed', 's', 6.8, P.SHED],
    ['kiosk', 's', 1.2, P.KIOSK],
  ];
  for (const [id, side, t, rect] of closures) {
    const { p } = building(id);
    assert.ok(hit(rays(p), faces(rect)[side], t, 1.5, 0.6).length, id + ' is sealed by its door');
  }
});

test('plant piers clear the complete door opening below the lintel', () => {
  const { p } = building('plant'),
    solid = rays(p),
    f = faces(P.PLANT).e;
  const t = P.PLANT[3] - P.PLANT_DOOR.z;
  for (const offset of [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6]) {
    const hits = hit(solid, f, t + offset, 1.8, 0.6);
    assert.ok(hits.length);
    assert.ok(hits[0].distance >= 0.18, 'door surface is inset, with no concrete pier ahead of it');
  }
});

test('leaf ivy keeps the original corner envelope with a bounded opaque mesh budget', () => {
  const p = new Parts();
  plantIvy(p, 0, 0, ['#4f6b45', '#5b7a4e', '#46603f']);
  assert.ok(
    [...p.sets.values()].every((set) => set.surf !== 'foliage'),
    'finished ivy is not coarsened as a phone canopy',
  );
  const bounds = new THREE.Box3();
  let triangles = 0;
  for (const set of p.sets.values())
    for (const g of set.list) {
      g.computeBoundingBox();
      bounds.union(g.boundingBox);
      triangles += (g.index?.count ?? g.attributes.position.count) / 3;
    }
  assert.ok(bounds.min.x >= -2.25 && bounds.max.x <= 0.17);
  assert.ok(bounds.min.z >= -2 && bounds.max.z <= 0.17);
  assert.ok(bounds.min.y >= -0.001 && bounds.max.y <= 5.8);
  assert.ok(triangles < 6500, 'ivy stays below its geometry allowance');
});

test('north-light end jambs close the slots beside the triangular roof caps', () => {
  const { p } = building('factory'),
    solid = rays(p);
  const [x0, x1, z0, z1] = P.FACTORY,
    pitch = (z1 - z0) / 4;
  for (let k = 0; k < 4; k++) {
    const f = { a: [x1, z0 + k * pitch], d: [-1, 0], n: [0, -1], L: x1 - x0 };
    for (const t of [-0.035, f.L + 0.035])
      assert.ok(hit(solid, f, t, 7.4).length, 'cap and jamb meet without an open slot');
  }
});

test('all roof panes finish below the actual sloped plate underside', () => {
  const { p } = building('factory'),
    glass = rays(p, true);
  const roofs = rays(p).filter((m) => {
    m.geometry.computeBoundingBox();
    const size = m.geometry.boundingBox.getSize(new THREE.Vector3());
    return size.x > 24 && size.y > 1.9 && size.y < 2 && size.z > 3.5 && size.z < 3.8;
  });
  assert.equal(roofs.length, 4);
  const panes = glass.filter((m) => {
    m.geometry.computeBoundingBox();
    return m.geometry.boundingBox.min.y > 6.4;
  });
  assert.equal(panes.length, 4);
  for (const pane of panes) {
    const b = pane.geometry.boundingBox,
      x = (b.min.x + b.max.x) / 2,
      z = b.min.z;
    const hits = new THREE.Raycaster(
      new THREE.Vector3(x, b.max.y + 1, z),
      new THREE.Vector3(0, -1, 0),
      0,
      2,
    ).intersectObjects(roofs);
    assert.ok(hits.length >= 2, 'both sides of the thin roof plate are measured');
    const underside = Math.min(...hits.map((h) => h.point.y));
    assert.ok(underside > b.max.y + 0.02, 'glazing stays below the plate with construction clearance');
  }
});

test('untouched chimney and server-hall construction retain their original primitive geometry', () => {
  // Chimney and hall functions are unchanged from main d9ad811e; material keys reflect current shared finishes.
  assert.equal(fingerprint('chimney'), '86c1951096250bea01dd62c392d4bdb63d690b2a642ef1bb5b559147096986ca');
  assert.equal(fingerprint('hall'), '7fe0a09fc234cb745ab8566473ca7ecfa2282ed6c5e27cb5837ea2714348cb1a');
});
process.on('exit', () => hook.deregister());
