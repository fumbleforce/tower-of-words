// The world kit's core (game3d/js/kit/core/, notes/architecture/world-kit.md): one seeded random, the Parts
// collector, the material cache, piece declarations with seeded variation, and what a piece reports (the ground it
// blocks, its spots, what glows at night) in the place's frame, at every detail level.
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
const { rng, hash2, seedAt, hashStr } = await import('../../js/kit/core/rng.js');
const { mat } = await import('../../js/kit/core/mat.js');
const { Parts } = await import('../../js/kit/core/parts.js');
const { piece, buildKit, levelFor, LEVELS, FIDELITY } = await import('../../js/kit/index.js');
const outdoor = await import('../../js/scenes/outdoor/parts.js');
const props = await import('../../js/props.js').catch(() => null);

test('one seeded random: the outdoor kit path re-exports the core, and the sequence is unchanged', () => {
  assert.equal(outdoor.rng, rng);
  assert.equal(outdoor.Parts, Parts);
  assert.equal(outdoor.hash2, hash2);
  const r = rng(7);
  // the generator the outdoor kit has always used (Park-Miller over seed * 7919), so no planting moves
  let s = ((7 * 7919) % 2147483646) + 1;
  for (let i = 0; i < 5; i++) assert.equal(r(), (s = (s * 16807) % 2147483647) / 2147483647);
  assert.notEqual(seedAt('street/lamp', 0, 0), seedAt('street/lamp', 3, 0));
  assert.equal(seedAt('street/lamp', 1.234, 5), seedAt('street/lamp', 1.234, 5));
  assert.notEqual(hashStr('a'), hashStr('b'));
});

test('the material cache: shared by colour and options, own() is never shared', () => {
  assert.equal(mat('#123456'), mat('#123456'));
  assert.notEqual(mat('#123456'), mat('#123456', { roughness: 0.2 }));
  assert.notEqual(mat.own('#123456'), mat.own('#123456'));
  if (props) assert.equal(props.mat, mat);
});

// a test piece: a 1 x 0.5 box, a seat at its front, a lamp head with a pool, a window pane lit at night
const block = piece({
  id: 'test/block',
  family: 'street',
  variants: { plain: { w: 1 }, wide: { w: 2 } },
  vary: { tone: 0.05, wear: [0, 0.4], scale: [0.9, 1.1], turn: 0.1 },
  build(k, o) {
    k.box('#808080', o.w, 0.5, 0.5, 0, 0, 0, { round: 0.05 });
    k.cyl('#404040', 0.05, 0.05, 2, 0, 0.5, 0, { n: 12 });
    k.lamp(new THREE.BoxGeometry(0.2, 0.2, 0.2).translate(0, 2.6, 0), [0, 0.5, 1]);
    k.glass(new THREE.BoxGeometry(0.6, 0.6, 0.02).translate(0, 1, 0.3));
    k.lit(new THREE.PlaneGeometry(0.6, 0.6).translate(0, 1, 0.29));
  },
  footprint: (o) => [[-o.w / 2, o.w / 2, -0.25, 0.25]],
  spots: () => ({ seats: [[0, 0.5, 0.45]] }),
});

test('a piece reports its footprint, spots and glow in the place frame, facing and all', () => {
  const p = new Parts();
  const a = block(p, { at: [10, 5], face: Math.PI / 2, variant: 'wide', seed: 3 });
  assert.equal(a.blocks.length, 1);
  const [x0, x1, z0, z1] = a.blocks[0];
  // face east: the 2 m width runs along z, the 0.5 depth along x, about the point (scale and turn are small)
  assert.ok(x1 - x0 < 0.9 && z1 - z0 > 1.7, JSON.stringify(a.blocks));
  assert.ok(Math.abs((x0 + x1) / 2 - 10) < 0.01 && Math.abs((z0 + z1) / 2 - 5) < 0.01);
  // the seat is in front of it: east of it
  const [sx, sz] = a.spots.seats[0];
  assert.ok(sx > 10.3 && Math.abs(sz - 5) < 0.1, JSON.stringify(a.spots));
  assert.deepEqual(a.glow.map((g) => g.kind).sort(), ['lamp', 'pane']);
  assert.equal(a.glow.find((g) => g.kind === 'lamp').pool, 1);
  // the same seed builds the same piece; another position another one
  const again = block(new Parts(), { at: [10, 5], face: Math.PI / 2, variant: 'wide', seed: 3 });
  assert.deepEqual(again.blocks, a.blocks);
  const b = block(new Parts(), { at: [10, 5], face: Math.PI / 2, variant: 'wide' });
  const c = block(new Parts(), { at: [12, 5], face: Math.PI / 2, variant: 'wide' });
  assert.notEqual(b.seed, c.seed);
  assert.throws(() => block(new Parts(), { variant: 'nope' }), /no variant/);
});

test('buildKit makes the glass, the night panes, the lamp heads and hands the light rig its glows', () => {
  const p = new Parts();
  block(p, { at: [0, 0] });
  block(p, { at: [3, 0], variant: 'wide' });
  const root = new THREE.Group();
  const out = buildKit(p, root);
  const names = out.meshes.map((m) => m.name);
  assert.ok(names.includes('kit:glass') && names.includes('kit:lit') && names.includes('kit:lamps'));
  assert.equal(root.getObjectByName('kit:lit').visible, false);
  assert.equal(out.blocks.length, 2);
  assert.equal(out.spots.seats.length, 2);
  assert.equal(out.glow.length, 4);
  // the rig's entries: the lit panes shown at night, the heads' material turned up (pools need a browser)
  assert.ok(out.glows.some((g) => g.show === root.getObjectByName('kit:lit')));
  assert.ok(out.glows.some((g) => g.mat && g.night.emissiveIntensity > 1));
  // the glass is the window glass colour, which the street finish looks for
  assert.equal(root.getObjectByName('kit:glass').material.color.getHexString(), '8c9dad');
  // the collector is empty for the next build
  assert.equal(buildKit(p, new THREE.Group()).blocks.length, 0);
});

const tris = (root) => {
  let n = 0;
  root.traverse((o) => {
    if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  return n;
};

test('detail levels: the phone level is lighter, high heavier; levelFor follows phone, tier, budget and distance', () => {
  const at = {};
  for (const level of LEVELS) {
    const p = new Parts();
    block(p, { at: [0, 0], seed: 1, level });
    const root = new THREE.Group();
    buildKit(p, root);
    at[level] = tris(root);
  }
  assert.ok(at.phone < at.standard && at.standard < at.high, JSON.stringify(at));
  assert.equal(levelFor({ phone: true, tier: 2 }), 'phone');
  assert.equal(levelFor({ tier: 1 }), 'standard');
  assert.equal(levelFor({ tier: 2 }), 'high');
  assert.equal(levelFor({ tier: 2, tight: true }), 'standard');
  assert.equal(levelFor({ tier: 1, far: true }), 'phone');
  assert.deepEqual(
    FIDELITY.map(([id]) => id),
    ['placeholder', 'basic', 'finished', 'hero'],
  );
});

test('run pieces lay along from..to', () => {
  const rail = piece({
    id: 'test/rail',
    run: true,
    build(k, o) {
      k.box('#555555', o.len, 0.9, 0.05, 0, 0, 0);
    },
    footprint: (o) => [[-o.len / 2, o.len / 2, -0.1, 0.1]],
  });
  const a = rail(new Parts(), { from: [0, 0], to: [0, 4] });
  const [x0, x1, z0, z1] = a.blocks[0];
  assert.ok(Math.abs(z0) < 1e-3 && Math.abs(z1 - 4) < 1e-3 && x1 - x0 < 0.25, JSON.stringify(a.blocks));
});
