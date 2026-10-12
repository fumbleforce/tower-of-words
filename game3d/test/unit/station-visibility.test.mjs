import assert from 'node:assert/strict';
import test from 'node:test';
import { stationSight } from '../../js/scenes/station-visibility.js';

test('station south canopy hides an approaching head beyond the building footprint', () => {
  const towardCamera = { x: -0.7, y: 0.7, z: 0 };
  const through = stationSight(towardCamera);
  const building = through([
    [-6.8, 5.8],
    [0, 4.1],
    [2.65, 11.65],
  ]);
  const canopy = through(
    [
      [-3.4, 2.4],
      [0, 2.3],
      [11.65, 13.55],
    ],
    1.3,
  );
  assert.equal(building({ x: -0.5, z: 12.45 }), false);
  assert.equal(canopy({ x: -0.5, z: 12.45 }), true);
  assert.equal(canopy({ x: -0.5, z: 15.0 }), false);
  assert.equal(canopy({ x: -5.0, z: 12.45 }), false);
});

test('station sight tests follow a changed camera direction and ignore boxes behind the player', () => {
  const view = { x: 0, y: 0.7, z: 0.7 };
  const hit = stationSight(view)([
    [-2, 2],
    [0, 4],
    [2, 4],
  ]);
  assert.equal(hit({ x: 0, z: 1 }), true);
  assert.equal(hit({ x: 0, z: 5 }), false);
  view.z = -0.7;
  assert.equal(hit({ x: 0, z: 5 }), true);
});
