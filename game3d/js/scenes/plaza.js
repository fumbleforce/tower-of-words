// The fountain plaza, the second outdoor chunk of island-map-4, east of the head-office forecourt, placed and sized
// from the island layout (scenes/island-layout.js). The camera looks north and follows Eric. The plan (what is
// where) is plaza/plan.js: the round paved plaza (the map's, 23 across) with the fountain in the middle; the lane
// from head office meets it on the fountain's east-west axis and leaves it on the same axis toward the dorms; a
// planted ring with a ring of trees round the circle; north of it, on the fountain's north-south axis, the
// canteen's door, its terrace and a short link from the terrace to the circle. Built with the shared outdoor kit
// (scenes/outdoor/): the ground in plaza/ground.js, the planting and edges in plaza/green.js, lamps, benches, the
// notice board and the terrace in plaza/furniture.js, the fountain in plaza/fountain.js, the canteen and the shop
// street in plaza-buildings.js. Everything else comes from the layout through buildSkyline. Palette and light are the
// forecourt's; after work the lamps, the lights round the basin, the canteen, the shops and the town's windows light
// up.
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
import { buildLamps, buildBenches, buildNoticeBoard, buildTerrace, buildBikes, buildLife } from './plaza/furniture.js';
import { fountain } from './plaza/fountain.js';
import * as P from './plaza/plan.js';

const { F, R, BASIN, LZ, HALF, LINK, CANTEEN, SHOPS, DOOR_X, TERRACE, TERRACE_S, building, local, onLane, inRect } = P;
const CHUNK = 'plaza';

// the lane's centre z along the plaza, and a point on it
export const laneZ = () => LZ;
const lanePoint = (x) => [x, LZ];
const laneFace = () => Math.PI / 2; // east
const WEST_X = F[0] - R - 2.5, // on the lane west of the circle: walking on past it goes back to the forecourt
  EAST_X = F[0] + R + 2.5; // and on the lane east of it, on toward the dorms
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

  // walkable: the circle (never the basin), the lanes, the link, the terrace (through the gap in its wall)
  const nav = new Nav(NAV[0], NAV[1], NAV[2], NAV[3], 0.1);
  const terrace = [TERRACE[0], TERRACE[1], TERRACE[2] + 0.3, TERRACE_S - 0.25];
  const link = [LINK[0], LINK[1], TERRACE_S - 1, LINK[3]];
  nav.extra = (x, z) => {
    const r = Math.hypot(x - F[0], z - F[1]);
    if (r < BASIN + 0.3) return false;
    return r < R - 0.3 || onLane(x, z) || inRect(x, z, terrace) || inRect(x, z, link, 0.25);
  };

  buildGround(root);
  yield;
  const water = fountain(root, F[0], F[1], BASIN);
  yield;
  const p = new Parts(),
    lights = lightSet();
  buildGreen(p);
  yield;
  const uplit = buildLamps(lights, p, nav, root);
  buildBenches(p, nav);
  buildNoticeBoard(p, nav);
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
      uplit();
      hall.glass.emissiveIntensity = 0.45;
      water.evening();
      street.glass.emissiveIntensity = 0.55;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
