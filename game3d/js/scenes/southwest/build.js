// The southwest's canonical coast, now built at walking distance from the south promenade.
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { coastSteps, WEST } from '../outdoor/coast.js';
import { WEST_COAST } from '../island-west.js';
import { bench, bins, lamps, lightSet } from '../outdoor/furniture.js';
import { grass, cluster, pine } from '../outdoor/planting.js';
import { rock, drift } from '../forecourt/gardens.js';
import { fence } from '../../kit/street/fence.js';
import { finishStreet } from '../diorama/materials.js';
import { phoneLighter } from '../../perf/phone.js';
import { mergeStaticSteps } from '../merge-static.js';
import { PATHS, REST_BENCHES, NORTH_FENCE } from './plan.js';

export function* southwestSteps(island) {
  const group = new THREE.Group();
  group.name = 'southwest-coast';
  island.add(group);
  const p = new Parts(),
    pv = paver(),
    lights = lightSet();
  for (const [id, w] of Object.entries(PATHS)) {
    const [x0, z0, x1, z1] = w.rect;
    pv.field([x0, x1, z0, z1], {
      module: w.slabs ? [1.1, 1.1] : [0.6, 0.6],
      tones: GRANITE.pale,
      origin: [-40.6, 28.8],
      h: 0.012,
    });
    if (id === 'southwest_promenade') yield;
  }
  yield* coastSteps(group, {
    at: (x, z) => [x, z],
    data: {
      coast: [{ line: WEST_COAST.filter(([, z]) => z >= 5), plant: true }],
      walks: PATHS,
      trees: WEST.trees.filter(([, x, z]) => z > 6 && x < -16 && !(x > -26 && z < 26.9)),
      shrubs: WEST.shrubs.filter(([x, z]) => z >= 7 && x < -32),
      drifts: WEST.drifts.filter(([, x1, z0]) => z0 > 25 && x1 < -16),
      paved: Object.values(PATHS).map((w) => w.rect),
    },
    into: p,
    lights,
  });
  yield;
  REST_BENCHES.forEach(([x, z, face]) => bench(p, x, z, face, { len: 1.8 }));
  bins(p, -25.8, 31.2);
  lamps(
    lights,
    p,
    [
      [-17.1, 28.35],
      [-25.7, 28.35],
      [-37.3, 31.35],
      [-40.1, 16.2],
      [-40.1, 12.7],
    ],
    {
      pool: 1.25,
    },
  );
  fence(p, { ...NORTH_FENCE, variant: 'bars', h: 1.9 });
  // Grasses and low shrubs follow the seaward verge, leaving the route and views open.
  drift(p, [-20.8, -17.4, 31.4, 32.8], { back: 's', seed: 549 });
  for (const [i, x] of [-35.8, -33.8, -31.8].entries()) {
    grass(p, x, 31.65, { h: 0.38, seed: 549 + i });
    cluster(p, x - 0.4, 32.5, { n: 3, r: 0.25, spread: 0.5, seed: 559 + i });
  }
  // Low outcrops give a small jumping detour beside the rest bay, away from the drop.
  for (const [i, [x, z, radius]] of [
    [-29.5, 32.6, 0.7],
    [-28.3, 33.4, 1.0],
    [-27.0, 34.1, 0.7],
  ].entries())
    rock(p, x, z, radius, i);
  pine(p, -21.2, 35.2, 1.35, 549);
  pv.build(group);
  p.build(group);
  finishStreet(group, phoneLighter());
  const lit = lights.build(group, { poolY: 0.025 });
  // Keep this seaward region in compact pieces: district-wide material batches otherwise draw its geometry
  // even when the follow camera faces north toward the plaza. Names retain the regional build-time merge.
  if (!phoneLighter()) {
    yield* mergeStaticSteps(group);
    let piece = 0;
    group.traverse((o) => {
      if (o.isMesh && !o.name) o.name = `southwest:piece-${piece++}`;
    });
  }
  return { group, glows: lit.glows };
}
