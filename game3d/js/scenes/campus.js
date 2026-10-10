import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { applyGround } from '../movement/walk-ground.js';
import { ground, WALK_AREA } from './campus/ground.js';
import { walkEdges } from './outdoor/walk-edges.js';
import { Parts } from './outdoor/parts.js';
import { TOWN } from './town.js';
import { lightRig } from '../kit/light/rig.js';
import { OUTDOOR } from '../kit/light/looks.js';
import { lightSet } from './outdoor/furniture.js';
import { northSteps } from './forecourt/north.js';
import { campusGrounds } from './campus/grounds.js';
import { campusFronts } from './campus/fronts.js';
import { coastSteps } from './outdoor/coast.js';
import { coastLand } from './island-west.js';
import { skylineSteps } from './skyline.js';
import { bandSteps } from './bands.js';
import { buildShedOnly } from './station-shed.js';
import * as LAYOUT from './island-layout.js';
import * as P from './campus/plan.js';
import { SHELTER_BIKES } from './forecourt/plan.js';
import { mergeStaticSteps } from './merge-static.js';
import { drain } from '../perf/slice.js';

export const buildCampus = () => drain(campusSteps());
export function* campusSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  // the light for every period comes from the period table (kit/light/): the rig, and what glows at night below
  const light = lightRig(scene, { looks: OUTDOOR, grade: { dusk: { charLift: 0.13 } } }),
    lights = lightSet();
  // one walkable ground for the walk grid and the kerbs (campus/ground.js)
  const nav = new Nav(...WALK_AREA, 0.14),
    walkable = ground();
  applyGround(nav, walkable);
  for (const r of P.BEDS) nav.block(...P.rect(r));
  nav.block(P.BENCH.x - 1.02, P.BENCH.x + 1.02, P.BENCH.z - 0.34, P.BENCH.z + 0.34);
  nav.block(...SHELTER_BIKES); // the staff bike shelter's parked bikes and posts (forecourt/north.js)
  const north = yield* northSteps(root, lights, { closed: false });
  yield* campusGrounds(root, lights);
  const edges = new Parts();
  walkEdges(edges, walkable);
  edges.build(root);
  const fronts = campusFronts(root);
  const coast = new THREE.Group();
  root.add(coast);
  yield* coastSteps(coast, {
    at: (x, z) => P.pt([x, z]),
    sea: -0.9,
    data: {
      coast: [{ line: LAYOUT.COAST.line.filter(([x, z]) => x < -48 && z >= -54 && z <= -23), plant: false }],
      walks: {},
      paved: [],
    },
  });
  // The coast wall is shared kit; campusGrounds owns all surface paving.
  const lamps = lights.build(root);
  buildShedOnly(root); // the platform shed south of the rest garden, as the forecourt builds it
  yield;
  const bands = yield* bandSteps(root, 'campus'); // the canteen's yard past the service lane's gate (bands-plan.js)
  const sky = yield* skylineSteps(root, 'campus', {
    layout: LAYOUT,
    skip: ['head_office', 'head_office_wing', 'office_e1', 'w3', 'b_h', 'platform_shed', ...bands.ids],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  yield* mergeStaticSteps(root);
  yield* nav.buildSteps();
  // after work the lamps, the lit windows, the yard past the gate and the skyline glow
  light.glow.add(lamps.glows, fronts.glows, bands.glows, sky.glows);
  if (north.lit) light.glow.add({ show: north.lit });
  return {
    root,
    scene,
    nav,
    light,
    sun: light.sun,
    follow: light.follow, // the shadow box round Eric
    exits: P.EXITS,
    start: P.IN,
    seats: { campus_bench: P.BENCH },
  };
}
