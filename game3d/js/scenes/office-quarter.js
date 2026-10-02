// The office quarter (office_quarter), the fifth district of the island's south half built to walk
// (docs/game/island.md, "Office quarter"; Jørgen's pick on Review island-half-1): the sports lane walked on west past
// the gym's corner, north by gym_link and west along the office street past Amakawa Life, Logistics, Electric and
// Trading, with the walks north to Amakawa Foods and Amakawa Construction and the bank's door at the quarter street's
// mouth. What is where: office-quarter/plan.js. The blocks, their doors and names are office-quarter/row.js; the
// gym's corner office-quarter/link.js (shared with the sports ground); the street west of it, its verge, lamps and
// trees office-quarter/grounds.js; the gym the sports ground's (sports/gym.js); the town round it the layout
// (skyline.js).
// The camera turns: north-north-west along the street, north up the walks, as the sports lane by the gym
// (places/office-quarter.js eases it).
// Evening: the lamps, the canopies' lights, the offices' ground floors and some windows, and the gym's glass light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, sunFollow, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { blockSets, buildBlockSets } from './outdoor/block.js';
import { signSet } from './shop-signs.js';
import { placeIn } from './dorm-court/cluster.js';
import { cells } from './dorm-court/cells.js';
import { coastLand } from './island-west.js';
import { gymSteps } from './sports/gym.js';
import { rowSteps } from './office-quarter/row.js';
import { linkSteps } from './office-quarter/link.js';
import { groundsSteps } from './office-quarter/grounds.js';
import * as P from './office-quarter/plan.js';

const { CHUNK, inRect } = P;

export const buildOfficeQuarter = () => drain(officeQuarterSteps());
export function* officeQuarterSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  const shadows = sunFollow(sun); // the street is long: the sun's shadow box follows Eric
  shadows.follow(...P.IN);

  // walkable: the street, the walks and the forecourts (plan.js WALKS), never what stands on them
  const [bx0, bx1, bz0, bz1] = P.BOUNDS;
  const nav = new Nav(bx0 - 0.2, bx1 + 0.2, bz0 - 0.2, bz1 + 0.2, 0.12);
  nav.extra = (x, z) => P.WALKS.some((r) => inRect(x, z, r, -0.02));
  for (const r of P.FURNITURE) nav.block(...r);

  // everything of its own is laid in the island frame, in a group moved into the chunk's
  const isl = placeIn(new THREE.Group(), CHUNK);
  root.add(isl);
  yield;
  const lights = lightSet(),
    signs = signSet();
  // the gym and the office blocks, near and tall: they cast
  const p = new Parts();
  const gym = yield* gymSteps(isl, p, signs, lights);
  const sets = blockSets();
  // the ground and the planting, in cells so what the camera can't see is culled (a group of its own, added after
  // the merge below, so the merge leaves the cells apart)
  const c = cells([-28, -12, 4, 18], [-58, -50]),
    wg = placeIn(new THREE.Group(), CHUNK);
  yield* rowSteps(sets, c.paver, c.parts, signs, lights);
  yield* linkSteps(c.paver, c.parts, lights, isl);
  yield* groundsSteps(c, lights, isl);
  yield* c.paver.build(wg);
  for (const m of yield* c.parts.build(wg)) m.castShadow = false;
  p.build(isl);
  const blocks = buildBlockSets(sets, isl);
  const lit = lights.build(isl, { poolY: 0.03 });
  const sg = signs.build(isl);
  yield;
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['gym', ...P.BLOCK_IDS],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  yield* mergeStaticSteps(root);
  root.add(wg);
  yield* nav.buildSteps();

  return {
    root,
    scene,
    sun,
    nav,
    follow: shadows.follow,
    in: P.IN,
    arriveEdge: P.ARRIVE_EDGE,
    exits: P.EXITS,
    doors: P.DOORS,
    evening() {
      shadows.evening();
      lit.evening();
      sg.evening();
      gym.evening();
      if (blocks.lit) blocks.lit.visible = true;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
