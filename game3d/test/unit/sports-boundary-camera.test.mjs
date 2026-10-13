import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundaryOverviewPose } from '../../js/places/sports-camera.js';
import { pt } from '../../js/scenes/sports/plan.js';

const original = { yaw: -1.05, elev: 52 * Math.PI / 180 };
const view = (x, z) => boundaryOverviewPose(...pt([x, z]), original);

test('public bench and pool paving retain their authored overview', () => {
  for (const point of [[55.4, -82.1], [58.2, -86], [58.2, -90.5], [55.5, -79.2]])
    assert.deepEqual(view(...point), original);
});

test('native reachable west-fence endpoints look from the public side of both fence runs', () => {
  for (const [x, z] of [[50.429, -83.68], [50.429, -88.17], [50.429, -91.47], [50.429, -76.8]]) {
    const pose = view(x, z);
    assert(Math.sin(pose.yaw) > 0.8, 'camera stays east of the actor and western fence');
    assert(pose.elev > Math.PI / 3);
  }
  assert(Math.cos(view(50.429, -91.47).yaw) > 0, 'north corner is viewed from south of its fence');
  assert(Math.cos(view(50.429, -76.8).yaw) < 0, 'gym tie is viewed from north of the gym');
});

test('the local view joins its surroundings continuously at every strip edge', () => {
  for (const [x, z] of [[52.2, -86], [54.2, -86], [51, -92.7], [51, -91.7], [51, -76.15], [51, -75.15]]) {
    for (const [dx, dz] of [[1e-5, 0], [0, 1e-5]]) {
      const a = view(x - dx, z - dz), b = view(x + dx, z + dz);
      assert(Math.abs(a.yaw - b.yaw) < 1e-4);
      assert(Math.abs(a.elev - b.elev) < 1e-4);
    }
  }
});
