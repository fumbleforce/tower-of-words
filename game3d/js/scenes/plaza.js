// The fountain plaza, the second outdoor chunk of island-map-4, east of the head-office forecourt, placed and sized
// from the island layout (scenes/island-layout.js). The camera looks north and follows Eric. The plan (what is
// where) is plaza/plan.js: the round paved plaza (the map's, 23 across) with the fountain in the middle; the lane
// from head office wraps round it in a U (in from the west, along its south edge, out north-east toward the dorms),
// with two short links straight on into the plaza where it turns; a planted ring with a ring of trees round the
// circle; the canteen's terrace on the north. Built with the shared outdoor kit (scenes/outdoor/): the ground in
// plaza/ground.js, the planting and edges in plaza/green.js, lamps, benches and the terrace in plaza/furniture.js,
// the fountain in plaza/fountain.js, the canteen and the shop street in plaza-buildings.js. Everything else comes
// from the layout through buildSkyline. Palette and light are the forecourt's; after work the lamps, the canteen,
// the shops and the town's windows light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { canteen, shopStreet, clinicCross } from './plaza-buildings.js';
import { buildGround } from './plaza/ground.js';
import { buildGreen } from './plaza/green.js';
import { buildLamps, buildBenches, buildTerrace, buildBikes, buildLife } from './plaza/furniture.js';
import { fountain } from './plaza/fountain.js';
import * as P from './plaza/plan.js';

const { F, R, BASIN, LZ, HALF, LANE_N, CANTEEN, SHOPS, DOOR_X, TERRACE, TERRACE_S, building, local, onLane, inRect } =
  P;
const CHUNK = 'plaza';

// the lane's centre z along the plaza, and a point on it
export const laneZ = () => LZ;
const lanePoint = (x) => [x, LZ];
const laneFace = () => Math.PI / 2; // east
const WEST_X = -9.6, // the lane's west end: walking on past it goes back to the forecourt
  EAST_X = 10.6; // and its east end, on toward the dorms
const NAV = [-11.8, 13.2, CANTEEN[3] + 0.3, 11.2];

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

  // walkable: the circle (never the basin), the lane and its links, the terrace
  const nav = new Nav(NAV[0], NAV[1], NAV[2], NAV[3], 0.1);
  const terrace = [TERRACE[0], TERRACE[1], TERRACE[2] + 0.3, TERRACE_S - 0.25];
  nav.extra = (x, z) => {
    const r = Math.hypot(x - F[0], z - F[1]);
    if (r < BASIN + 0.3) return false;
    return (r < R - 0.3 && z < LANE_N + 0.3) || onLane(x, z) || inRect(x, z, terrace);
  };

  buildGround(root);
  yield;
  const water = fountain(root, F[0], F[1], BASIN);
  yield;
  const p = new Parts(),
    lights = lightSet();
  buildGreen(p);
  yield;
  buildLamps(lights, p, nav);
  buildBenches(p, nav);
  buildTerrace(root, nav);
  buildBikes(root, nav);
  buildLife(p);
  p.build(root);
  const lit = lights.build(root, { poolY: 0.028 }); // over the circle's stones
  yield;
  const hall = canteen(root, CANTEEN, building('canteen').floorH, DOOR_X);
  yield;
  const street = shopStreet(root, {
    a: SHOPS.a,
    dir: SHOPS.dir,
    depth: SHOPS.depth,
    u0: 10,
    u1: SHOPS.length,
    storeyH: building('shops_north').floorH,
    // the island's one combined konbini, 100-yen shop and drugstore, and the bakery (island-places)
    signs: [
      [5, 'コンビニ', 'KONBINI · 100 YEN · DRUGSTORE', '#3f5f6e'],
      [8, 'パン', 'BAKERY', '#5d5a72'],
    ],
  });
  yield;
  clinicCross(
    root,
    [...local(building('clinic').rect.slice(0, 2)), ...local(building('clinic').rect.slice(2))],
    building('clinic'),
  );
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['canteen', 'shops_north', 'arcade', 'shops_south'],
  });
  yield* mergeStaticSteps(root);

  // the points the place uses; the lane's ends are where the walks to the forecourt and the dorms start
  const arriveIn = lanePoint(0.4);
  return {
    root,
    scene,
    sun,
    nav,
    fountain: F,
    fountainEdge: [F[0], F[1] + BASIN + 0.6],
    westLane: lanePoint(WEST_X - 0.5), // walking out west: to here, then on to the edge
    westEdge: lanePoint(WEST_X - 2.6),
    // arriving from the forecourt: the crossfade shows him close up on the lane just south-west of the fountain,
    // so the first view on a phone (narrow and tall) has the whole fountain above him
    arriveEdge: lanePoint(-2.0),
    arriveIn,
    arriveFace: laneFace(),
    dormExit: lanePoint(EAST_X - 0.8),
    dormEdge: lanePoint(EAST_X + 2.2),
    westX: WEST_X,
    eastX: EAST_X,
    laneZ,
    laneHalf: HALF,
    camera: { elev: 46, fov: 24 },
    update(dt, t) {
      water.update(t);
    },
    evening() {
      lit.evening();
      hall.glass.emissiveIntensity = 0.45;
      water.evening();
      street.glass.emissiveIntensity = 0.55;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
