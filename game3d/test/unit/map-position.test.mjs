import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { ericAt, goalAt } = await import('../../js/ui/map/where.js');
const { toIsland } = await import('../../js/scenes/island-layout.js');
hooks.deregister();

test('staged dorm floors share the player and goal island coordinates and heading', () => {
  const game = {
    place: { name: 'dorms' },
    player: { root: { position: { x: 1, z: 2 }, rotation: { y: 0.7 } } },
    markers: { list: [{ enabled: () => true, goal: () => true, anchor: (v) => v.set(3, 1, 4) }] },
  };
  const player = ericAt(game), goal = goalAt(game);
  assert.deepEqual([player.x, player.z], toIsland('dorms', 1, 2));
  assert.deepEqual(goal, toIsland('dorms', 3, 4));
  for (const offset of [40, 80]) {
    game.place.mapOffset = () => [offset, 0];
    game.player.root.position.x = 1 + offset;
    game.markers.list[0].anchor = (v) => v.set(3 + offset, 1, 4);
    const shifted = ericAt(game);
    assert.deepEqual([shifted.x, shifted.z], [player.x, player.z]);
    assert.ok(Math.abs(shifted.a - player.a) < 1e-12);
    assert.deepEqual(goalAt(game), goal);
  }
});
