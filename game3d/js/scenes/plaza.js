// The fountain plaza, the second outdoor chunk of island-map-4, east of the head-office forecourt, placed and sized
// from the island layout (scenes/island-layout.js). The camera looks north and follows Eric. The plan (what is
// where) is plaza/plan.js: the round paved plaza (the map's, 23 across) with the fountain in the middle; the lane
// from head office meets it on the fountain's east-west axis and leaves it on the same axis toward the dorms; a
// planted ring with a ring of trees round the circle; north of it, on the fountain's north-south axis, the
// canteen's door, its terrace and a short link from the terrace to the circle. Built with the shared outdoor kit
// (scenes/outdoor/): the ground in plaza/ground.js, the planting and edges in plaza/green.js, lamps, benches, the
// notice board and the terrace in plaza/furniture.js, the fountain in plaza/fountain.js, the canteen and the shop
// street in plaza-buildings.js, the east lane on to the dorm street (backdrop) in plaza/east-lane.js, the back lane
// behind the canteen with the clinic (backdrop) in plaza/north-lane.js. Everything else
// comes from the layout through buildSkyline. Palette and light are the forecourt's; after work the lamps, the lights
// round the basin, the canteen, the shops and the town's windows light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { canteenSteps, shopStreetSteps } from './plaza-buildings.js';
import { groundSteps } from './plaza/ground.js';
import { greenSteps } from './plaza/green.js';
import {
  buildLamps,
  buildBenches,
  buildNoticeBoard,
  buildTerrace,
  buildBikes,
  PIGEON_HOME,
} from './plaza/furniture.js';
import { pigeons } from './outdoor/pigeons.js';
import { fountain } from './plaza/fountain.js';
import * as P from './plaza/plan.js';
import { eastLaneSteps } from './plaza/east-lane.js';
import { BLOCK_IDS, BLOCKS as EAST_BLOCKS, CROSS, SOUTH_WALK, FINGER, NOOKS } from './plaza/east-plan.js';
import { buildNooks } from './outdoor/nooks.js';
import { nookWalks } from './outdoor/nook-walks.js';
import { northLaneSteps } from './plaza/north-lane.js';
import { NORTH_IDS } from './plaza/north-plan.js';
import { clusterSteps, placeIn, CLUSTER_IDS } from './dorm-court/cluster.js';
import { seafrontSteps } from './outdoor/seafront.js';
import { BAYS, SHOPS as NAMED_SHOPS } from './island-south.js';
import { coastLand } from './island-west.js';
import { MAP_LAYER } from '../map/render.js';

const { F, R, BASIN, LZ, HALF, LINK, CANTEEN, SHOPS, DOOR_X, TERRACE, TERRACE_S, building, onLane, inRect } = P;
const CHUNK = 'plaza';

// the lane's centre z along the plaza, and a point on it
export const laneZ = () => LZ;
const lanePoint = (x) => [x, LZ];
const laneFace = () => Math.PI / 2; // east
// the training centre (block_e1, plaza/east-plan.js): its door at the head of the cross walk, north off the lane
const TRAINING = EAST_BLOCKS.find((k) => k.id === 'block_e1');
const CROSS_N = [CROSS[0], CROSS[1], TRAINING.rect[3], LZ]; // the cross walk from the lane up to that door
// and down from the lane to the south walk, which leads east to the dorm street and on to the shop street
// (scenes/shotengai.js): he walks onto the south walk's first stretch, past which he is on his way there
const CROSS_S = [CROSS[0], CROSS[1], LZ, SOUTH_WALK[3]];
const SHOP_START = [CROSS[0], CROSS[1] + 2.6, SOUTH_WALK[2], SOUTH_WALK[3]];
const SW_Z = (SOUTH_WALK[2] + SOUTH_WALK[3]) / 2;
const WEST_X = F[0] - R - 2.5, // on the lane west of the circle: walking on past it goes back to the forecourt
  EAST_X = CROSS[1] + 1.4; // and on the lane east of the cross walk, on toward the dorms
const NAV = [WEST_X - 3.4, EAST_X + 3.4, CANTEEN[3] + 0.3, F[1] + R + 0.2];

// buildPlaza() builds it at once; plazaSteps() yields between parts, for building in slices (js/perf/slice.js)
export const buildPlaza = () => drain(plazaSteps());
export function* plazaSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  // the plaza is wider than the forecourt: the sun's shadow box covers the walkable part and the canteen front
  Object.assign(sun.shadow.camera, { left: -21, right: 21, top: 21, bottom: -21, far: 90 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(1, 0, -3);
  sun.position.add(sun.target.position);

  // walkable: the circle (never the basin), the lanes, the link, the terrace (through the gap in its wall), the
  // cross walk up to the training centre's door and down to the south walk's start
  const nav = new Nav(NAV[0], NAV[1], NAV[2], NAV[3], 0.1);
  const terrace = [TERRACE[0], TERRACE[1], TERRACE[2] + 0.3, TERRACE_S - 0.25];
  const link = [LINK[0], LINK[1], TERRACE_S - 1, LINK[3]];
  const NOOK_WALKS = nookWalks(NOOKS);
  nav.extra = (x, z) => {
    const r = Math.hypot(x - F[0], z - F[1]);
    if (r < BASIN + 0.3) return false;
    return (
      r < R - 0.3 ||
      onLane(x, z) ||
      inRect(x, z, terrace) ||
      inRect(x, z, link, 0.25) ||
      inRect(x, z, CROSS_N, 0.25) ||
      inRect(x, z, CROSS_S, 0.25) ||
      inRect(x, z, SHOP_START, 0.25) ||
      NOOK_WALKS.some((r) => inRect(x, z, r))
    );
  };

  yield* groundSteps(root);
  yield;
  const water = fountain(root, F[0], F[1], BASIN);
  yield;
  const p = new Parts(),
    lights = lightSet();
  yield* greenSteps(p);
  const uplit = buildLamps(lights, p, nav, root);
  yield;
  buildBenches(p, nav);
  const board = buildNoticeBoard(p, nav);
  yield;
  const chairs = buildTerrace(root, nav);
  yield;
  buildBikes(root, nav);
  // the finger sign at the south walk's start (plaza/east-lane.js builds it)
  nav.block(FINGER[0] - 0.1, FINGER[0] + 0.1, FINGER[1] - 0.1, FINGER[1] + 0.1);
  yield;
  const nooks = buildNooks(NOOKS, root, { p, lights }); // outdoor/nooks.js: props round each nook, its spot named
  for (const r of nooks.blocks) nav.block(...r);
  const east = yield* eastLaneSteps(root, p, lights); // backdrop: the lane on east to the dorm street
  const north = yield* northLaneSteps(root, lights); // backdrop: the back lane behind the canteen, the clinic
  p.build(root);
  yield;
  const lit = lights.build(root, { poolY: 0.028 }); // over the circle's stones
  const flock = pigeons(root, PIGEON_HOME, { n: 6 });
  yield;
  const hall = yield* canteenSteps(root, CANTEEN, building('canteen').floorH, DOOR_X);
  const street = yield* shopStreetSteps(root, {
    a: SHOPS.a,
    dir: SHOPS.dir,
    depth: SHOPS.depth,
    bays: { ...BAYS, u0: BAYS.x0 - building('shops_north').rect[0] },
    from: 10,
    farLayer: MAP_LAYER,
    storeyH: building('shops_north').floorH,
    shops: NAMED_SHOPS, // the named shops' signs (island-south.js)
  });
  yield;
  // the seafront behind the shop street, on the island map only (outdoor/seafront.js)
  const front = yield* seafrontSteps(root, { at: (x, z) => LAYOUT.toLocal(CHUNK, x, z), layer: MAP_LAYER });
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['canteen', 'shops_north', 'arcade', 'shops_south', ...BLOCK_IDS, ...NORTH_IDS, ...CLUSTER_IDS, 'dorm_1'],
    land: coastLand(LAYOUT.COAST.line), // lawn to the coast, not sea, past the plaza's own ground
    landColor: TOWN.grass,
  });
  yield* mergeStaticSteps(root);
  // backdrop past the dorm street: the dorm cluster and stand-ins for the courtyard and Eric's block, in its own
  // group so the merge above leaves it out (it is never near the camera)
  const cluster = placeIn(new THREE.Group(), CHUNK);
  root.add(cluster);
  const dorms = yield* clusterSteps(cluster, { plaza: true });
  yield;

  // the points the place uses; the lane's ends are where the walks to the forecourt and the dorms start
  const arriveIn = lanePoint(F[0] - R + 3.7);
  return {
    root,
    scene,
    sun,
    nav,
    fountain: F,
    fountainEdge: [F[0], F[1] + BASIN + 0.6],
    westLane: lanePoint(WEST_X - 0.5), // walking out west: to here, then on to the edge
    westEdge: lanePoint(WEST_X - 2.6),
    // arriving from the forecourt: the crossfade shows him close up on the lane just short of the circle, and he
    // walks on in along the axis with the fountain ahead
    arriveEdge: lanePoint(F[0] - R - 0.5),
    arriveIn,
    arriveFace: laneFace(),
    dormExit: lanePoint(EAST_X - 0.8),
    // the training centre's door, and where Eric stands to try it
    trainingDoor: [TRAINING.at, TRAINING.rect[3]],
    trainingStep: [TRAINING.at, TRAINING.rect[3] + 0.8],
    dormEdge: lanePoint(EAST_X + 2.2),
    // the south walk east of the cross walk's foot, on the way to the shop street: where he starts down it, and
    // where the walk out ends (the same, walking in); past shopX he is leaving
    shopWalk: [CROSS[1] + 0.9, SW_Z],
    shopEdge: [CROSS[1] + 3.2, SW_Z],
    shopX: CROSS[1] + 1.6,
    swZ: SOUTH_WALK[2] - 0.3,
    westX: WEST_X,
    eastX: EAST_X,
    laneZ,
    laneHalf: HALF,
    camera: { elev: 46, fov: 24 },
    board, // the notice board: where it stands and its top
    pigeons: flock, // the flock by the fountain; the place feeds it Eric's position
    chairs, // the terrace chairs, standing or stacked for closing (places/canteen-closing.js)
    nooks: nooks.spots,
    update(dt, t) {
      water.update(t);
      north.update(sun);
      east.update(sun);
    },
    evening() {
      lit.evening();
      uplit();
      hall.glass.emissiveIntensity = 0.45;
      water.evening();
      street.glass.emissiveIntensity = 0.55;
      street.signs.evening();
      east.evening();
      north.evening();
      dorms.evening();
      front.evening();
      sky.onPeriod('evening');
      nooks.evening();
    },
    cards: (day, period) => east.cards(day, period),
    skyline: sky.stats,
  };
}
