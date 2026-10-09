// The world kit's first street-style families (game3d/js/kit/{building,street,planting}/): every piece declares
// itself fully, builds every variant at every detail level, gets lighter on the phone, and reports what it blocks,
// where you can sit or go in, and what glows at night.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const kit = await import('../../js/kit/index.js');
const { Parts } = await import('../../js/kit/core/parts.js');

const place = (piece, opts) => {
  const p = new Parts();
  const at = piece.decl.run ? { from: [-1.5, 0], to: [1.5, 0] } : { at: [0, 0] };
  const out = piece(p, { ...at, ...opts });
  const root = new THREE.Group();
  const built = kit.buildKit(p, root);
  let tris = 0;
  root.traverse((o) => {
    if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  return { out, built, root, tris };
};

test('every piece is declared fully and registered once', () => {
  const ids = new Set();
  const fidelity = kit.FIDELITY.map(([id]) => id);
  for (const piece of kit.PIECES) {
    const d = piece.decl;
    assert.ok(d.id && !ids.has(d.id), d.id);
    ids.add(d.id);
    assert.ok(['building', 'street', 'planting', 'lighting'].includes(d.family), d.id);
    assert.ok(d.label && d.use && fidelity.includes(d.fidelity), d.id);
    assert.ok(Object.keys(d.variants).length >= 3 || d.id === 'street/bike-rack', d.id);
    assert.equal(kit.pieceById(d.id), piece);
  }
});

test('every variant builds at every level, lighter on the phone, and its footprint is sound', () => {
  for (const piece of kit.PIECES)
    for (const variant of Object.keys(piece.decl.variants)) {
      const t = Object.fromEntries(kit.LEVELS.map((level) => [level, place(piece, { variant, level, seed: 5 }).tris]));
      assert.ok(t.phone > 0 && t.phone <= t.standard && t.standard <= t.high, `${piece.id} ${variant} ${JSON.stringify(t)}`);
      const { out } = place(piece, { variant, seed: 5 });
      for (const [x0, x1, z0, z1] of out.blocks) assert.ok(x0 < x1 && z0 < z1, `${piece.id} ${variant}`);
    }
});

test('the same seed builds the same piece; neighbours differ', () => {
  const colours = (root) => {
    const out = [];
    root.traverse((o) => {
      if (o.isMesh && o.geometry.attributes.color) out.push(...o.geometry.attributes.color.array.slice(0, 30));
    });
    return out.map((v) => v.toFixed(4)).join();
  };
  for (const piece of kit.PIECES) {
    const variant = Object.keys(piece.decl.variants)[0];
    const at = (x) => (piece.decl.run ? { from: [x - 1.5, 0], to: [x + 1.5, 0] } : { at: [x, 0] });
    const a = place(piece, { ...at(0), variant, seed: 9 }),
      b = place(piece, { ...at(0), variant, seed: 9 });
    assert.equal(colours(a.root), colours(b.root), piece.id);
    const seeds = new Set([0, 4, 8, 12, 16].map((x) => colours(place(piece, { ...at(x), variant }).root)));
    assert.ok(seeds.size > 1, `${piece.id}: five positions, one look`);
  }
});

test('what blocks walking', () => {
  const f = place(kit.fence, { from: [0, 0], to: [6, 0], variant: 'bars' }).out.blocks;
  assert.equal(f.length, 1);
  assert.ok(f[0][0] <= 0 && f[0][1] >= 6 && f[0][3] - f[0][2] < 0.3, JSON.stringify(f));
  assert.equal(place(kit.lamp, { at: [2, 3], variant: 'post' }).out.blocks.length, 1);
  assert.equal(place(kit.lamp, { variant: 'wall' }).out.blocks.length, 0);
  assert.equal(place(kit.windowBay, { variant: 'punched' }).out.blocks.length, 0);
  assert.equal(place(kit.doorway, { variant: 'porch' }).out.blocks.length, 2); // its two posts
  assert.equal(place(kit.doorway, { variant: 'glazed' }).out.blocks.length, 0);
  const [[x0, x1]] = place(kit.treePit, { variant: 'bench' }).out.blocks;
  assert.ok(x1 - x0 > 2, 'the bench round the tree blocks its square');
});

test('where you can sit, go in, park and plant', () => {
  const door = place(kit.doorway, { at: [10, 0], face: 0, variant: 'glazed' }).out.spots;
  // in front of the door (south of it, face 0), facing it (north)
  assert.ok(door.enter[0][1] > 0.5 && Math.abs(Math.abs(door.enter[0][3]) - Math.PI) < 1e-3, JSON.stringify(door));
  assert.equal(place(kit.treePit, { variant: 'bench' }).out.spots.seats.length, 4);
  assert.equal(place(kit.planter, { variant: 'seat' }).out.spots.seats.length, 3);
  assert.equal(place(kit.planter, { variant: 'box' }).out.spots.seats, undefined);
  assert.deepEqual(place(kit.treePit, { at: [4, 5], variant: 'grate' }).out.spots.plant[0].slice(0, 2), [4, 5]);
  assert.equal(place(kit.bikeRack, { from: [0, 0], to: [4.5, 0], variant: 'slots' }).out.spots.bikes.length, 10);
  assert.ok(place(kit.sign, { variant: 'finger' }).out.spots.labels.length === 2);
});

test('what glows at night: lamps with their pools, lit rooms by the seed, never a frosted window', () => {
  for (const variant of Object.keys(kit.lamp.decl.variants)) {
    const { out, built } = place(kit.lamp, { variant });
    assert.ok(out.glow.some((g) => g.kind === 'lamp' && g.pool > 0), variant);
    assert.ok(built.glows.some((g) => g.mat && g.night.emissiveIntensity > 1), variant);
  }
  let lit = 0;
  for (let seed = 1; seed <= 40; seed++) lit += place(kit.windowBay, { variant: 'punched', seed }).out.glow.length;
  assert.ok(lit > 8 && lit < 32, `${lit} of 40 punched windows lit`);
  for (let seed = 1; seed <= 20; seed++) assert.equal(place(kit.windowBay, { variant: 'frosted', seed }).out.glow.length, 0);
  const shop = place(kit.windowBay, { variant: 'shop', seed: 2 });
  assert.ok(shop.built.meshes.some((m) => m.name === 'kit:glass'));
  const pillar = place(kit.sign, { variant: 'pillar' });
  assert.ok(pillar.out.glow.filter((g) => g.kind === 'lamp').length === 2, 'both faces of the pillar sign glow');
});
