// The east lane (east_lane), the second district of the island's south half built to walk (docs/game/island.md,
// "East lane"; Jørgen's pick on Review island-half-1): the lane on east from the plaza to its jog, the pocket park
// inside the jog, the dorm street down past the dorm courtyard's gate, the south walk with the café, the liquor and
// rice shop and the barber, and the north street up to the back lane and Amakawa Travel. What is where:
// east-lane/plan.js. It is the plaza's own backdrop of the same ground, built whole by the same builders in the
// plaza's frame: the paving, park, planting and the small blocks with the named shops' signs and shut doors
// (plaza/east-lane.js, plaza/east-shops.js), the back lane with the clinic and block_e2 (plaza/north-lane.js), the
// lane's own stretch and verges (plaza/ground.js, plaza/green.js) and its lamps; the dorm courtyard and its cluster
// (dorm-court/cluster.js), the shop street's east end (plaza-buildings.js), and the town round it from the layout
// (skyline.js). The camera turns: north-east over most of it, so the north street's fronts, the park and Amakawa
// Travel face it, and south-east over the south walk, where the shops face north (places/east-lane.js eases it).
// Evening: the shops' signs, the blocks' glass and the lamps light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, TOWN, SUN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lamps, lightSet } from './outdoor/furniture.js';
import { paver } from './outdoor/paving.js';
import { shopStreetSteps } from './plaza-buildings.js';
import { eastLaneSteps } from './plaza/east-lane.js';
import { northLaneSteps } from './plaza/north-lane.js';
import { eastLaneField } from './plaza/ground.js';
import { eastVergeSteps } from './plaza/green.js';
import { lampPoints } from './plaza/furniture.js';
import { BLOCK_IDS } from './plaza/east-plan.js';
import { NORTH_IDS } from './plaza/north-plan.js';
import { SHOPS as PLAZA_SHOPS, LZ, F, R } from './plaza/plan.js';
import { clusterSteps, placeIn, CLUSTER_IDS } from './dorm-court/cluster.js';
import { coastLand } from './island-west.js';
import { BAYS, SHOPS } from './island-south.js';
import * as P from './east-lane/plan.js';

const { CHUNK, inRect } = P;

export const buildEastLane = () => drain(eastLaneChunkSteps());
export function* eastLaneChunkSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  // the district is long: the sun's shadow box follows Eric (follow() below), a square round him
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 16,
    bottom: -16,
    far: 80,
  });
  sun.shadow.camera.updateProjectionMatrix();
  let sunDir = new THREE.Vector3(...SUN.morning).normalize();
  const follow = (x, z) => {
    const sx = Math.round(x / 2) * 2,
      sz = Math.round(z / 2) * 2; // in steps, so the shadows don't crawl as he walks
    sun.target.position.set(sx, 0, sz);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 40);
  };
  follow(...P.IN);

  // walkable: the streets and walks (plan.js WALKS), never what stands on them
  const [bx0, bx1, bz0, bz1] = P.BOUNDS;
  const nav = new Nav(bx0 - 0.2, bx1 + 0.2, bz0 - 0.2, bz1 + 0.2, 0.1);
  nav.extra = (x, z) => P.WALKS.some((r) => inRect(x, z, r, -0.02));
  for (const r of P.FURNITURE) nav.block(...r);

  // the plaza's frame, where its builders work
  const pf = new THREE.Group();
  pf.position.set(P.PLAZA[0], 0, P.PLAZA[1]);
  root.add(pf);
  yield;
  // the lane's own stretch from the plaza, its verges and its lamps (as the plaza lays them)
  const pv = paver();
  eastLaneField(pv);
  pv.build(pf);
  const p = new Parts(),
    lights = lightSet();
  yield* eastVergeSteps(p);
  for (const [x, z, shift, pool] of lampPoints().filter(([x, z]) => x > F[0] + R + 2 && Math.abs(z - LZ) < 2))
    lamps(lights, p, [[x, z]], { kind: 'post', pool, poolShift: shift });
  yield;
  const east = yield* eastLaneSteps(pf, p, lights); // the east lane, its blocks and named shops
  const north = yield* northLaneSteps(pf, lights); // the back lane, the clinic, block_e2 (Amakawa Travel)
  p.build(pf);
  const lit = lights.build(pf, { poolY: 0.03 });
  yield;
  // the shop street's east end past the dorm street's foot, from its backs (as the plaza draws it)
  const street = yield* shopStreetSteps(pf, {
    a: PLAZA_SHOPS.a,
    dir: PLAZA_SHOPS.dir,
    depth: PLAZA_SHOPS.depth,
    bays: {
      ...BAYS,
      u0: BAYS.x0 - LAYOUT.BUILDINGS.find((b) => b.id === 'shops_north').rect[0],
    },
    from: 10,
    storeyH: LAYOUT.BUILDINGS.find((b) => b.id === 'shops_north').floorH,
    shops: SHOPS,
  });
  yield;
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['shops_north', 'arcade', 'shops_south', ...BLOCK_IDS, ...NORTH_IDS, ...CLUSTER_IDS, 'dorm_1'],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
  });
  yield* mergeStaticSteps(root);
  // the dorm courtyard and its cluster east of the dorm street, in its own group so the merge leaves it out
  const cluster = placeIn(new THREE.Group(), CHUNK);
  root.add(cluster);
  const dorms = yield* clusterSteps(cluster, { plaza: true });
  yield* nav.buildSteps();

  return {
    root,
    scene,
    sun,
    nav,
    follow,
    in: P.IN,
    arriveEdge: P.ARRIVE_EDGE,
    exits: P.EXITS,
    doors: P.DOORS,
    southTurn: P.SOUTH_TURN,
    camera: { elev: 46, fov: 24 },
    update() {
      north.update(sun);
      east.update(sun);
    },
    evening() {
      sunDir = new THREE.Vector3(...SUN.evening).normalize();
      lit.evening();
      east.evening();
      north.evening();
      dorms.evening();
      street.glass.emissiveIntensity = 0.55;
      street.signs.evening();
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
