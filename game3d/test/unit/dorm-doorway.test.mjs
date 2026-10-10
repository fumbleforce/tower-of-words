import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
globalThis.location = { search: '' };
const T = await import('three');
const { dormEnclosures } = await import('../../js/scenes/dorms/enclosure.js');
const { DOORWAY, DOORWAY_H, H, LOW } = await import('../../js/scenes/dorms/layout.js');
const { slidingDoor } = await import('../../js/scenes/dorms/entry.js');
const { Kit } = await import('../../js/scenes/dorms/kit.js');
test('room 203 has head clearance at default scale and retains solid jambs/header', () => {
  const root = new T.Group();
  dormEnclosures(root, new T.Group(), { fronts: [] });
  root.updateMatrixWorld(true);
  const enclosure = root.children[0];
  const hits = (x, y) =>
    new T.Raycaster(new T.Vector3(x, y, 0.25), new T.Vector3(0, 0, -1), 0, 0.5).intersectObject(enclosure, true);
  for (const x of [DOORWAY[0] + 0.03, -0.15, DOORWAY[1] - 0.03])
    assert.equal(hits(x, 1.416).length, 0, 'Eric head height clears opening');
  assert.ok(DOORWAY_H > 1.416 && DOORWAY_H < H);
  assert.ok(hits(DOORWAY[0] - 0.03, 1.2).length, 'kitchen jamb remains solid');
  assert.ok(hits(DOORWAY[1] + 0.03, 1.2).length, 'bath jamb remains solid');
  assert.ok(hits(-0.15, (DOORWAY_H + H) / 2).length, 'lintel remains solid');
});
test('parked sliding leaves stay out of the passage in overview and full-height views', () => {
  for (const [bottom, top] of [
    [0, LOW],
    [LOW, DOORWAY_H - 0.02],
  ]) {
    const k = new Kit();
    slidingDoor(k, bottom, top);
    const root = k.flush(new T.Group());
    root.updateMatrixWorld(true);
    const ray = new T.Raycaster(
      new T.Vector3(DOORWAY[1] - 0.01, (bottom + top) / 2, 0.25),
      new T.Vector3(0, 0, -1),
      0,
      0.5,
    );
    assert.equal(ray.intersectObject(root, true).length, 0, 'parked panels do not narrow the aperture');
    const box = new T.Box3().setFromObject(root);
    assert.ok(box.max.x <= 1.05, 'panels fit existing flat');
  }
});
