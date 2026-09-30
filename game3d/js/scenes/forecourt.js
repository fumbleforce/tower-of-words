// The station forecourt, the first outdoor chunk of island-map-4. The camera looks north, as in the station
// security room. Everything stands on the town's grid (scenes/island-layout.js), square to the camera: Honsha station
// is the two-storey block at the bottom left (scenes/station-exterior.js; its upper part fades while Eric stands just
// outside its north door), the platform shed runs north-south past its west side, and the head office tower stands
// north-east of it across the court (scenes/head-office.js), its lobby door in the south face. The court is one
// paved rectangle from the station's west face to the lobby's east wall, between the station's north face and the
// tower's south face, with the bike court south of it east of the station; kerbs where paving meets grass. The lane
// to the fountain plaza leaves the court's north-east corner and runs east along the tower's south face. The town
// beyond comes from the layout (scenes/skyline.js). No cars.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { bench } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, bikeRow, streetLamp, tree } from './forecourt/details.js';
import { outdoorLight, groundPatches, farTrees, pavingRects, TOWN } from './town.js';
import { headOfficeSteps } from './head-office.js';
import { at, T, DOOR_U, LU } from './head-office/frame.js';
import { buildStation, STATION, DOOR_X } from './station-exterior.js';
import { skylineSteps } from './skyline.js';
import { mergeStaticSteps } from './merge-static.js';
import { drain } from '../perf/slice.js';
import * as LAYOUT from './island-layout.js';

const { zN: STATION_Z, x0: STATION_W, x1: STATION_E } = STATION;
// the court: from the station's west face to the lobby's east wall, the tower's south face to the station's north face
const HO_X = at(DOOR_U, 0)[0], // the head office door
  COURT = [STATION_W, at(LU, 0)[0], T.o[1], STATION_Z], // x0, x1, z0, z1
  BIKES = [STATION_E, HO_X + 1.95, STATION_Z, 10.6], // the bike court, east of the station
  // the lane: along the tower's south face from the court's north-east corner, 3 wide, on east past the frame
  LANE = [COURT[1], 36, T.o[1], T.o[1] + 3],
  LANE_Z = (LANE[2] + LANE[3]) / 2,
  WALK = [STATION_W + 0.2, LANE[1] - 1, T.o[1] - 6.4, BIKES[3]]; // the nav grid: court, bikes, lane, lobby
const STONE = { color: '#8e8a86', seam: '#7f7b77' },
  WORN = '#938f8a',
  KERB = '#7b7f86';
const lanePt = (x) => [x, LANE_Z];
const inRect = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;

// kerbs on the grass side of an edge: along x (at z, the grass toward `side` = +1 south or -1 north) or along z
const kerbX = (x0, x1, z, side) => [x1 - x0, 0.1, 0.14, (x0 + x1) / 2, -0.02, z + side * 0.07];
const kerbZ = (z0, z1, x, side) => [0.14, 0.1, z1 - z0, x + side * 0.07, -0.02, (z0 + z1) / 2];

function court(root, nav) {
  // one paved court, the bike court and the lane, each a rectangle on the grid, the same stone
  // (with the service lane north of the court: one tile grid, one floor)
  root.add(pavingRects([COURT, BIKES, LANE, [5.95, T.o[0], -16, COURT[2]]], 0.9, STONE));
  // the line people wear, door to door: north from the station door, east along the court, north to the lobby door
  // (flat, over the court's seams: worn smooth; one mesh)
  const worn = (x0, x1, z0, z1) => [x1 - x0, 0.005, z1 - z0, (x0 + x1) / 2, 0.001, (z0 + z1) / 2];
  const line = [worn(DOOR_X - 0.7, DOOR_X + 0.7, 0.9, STATION_Z), worn(DOOR_X - 0.7, HO_X + 0.7, -0.5, 0.9)];
  root.add(boxes([...line, worn(HO_X - 0.7, HO_X + 0.7, COURT[2], -0.5)], WORN));
  // kerbs wherever the paving meets grass
  root.add(
    boxes(
      [
        kerbZ(COURT[2], COURT[3], COURT[0], -1), // the court's west edge, in line with the station's west face
        kerbX(COURT[0], 5.95, COURT[2], -1), // its north edge west of the tower, open for the service lane
        kerbX(BIKES[1], COURT[1], COURT[3], 1), // its south edge east of the bike court
        kerbZ(LANE[3], COURT[3], COURT[1], 1), // its east edge, south of the lane
        kerbZ(BIKES[2], BIKES[3], BIKES[1], 1), // the bike court's east edge
        kerbX(BIKES[0], BIKES[1], BIKES[3], 1), // and its south edge
        kerbX(LANE[0], LANE[1], LANE[3], 1), // the lane's south edge
        kerbX(T.o[0] + T.W, LANE[1], LANE[2], -1), // its north edge past the tower
      ],
      KERB,
    ),
  );
  // bikes: two long rows in the bike court, a short one by the station's north-west corner (rows run north-south,
  // so the camera sees the bikes side on)
  for (const [x, z, turn, gaps, seed] of [
    [7.6, 3.8, -Math.PI / 2, [3, 7], 0],
    [10.9, 8.75, Math.PI / 2, [1, 5, 8], 3],
  ]) {
    const row = bikeRow(10, { gaps, seed });
    row.rotation.y = turn;
    row.position.set(x, 0, z);
    root.add(row);
    nav.block(x - 0.5, x + 0.5, 3.55, 9.0);
  }
  const west = bikeRow(4, { gaps: [2], seed: 1 });
  west.rotation.y = -Math.PI / 2;
  west.position.set(COURT[0] + 1.4, 0, -1.6);
  root.add(west);
  nav.block(COURT[0], COURT[0] + 2.3, -1.9, 0.2);
  // the benches: against the station's north wall facing the court, on its east side facing the bikes, and two
  // along the court's north edge in front of the tree beds, facing the station
  for (const [x, z, turn, w, bx, bz] of [
    [-3.8, STATION_Z - 0.35, Math.PI, 1.4, 0.75, 0.33],
    [STATION_E + 0.4, 6.9, Math.PI / 2, 1.8, 0.33, 0.95],
    [-4.2, COURT[2] + 0.38, 0, 1.4, 0.75, 0.33],
    [-0.4, COURT[2] + 0.38, 0, 1.4, 0.75, 0.33],
  ]) {
    const seat = bench(w, { seats: w > 1.5 ? 3 : 2 });
    seat.rotation.y = turn;
    seat.position.set(x, 0, z);
    root.add(seat);
    nav.block(x - bx, x + bx, z - bz, z + bz);
  }
  for (const x of [-0.9, 5.4]) nav.block(x - 0.95, x + 0.95, -1.95, -1.25); // the low beds (planting)
  // tall lamps: two along the court's middle, one in the bike court, two in the lane's hedge, each with its pool
  for (const [x, z] of [
    [2.2, -1.6],
    [8.6, -1.6],
    [STATION_E + 0.5, 3.4],
    [24.6, LANE[3] + 0.6],
    [30.6, LANE[3] + 0.6],
  ]) {
    const lamp = streetLamp();
    lamp.position.set(x, 0, z);
    root.add(lamp);
    nav.block(x - 0.12, x + 0.12, z - 0.12, z + 0.12);
    root.add(lightPool(x + 0.3, z, 0.8, { k: 0.2 }));
  }
}

// planting on the grid: beds with trees along the court's north edge up to the service lane; a
// hedge along the lane's south kerb, broken for the lamps; beds at the court's south-east corner
function planting(root) {
  const beds = [
    // [x middle, z middle, length, tree offsets]
    [(COURT[0] + 5.6) / 2, COURT[2] - 0.55, 5.6 - COURT[0] - 0.2, [-4.8, -2.4, 0, 2.4]],
    [21.75, LANE[3] + 0.6, 4.9, []],
    [27.6, LANE[3] + 0.6, 5.4, []],
    [33.4, LANE[3] + 0.6, 4.6, []],
    [(BIKES[1] + COURT[1]) / 2, COURT[3] + 0.6, COURT[1] - BIKES[1] - 0.4, [0]],
    // low beds in the court, between the lamps on its middle line (shrubs only: Eric walks behind them)
    [-0.9, -1.6, 1.8, []],
    [5.4, -1.6, 1.8, []],
  ];
  for (const [x, z, len, trees] of beds) {
    const bed = planter(len);
    bed.position.set(x, 0, z);
    root.add(bed);
    trees.forEach((dx, i) => {
      const t = tree(i + Math.abs(Math.round(x)), 1.05 - i * 0.06);
      t.position.set(x + dx, 0.2, z);
      root.add(t);
    });
  }
}

// beyond the court: lawns on the grid round the paving, the service lane between the wing and the tower,
// trees, and the layout's buildings further out (skyline)
function* town(root) {
  const G = TOWN.grass;
  groundPatches(root, [
    [-14, COURT[0], -16, 16, G], // west of the court and the station, under the platform shed
    [COURT[0], T.o[0], -16, COURT[2], G], // north of the court, round the wing
    [T.o[0] + T.W, 40, -16, LANE[2], G], // east of the tower, north of the lane
    [COURT[1], 40, LANE[3], 16, G], // south of the lane
    [STATION_E, COURT[1], BIKES[3], 16, G], // south of the bike court
    [BIKES[1], COURT[1], COURT[3], BIKES[3], G], // east of the bike court
    [STATION.x0, STATION_E, STATION.zS, 16, G], // south of the station, round the walkway
  ]);
  const trees = [
    [-9.2, -8.8, 1.1],
    [-8.4, -12.6, 1.0],
    [-4.6, -14.6, 1.15],
    [-9.4, 6.5, 1.0],
    [-9.8, 9.6, 1.15],
    [7.4, 12.6, 1.0],
    [10.6, 13.4, 1.1],
    [14.6, 12.2, 0.95],
  ];
  // south of the lane, far enough back that they never hide Eric on it (a tree 2.3 high stands 2.4 from the kerb)
  for (let x = 20.5; x < 38; x += 3.2) trees.push([x, LANE[3] + 2.7 + ((x * 7) % 3) * 0.8, 0.95 + (x % 2) * 0.15]);
  // east of the tower, the trees between it and the plaza (the layout's tower_trees), in rows on the grid
  for (let i = 0; i < 8; i++) trees.push([27.2 + (i % 4) * 3, -5.4 - Math.floor(i / 4) * 3.2, 0.95 + (i % 3) * 0.1]);
  farTrees(root, trees);
  return yield* skylineSteps(root, 'forecourt', {
    layout: LAYOUT,
    skip: ['head_office', 'station', 'platform_shed'],
  });
}

// buildForecourt() builds it at once; forecourtSteps() yields between parts, for building in slices (js/perf/slice.js)
export const buildForecourt = () => drain(forecourtSteps());
export function* forecourtSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#5d636c');
  scene.add(root);
  const sun = outdoorLight(scene);

  const nav = new Nav(...WALK, 0.1);
  // walkable: the court, the bike court and the lane; inside the tower the head office decides (its lobby)
  const tower = [T.o[0], T.o[0] + T.W, T.o[1] - T.D, T.o[1]];
  nav.extra = (x, z) => inRect(x, z, COURT) || inRect(x, z, BIKES) || inRect(x, z, LANE) || inRect(x, z, tower);
  // everything that never moves goes in one group, merged by material at the end
  const statics = new THREE.Group();
  root.add(statics);
  const station = buildStation(statics);
  yield;
  court(statics, nav);
  planting(statics);
  yield;
  const sky = yield* town(statics);
  yield* mergeStaticSteps(statics);
  const ho = yield* headOfficeSteps(root, nav);
  const lift = ho.landing;
  let previousTime = null;
  return {
    root,
    scene,
    sun,
    nav,
    stationExit: [DOOR_X, STATION_Z + 0.35],
    start: [DOOR_X, STATION_Z - 1.5], // clear of the exit canopy, so a camera from the side sees him
    officeEntrance: ho.entrance,
    liftOut: [...ho.liftSite.out],
    // the lane on to the fountain plaza, along the tower's south face; Eric leaves and comes back along it
    plazaLane: lanePt(29.4),
    plazaIn: lanePt(28.4), // where he stops coming back, clear of the lane's trigger
    plazaEdge: lanePt(32.6),
    laneFacing: -Math.PI / 2, // walking in from the plaza: west along the lane
    laneAt: (x, z) => ({ u: x, off: z - LANE_Z }),
    liftSite: {
      ...ho.liftSite,
      hole: [...ho.liftSite.hole],
      out: [...ho.liftSite.out],
    },
    liftLanding: { leaves: lift.leaves, k: () => lift.k },
    lift,
    headOffice: ho,
    station,
    sky,
    kuro: ho.kuro,
    setLiftOpen(k) {
      lift.want = THREE.MathUtils.clamp(k, 0, 1);
    },
    camera: { elev: 46, fov: 24 },
    doorX: DOOR_X,
    hoDoor: [HO_X, T.o[1]],
    update(t, dt) {
      const elapsed = dt ?? (previousTime == null ? 1 / 60 : t - previousTime);
      previousTime = t;
      lift.update(Math.min(0.1, Math.max(0, elapsed)));
    },
  };
}
