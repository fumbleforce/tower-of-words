// The sports ground (sports), the fourth district of the island's south half built to walk (docs/game/island.md,
// "Sports and baths"; Jørgen's pick on Review island-half-1): the north street's top past the back lane, the sports
// lane west along the gym's front, the pool walk north between the gym and the pool to the shower pavilion's door,
// and the courts walk east along the pool's and the courts' fences, behind the north residence, to the onsen path.
// With the east lane and the east coast it closes the first loop: up the north street, round by the pool and the
// courts, down the coast and back along the dorm row. What is where: sports/plan.js. The gym is sports/gym.js; the
// pool, its deck and its pavilion sports/pool.js; the tennis courts sports/courts.js (shared with the east coast);
// the paving, planting, lamps and signs sports/grounds.js; the gym's corner, where the lane turns into the office
// street, office-quarter/link.js, and the street west of it past the two offices nearest it (Amakawa Life and
// Construction) office-quarter/grounds.js and row.js, all shared with the office quarter; the back lane, the clinic,
// the grove and Amakawa Travel south of it the plaza's own builder of that ground (plaza/north-lane.js), as the east
// lane shows them, with r3's and block_e3's fronts (plaza/east-fronts.js); the town round it the layout (skyline.js).
// The camera turns: north over the lane and the pool walk, north-east at the pavilion, east along the courts walk
// (places/sports.js eases it).
// Evening: the lamps, the gym's glass, the pavilion's windows and the town's windows light up.
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
import { northLaneSteps } from './plaza/north-lane.js';
import { NORTH_IDS } from './plaza/north-plan.js';
import { frontsSteps } from './plaza/east-fronts.js';
import * as E from './plaza/east-plan.js';
import { courts } from './sports/courts.js';
import { gymSteps } from './sports/gym.js';
import { poolSteps } from './sports/pool.js';
import { groundsSteps } from './sports/grounds.js';
import { linkSteps, PAVE_W } from './office-quarter/link.js';
import { streetSteps } from './office-quarter/grounds.js';
import { block } from './office-quarter/plan.js';
import { rowSteps } from './office-quarter/row.js';
import * as P from './sports/plan.js';
import { buildNooks } from './outdoor/nooks.js';

const { CHUNK, inRect } = P;
const FRONTS = E.BLOCKS.filter((k) => k.id === 'r3' || k.id === 'block_e3'); // on the north street's east side
const OFFICES = ['m4', 'm5']; // the office row's nearest the gym's corner, and the street in front of them
const STREET_W = block('m3').rect[1];

export const buildSports = () => drain(sportsSteps());
export function* sportsSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  const shadows = sunFollow(sun); // the district is long: the sun's shadow box follows Eric
  shadows.follow(...P.IN);

  // walkable: the streets and walks (plan.js WALKS), never what stands on them
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
  // the gym and the pool pavilion, near and tall: they cast
  const p = new Parts();
  const gym = yield* gymSteps(isl, p, signs, lights);
  // the ground, the planting, the deck and the courts, in cells so what the camera can't see is culled (a group of
  // its own, added after the merge below, so the merge leaves the cells apart)
  const c = cells([62, 80], [-75, -60, -45]),
    wg = placeIn(new THREE.Group(), CHUNK);
  const pool = yield* poolSteps(isl, p, c.parts, c.paver, signs, lights);
  yield* groundsSteps(c, lights, signs, isl);
  courts(c.parts, signs);
  const sets = blockSets();
  yield* linkSteps(c.paver, c.parts, lights, isl);
  yield* streetSteps(c.paver, c.parts, lights, [STREET_W, PAVE_W]);
  yield* rowSteps(sets, c.paver, c.parts, signs, lights, OFFICES);
  yield* c.paver.build(wg);
  for (const m of yield* c.parts.build(wg)) m.castShadow = false;
  p.build(isl);
  const offices = buildBlockSets(sets, isl);
  const lit = lights.build(isl, { poolY: 0.03 });
  const sg = signs.build(isl);
  yield;
  // the back lane south of the north street's top, as the plaza and the east lane build it, in the plaza's frame;
  // r3's and block_e3's fronts on the north street
  const pf = new THREE.Group();
  const [px, pz] = LAYOUT.toLocal(CHUNK, ...LAYOUT.CHUNKS.plaza.at);
  pf.position.set(px, 0, pz);
  root.add(pf);
  const nlights = lightSet();
  const north = yield* northLaneSteps(pf, nlights);
  const q = new Parts();
  const fronts = yield* frontsSteps(q, nlights, FRONTS, {
    caster: q,
    casts: () => false,
  });
  fronts.meshes(pf);
  for (const m of q.build(pf)) m.castShadow = false;
  const nlit = nlights.build(pf, { poolY: 0.03 });
  yield;
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['gym', 'pool_hall', ...NORTH_IDS, ...FRONTS.map((k) => k.id), ...OFFICES],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  const nooks = buildNooks(P.NOOKS, root);
  for (const r of nooks.blocks) nav.block(...r);
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
    turns: P.TURNS,
    nooks: nooks.spots,
    camera: { elev: 50, fov: 24 },
    update() {
      north.update(sun);
    },
    evening() {
      shadows.evening();
      lit.evening();
      nlit.evening();
      sg.evening();
      gym.evening();
      pool.evening();
      north.evening();
      fronts.evening();
      nooks.evening();
      if (offices.lit) offices.lit.visible = true;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
