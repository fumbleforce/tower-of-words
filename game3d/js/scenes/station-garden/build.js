import * as THREE from 'three';
import { coastSteps, WEST } from '../outdoor/coast.js';
import { Parts } from '../outdoor/parts.js';
import { lightSet } from '../outdoor/furniture.js';
import { glowSet } from '../../kit/light/glow.js';
import { paver } from '../outdoor/paving.js';
import { band } from '../outdoor/band.js';
import { walk } from '../plaza/east-lane.js';
import { buildStation } from '../station-exterior.js';
import { CHUNKS } from '../island-layout.js';
import { maintenanceProps } from './props.js';
import { finishStreet } from '../diorama/materials.js';
import { stationLighter } from '../station-model.js';

export function* gardenSteps(island, root) {
  const garden = new THREE.Group();
  garden.name = 'station-garden';
  island.add(garden);
  const clip = band([[-30, -5.5, 11, 26.9]]),
    p = new Parts(),
    lights = lightSet(),
    pv = paver();
  for (const id of ['station_walk', 'south_link', 'garden_arcade', 'garden_return']) {
    const [x0, z0, x1, z1] = WEST.walks[id].rect;
    walk(clip.paver(pv), [x0, x1, z0, z1]);
  }
  const [sx0, sz0, sx1, sz1] = WEST.walks.garden_square.rect;
  pv.field([sx0, sx1, sz0, sz1], { module: [1.1, 1.1], h: 0.012 });
  // Raise the square's slabs above the intersecting walk courses; keep its canonical furniture and kerbs.
  yield* coastSteps(garden, {
    at: (x, z) => [x, z],
    clip: clip.has,
    data: { ...WEST, coast: [] },
    into: p,
    lights,
  });
  pv.build(garden);
  p.build(garden);
  const glow = glowSet().add(lights.build(garden).glows),
    practical = new THREE.PointLight('#ffe3b5', 4.5, 8, 2);
  const [lx, lz] = WEST.walks.garden_square.lamps[0];
  practical.position.set(lx, 2.4, lz);
  practical.visible = false;
  garden.add(practical);
  glow.add({ show: practical });
  const stationFrame = new THREE.Group();
  stationFrame.position.set(CHUNKS.forecourt.at[0], 0, CHUNKS.forecourt.at[1]);
  island.add(stationFrame);
  const station = buildStation(stationFrame, { covered: true }),
    tools = maintenanceProps(root);
  // This is the same station as the forecourt: retain its masonry grain and window interiors
  // when approaching from the shopping street, including the covered walkway's concrete.
  finishStreet(stationFrame, stationLighter());
  const point = new THREE.Vector3(),
    direction = new THREE.Vector3();
  return {
    tools,
    period(period) {
      station.onPeriod(period);
      glow.set(period === 'evening' || period === 'night');
    },
    update(pos, dt, dir) {
      root.localToWorld(point.copy(pos));
      stationFrame.worldToLocal(point);
      direction.copy(dir).transformDirection(root.matrixWorld);
      direction.transformDirection(stationFrame.matrixWorld.clone().invert());
      station.update(point, dt, direction);
    },
  };
}
