import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
const T = await import('three');
const { fence } = await import('../../js/kit/street/fence.js');
const { createTraversal } = await import('../../js/movement/traversal.js');
const { canTravel } = await import('../../js/places/definitions.js');
const { storyPath } = await import('../../js/days.js');
const { waysOut } = await import('../../js/travel/ways.js');

test('service fence physically blocks both approaches at walking and running-jump heights, at every detail level', () => {
  for (const level of ['phone', 'standard', 'high']) {
    const space = new T.Group();
    // Collect the actual kit geometry with one plain material, keeping every sheet and bar.
    const p = { level, geo(_c, geometry) { space.add(new T.Mesh(geometry, new T.MeshStandardMaterial())); } };
    fence(p, { from: [-1.5, 0], to: [1.5, 0], variant: 'service', seed: 548 });
    const physical = createTraversal({ space });
    for (const x of [-1.49, -0.97, -0.43, 0, 0.47, 1.04, 1.49])
      for (const feet of [0, 0.5, 0.95, 1.35])
        for (const side of [-1, 1])
          assert.equal(physical.free(x, -side * 0.35, x, side * 0.35, feet, 0.85, true), false, `${level} ${x} ${feet} ${side}`);
    assert.equal(physical.free(0, 1, 0, 0.5, 0, 0.85, false), true, 'free space beside fence remains traversable');
  }
});

test('closed forecourt seam has no native trigger, permitted trip or map way on any playable day', async () => {
  for (const day of [1, 2, 3, 4, 5, 6, 17, 32])
    for (const [from, to, target] of [['forecourt', 'campus', 'campus'], ['campus', 'forecourt', 'forecourt']]) {
      const story = (await import(new URL('../../js/' + storyPath(from, day), import.meta.url))).default;
      assert.equal(canTravel(from, to, day), false, `${day} ${from} trip`);
      assert.equal(story.on['talk:' + target], undefined, `${day} ${from} talk`);
      assert.equal(story.on['zone:' + target + '_exit'], undefined, `${day} ${from} zone`);
      assert.equal(waysOut(from, story, { day, cond: () => true }).some(w => w.to === to), false, `${day} ${from} map`);
    }
  for (const day of [1, 2, 3]) {
    for (const [from, to] of [['campus', 'office_quarter'], ['office_quarter', 'campus'], ['campus', 'harbour'], ['harbour', 'campus'], ['campus', 'print_shop'], ['print_shop', 'campus'], ['harbour', 'ferry_terminal'], ['ferry_terminal', 'harbour']])
      assert.equal(canTravel(from, to, day), true, `${day} ${from} ${to} preserved`);
    assert.equal(canTravel('forecourt', 'plaza', day), true);
    assert.equal(canTravel('forecourt', 'shotengai', day), true);
    if (day > 1) assert.equal(canTravel('forecourt', 'gate', day), true);
  }
});
