// The station forecourt, the first outdoor chunk of island-map-4. The camera looks north, as in the station
// security room: Honsha station is the two-storey block at the bottom left (scenes/station-exterior.js; its upper
// part fades while Eric stands just outside its north door), the platform shed runs north-north-east past its west
// side, and the head office stands east of the court (scenes/head-office.js). The court is the open paving between
// them, with the bike racks east of the station, as the island layout has it; the lane to the fountain plaza leaves
// east-south-east along the tower's south face. The town beyond comes from the layout (scenes/skyline.js). No cars.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { rbox, bench, mat } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, bikeRow, streetLamp, tree } from './forecourt/details.js';
import { outdoorLight, groundPatches, farTrees, paving, TOWN } from './town.js';
import { headOfficeSteps } from './head-office.js';
import { at, inT, T } from './head-office/frame.js';
import { buildStation, STATION, DOOR_X } from './station-exterior.js';
import { skylineSteps } from './skyline.js';
import { mergeStaticSteps } from './merge-static.js';
import { drain } from '../perf/slice.js';
import * as LAYOUT from './island-layout.js';

const { zN: STATION_Z, x1: STATION_E } = STATION,
  COURT_N = -3.6, // the court's north edge: a row of trees beyond it
  EAST_X = 12.8, // how far east Eric walks in the bike court
  COURT_E = 13.6, // the court's paving: its east edge runs under the tower's plinth and the lane
  WALK = [-4.9, 23.4, COURT_N, 10.6]; // where Eric can walk: the court, the lane's start, the head office lobby
// the lane to the plaza: along the tower's south face, `n` metres out from it (n is negative outside the tower)
const LANE_N = -3.6,
  LANE_W = 2.8;
const lane = (u) => at(u, LANE_N).map((v) => Math.round(v * 100) / 100);
const STONE = { color: '#8e8a86', seam: '#7f7b77' },
  WORN = { color: '#98948f', seam: '#8a8681', y: 0.004 };

function court(root, nav) {
  // the stone court: a strip along the station's north side to the tower, and the part east of the station
  root.add(paving(WALK[0], COURT_E, COURT_N, STATION_Z, 0.9, STONE));
  root.add(paving(STATION_E, COURT_E, STATION_Z, WALK[3] + 0.3, 0.9, STONE));
  // the worn line people walk, door to door
  root.add(paving(DOOR_X - 0.7, DOOR_X + 0.7, 1.3, STATION_Z, 0.75, WORN));
  root.add(paving(DOOR_X - 0.7, EAST_X - 0.2, 1.3, 2.1, 0.75, WORN));
  // bikes: two long rows east of the station, a short one by its north-west corner
  // (rows run north-south, so the camera sees the bikes side on)
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
  west.position.set(-4.0, 0, -1.6);
  root.add(west);
  nav.block(-4.9, -3.4, -1.9, 0.2);
  // planted beds: two with trees along the north edge, low shrubs along the east court's south edge
  for (const [x, z, len, trees] of [
    [1.0, -2.75, 4.2, [-1.0, 1.1]],
    [8.2, -2.75, 3.6, [-0.9, 0.9]],
    [9.3, 10.25, 6.2, []],
  ]) {
    const bed = planter(len);
    bed.position.set(x, 0, z);
    root.add(bed);
    nav.block(x - len / 2 - 0.05, x + len / 2 + 0.05, z - 0.37, z + 0.37);
    trees.forEach((dx, i) => {
      const t = tree(i + Math.round(x), 1.05 - i * 0.08);
      t.position.set(x + dx, 0.2, z);
      root.add(t);
    });
  }
  // the benches: against the station's north wall facing the court, and on its east side facing the bikes
  for (const [x, z, turn, w, bx, bz] of [
    [-3.8, STATION_Z - 0.35, Math.PI, 1.4, 0.75, 0.33],
    [STATION_E + 0.4, 6.9, Math.PI / 2, 1.8, 0.33, 0.95],
  ]) {
    const seat = bench(w, { seats: w > 1.5 ? 3 : 2 });
    seat.rotation.y = turn;
    seat.position.set(x, 0, z);
    root.add(seat);
    nav.block(x - bx, x + bx, z - bz, z + bz);
  }
  // tall lamps along the walk and in the bike court, each with its pool
  for (const [x, z] of [
    [3.6, 0.35],
    [10.4, 0.45],
    [STATION_E + 0.5, 3.4],
    at(3.4, LANE_N - 2.6), // at the court's corner, where the lane's kerb and hedge begin
  ]) {
    const lamp = streetLamp();
    lamp.position.set(x, 0, z);
    root.add(lamp);
    nav.block(x - 0.12, x + 0.12, z - 0.12, z + 0.12);
    root.add(lightPool(x + 0.3, z, 0.8, { k: 0.2 }));
  }
}

// the lane east-south-east along the tower's south face, with a hedge and trees on its south side
function laneAndVerge(root, nav) {
  const g = new THREE.Group();
  const [cx, cz] = at(6.6, LANE_N);
  g.position.set(cx, 0, cz);
  g.rotation.y = -T.a;
  root.add(g);
  // in the group, x runs along the tower's south face (u - 6.6) and z out from it (LANE_N - n)
  // from the bike court's corner (u 2, clear of its east bike row) to past the chunk's east edge; it meets the
  // tower's plinth along its north edge and the court at its west end, which has the plinth's dark stone band
  const L = 12.6,
    X = 1.7;
  g.add(
    rbox(L, 0.02, LANE_W, '#98948f', {
      x: X,
      y: -0.012,
      r: 0.005,
      seg: 1,
      cast: false,
    }),
  );
  const seams = [
    [L, 0.004, 0.03, X, 0.008, -LANE_W / 2 + 0.05],
    [L, 0.004, 0.03, X, 0.008, LANE_W / 2 - 0.05],
    [L, 0.004, 0.02, X, 0.008, 0],
  ];
  for (let x = X - L / 2 + 0.9; x < X + L / 2; x += 0.9) seams.push([0.02, 0.004, LANE_W, x, 0.008, 0]);
  g.add(boxes(seams, '#8a8681'));
  g.add(boxes([[L, 0.1, 0.14, X, -0.02, LANE_W / 2 + 0.07]], '#7b7f86')); // the kerb
  g.add(boxes([[0.28, 0.005, LANE_W, X - L / 2 + 0.14, 0.008, 0]], '#5b616b')); // the band at its west end
  // the hedge starts where the court's east edge meets the kerb
  const hedge = planter(10.4);
  hedge.position.set(2.2, 0, LANE_W / 2 + 0.55);
  g.add(hedge);
  // a low bed on the line between the tower's plinth and the lane, east of the door (shrubs only: Eric walks
  // behind it)
  const bed = planter(6.2);
  bed.position.set(2.8, 0, -LANE_W / 2);
  g.add(bed);
  // south of the hedge the verge (the layout's lane_verge) is not walked
  const before = nav.extra;
  nav.extra = (x, z) => {
    if (before && !before(x, z)) return false;
    const [u, n] = inT(x, z);
    if (u > 5.8 && u < 12.8 && n < LANE_N + LANE_W / 2 + 0.7 && n > LANE_N + LANE_W / 2 - 0.5) return false; // the bed
    return !(x > EAST_X && n < LANE_N - LANE_W / 2 - 0.25);
  };
}

// a lawn in the tower's frame, u0..u1 along its south face and n0..n1 out from it, under the court and the paving
function turnedLawn(u0, u1, n0, n1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, 0.01, n1 - n0), mat(TOWN.grass, { roughness: 0.9 }));
  const [x, z] = at((u0 + u1) / 2, (n0 + n1) / 2);
  m.position.set(x, -0.03, z);
  m.rotation.y = -T.a;
  m.receiveShadow = true;
  return m;
}

// beyond the court: a row of trees on grass, a path along the north with benches and a way up to the tower's wing,
// lawns under and beside the platform shed, paving round the tower; the layout's buildings further out (skyline)
function* town(root, nav) {
  const G = TOWN.grass;
  groundPatches(root, [
    [-3.8, 13, -5.3, COURT_N, G], // the tree row
    [-3.2, 12.6, -16, -7.3, G], // the lawn toward the wing
    [-12, WALK[0], -12, STATION_Z + 0.2, G], // under the platform shed
    [-14, STATION.x0, STATION_Z, 16, G], // west of the station, round the walkway
    [STATION_E, 16, WALK[3] + 0.3, 14, G], // south of the bike court
  ]);
  root.add(paving(-3.8, 15.2, -7.3, -5.3, 0.9, STONE)); // the path along the north, up to the tower's plinth
  root.add(paving(6.2, 7.6, -15.6, -7.3, 0.9, STONE)); // up to the wing's door
  // round the tower's plinth and south of the lane's hedge: lawn, turned with the tower
  root.add(turnedLawn(-6, T.W + 6, -2.2, T.D + 6), turnedLawn(1.8, T.W + 6, LANE_N - 12, LANE_N - LANE_W / 2));
  for (const x of [1.6, 10.8]) {
    const seat = bench(1.4, { seats: 2 });
    seat.position.set(x, 0, -7.0);
    root.add(seat);
  }
  const trees = [
    [-2.6, -4.5, 1.0],
    [0.9, -4.4, 1.15],
    [4.4, -4.5, 0.95],
    [7.9, -4.4, 1.1],
    [11.4, -4.5, 1.0],
    [-1.2, -9.4, 1.2],
    [2.4, -11.8, 1.0],
    [4.6, -9.0, 0.9],
    [9.8, -10.6, 1.15],
    [11.8, -13.6, 0.95],
    [0.6, -14.4, 1.05],
    [-8.6, 6.5, 1.0],
    [-9.4, 9.6, 1.15],
    [7.2, 12.6, 1.0],
    [10.6, 12.4, 1.1],
    [14.6, 11.8, 0.95],
  ];
  // on the verge south of the lane, far enough back that they never hide Eric on it
  for (let u = 5.2; u < 18; u += 3.1) trees.push([...at(u, LANE_N - 3.4), 0.95 + (u % 2) * 0.15]);
  farTrees(root, trees);
  // east of the tower, the trees and beds between it and the plaza (the layout's tower_trees)
  const east = [];
  for (let i = 0; i < 9; i++) {
    const [x, z] = LAYOUT.toLocal('forecourt', 14 + (i % 3) * 4.4 + (i % 2) * 1.2, -3 + Math.floor(i / 3) * 2.8);
    east.push([x, z, 0.95 + (i % 3) * 0.1]);
  }
  farTrees(root, east);
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
  nav.block(WALK[0], STATION_E + 0.15, STATION_Z - 0.05, WALK[3]); // the station
  // everything that never moves goes in one group, merged by material at the end
  const statics = new THREE.Group();
  root.add(statics);
  const station = buildStation(statics);
  yield;
  court(statics, nav);
  yield;
  laneAndVerge(statics, nav);
  const sky = yield* town(statics, nav);
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
    plazaLane: lane(10.4),
    plazaIn: lane(9.5), // where he stops coming back, clear of the lane's trigger
    plazaEdge: lane(12.2),
    laneFacing: Math.atan2(-T.U[0], -T.U[1]), // walking in from the plaza: west-north-west along the lane
    laneAt: (x, z) => {
      const [u, n] = inT(x, z);
      return { u, off: n - LANE_N };
    },
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
    update(t, dt) {
      const elapsed = dt ?? (previousTime == null ? 1 / 60 : t - previousTime);
      previousTime = t;
      lift.update(Math.min(0.1, Math.max(0, elapsed)));
    },
  };
}
