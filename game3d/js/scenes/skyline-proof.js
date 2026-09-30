// Dev only (?place=dorm_court&skyline=1; ?skyline=occ adds a test occluder on the near edge): the chunk with
// buildSkyline around it, from the small stub layout below (the dorm cluster, in the island-layout.js shape).
// Stats on window.__skyline. Nothing here runs without the flag.
import * as THREE from 'three';
import { buildSkyline } from './skyline.js';
import { addOccluder, screenShadow, updateOccluders } from './occluders.js';
import { mat } from '../props.js';

const AT = [80, 10]; // the stub's dorm_court origin in the island frame
const R = (x0, z0, x1, z1) => [x0 + AT[0], z0 + AT[1], x1 + AT[0], z1 + AT[1]];
const P = (...pts) => pts.map(([x, z]) => [x + AT[0], z + AT[1]]);
const STUB = {
  CHUNKS: { dorm_court: { at: AT, walk: [-5.2, -4.3, 5.4, 2.5] } },
  toLocal: (c, x, z) => [x - AT[0], z - AT[1]],
  BUILDINGS: [
    // the dorm cluster: 5-7 storey blocks around planted courts, one L-shaped
    {
      id: 'dorm-n1',
      rect: R(-15, -17, -5, -11),
      storeys: 6,
      wall: 1,
      windows: 'dorm',
    },
    {
      id: 'dorm-l',
      poly: P([6, -19], [15, -19], [15, -9], [11, -9], [11, -14], [6, -14]),
      storeys: 7,
      wall: 0,
      windows: 'dorm',
    },
    {
      id: 'dorm-w',
      rect: R(-19, -9, -11, -3),
      storeys: 5,
      wall: 3,
      windows: 'dorm',
    },
    {
      id: 'dorm-e',
      rect: R(11, -8, 17, -1),
      storeys: 5,
      wall: 2,
      windows: 'dorm',
    },
    {
      id: 'dorm-ne',
      rect: R(-3, -22, 5, -16),
      storeys: 6,
      wall: 0,
      windows: 'dorm',
    },
    {
      id: 'shop-se',
      rect: R(8, 4, 14, 7),
      storeys: 2,
      wall: 3,
      windows: 'shop',
    },
    {
      id: 'clinic',
      rect: R(-24, -2, -19, 3),
      storeys: 3,
      wall: 1,
      windows: 'flat',
    },
    // further off: offices and the tower to the west, more dorms east
    {
      id: 'office-1',
      rect: R(-40, -30, -28, -22),
      storeys: 5,
      wall: 2,
      windows: 'office',
    },
    {
      id: 'office-2',
      rect: R(-26, -34, -14, -26),
      storeys: 4,
      wall: 1,
      windows: 'office',
    },
    {
      id: 'tower',
      rect: R(-58, -14, -47, -6),
      storeys: 11,
      floorH: 2,
      wall: 2,
      windows: 'office',
    },
    {
      id: 'dorm-far1',
      rect: R(20, -30, 30, -22),
      storeys: 6,
      wall: 0,
      windows: 'dorm',
    },
    {
      id: 'dorm-far2',
      rect: R(24, -14, 32, -4),
      storeys: 5,
      wall: 1,
      windows: 'dorm',
    },
    {
      id: 'gym',
      rect: R(-8, -44, 10, -32),
      storeys: 3,
      wall: 3,
      windows: 'flat',
    },
    {
      id: 'hall-far',
      rect: R(34, -40, 46, -30),
      storeys: 4,
      wall: 2,
      windows: 'office',
    },
  ],
  GREEN: [
    { rect: R(-10, -10, -5, -4) },
    { rect: R(6, -8, 10, -3) },
    { rect: R(-4, -15, 5, -9) },
    { rect: R(-30, -20, -18, -10) },
  ],
  PATHS: [
    { points: P([-60, 0.5], [-5, 0.5]), width: 2.2 },
    { points: P([-60, 6.2], [60, 6.2]), width: 2.4 },
    { points: P([0, -9], [0, -30]), width: 1.6 },
  ],
  COAST: [P([-90, -70], [90, -70], [90, 8.2], [-90, 8.2])],
};

export async function skylineProof(place, game) {
  const Q = new URLSearchParams(location.search);
  const layout = STUB; // until scenes/island-layout.js lands; then pass that module instead
  const t = performance.now();
  const sky = buildSkyline(place.space, place.name, {
    layout,
    evening: place.defaultPeriod === 'evening',
  });
  sky.stats.ms = Math.round(performance.now() - t);
  const onPeriod = place.onPeriod;
  place.onPeriod = (p) => (onPeriod?.call(place, p), sky.onPeriod(p));
  if (Q.get('skyline') === 'occ') {
    // a three-storey test block on the court's near edge that fades while Eric is in its screen shadow
    const box = new THREE.Mesh(new THREE.BoxGeometry(4, 5.7, 2.5).translate(1, 2.85, 4.4), mat('#868079'));
    place.space.add(box);
    addOccluder(place, box, screenShadow({ x0: -1, x1: 3, zNorth: 3.15, h: 5.7 }));
    const update = place.update;
    place.update = (dt, t2) => (update?.call(place, dt, t2), updateOccluders(place, game.player.root.position, dt));
  }
  window.__skyline = sky.stats;
}
