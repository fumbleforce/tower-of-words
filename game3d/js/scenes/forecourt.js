// The station forecourt, the first outdoor chunk of island-map-4. The camera looks north, as in the station
// security room. Everything stands on the town's grid (scenes/island-layout.js), square to the camera: Honsha station
// is the two-storey block at the bottom left (scenes/station-exterior.js; its upper part fades while Eric stands just
// outside its north door), the platform shed runs north-south past its west side, and the head office tower stands
// north-east of it across the court (scenes/head-office.js), its lobby door in the south face. The plan (which zone
// is where) is forecourt/plan.js; the court with its walk, beds, bike court and garden is forecourt/court.js, the
// lane on to the fountain plaza forecourt/lane.js, both built with the shared outdoor kit (scenes/outdoor/). The
// town beyond comes from the layout (scenes/skyline.js). No cars.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, groundPatches, farTrees, TOWN } from './town.js';
import { headOfficeSteps } from './head-office.js';
import { T } from './head-office/frame.js';
import { buildStation } from './station-exterior.js';
import { skylineSteps } from './skyline.js';
import { mergeStaticSteps } from './merge-static.js';
import { drain } from '../perf/slice.js';
import * as LAYOUT from './island-layout.js';
import { buildCourt } from './forecourt/court.js';
import { buildLane } from './forecourt/lane.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { keyaki, sakura, cluster } from './outdoor/planting.js';
import * as PL from './forecourt/plan.js';

const { STATION, DOOR_X, X0, SE, ZN, HZ, HO_X, COURT, BIKES, GARDEN, LANE, LANE_Z, STRIP_S, STRIP_N, SERVICE, TE } = PL;
// the nav grid: court, bikes, lane (up to where the plaza trip starts), lobby
const WALK = [X0 + 0.2, PL.LANE_WALK, HZ - 6.4, BIKES[3]];
const lanePt = (x) => [x, LANE_Z];

// beyond the court: lawns round the paving, a few trees near it in small groups (the lane's groves are in
// lane.js), and the layout's buildings further out (skyline)
function* town(root) {
  const G = TOWN.grass;
  groundPatches(root, [
    [-14, X0, -16, 16, G], // west of the court and the station, under the platform shed
    [X0, SERVICE[0], -16, HZ, G], // north of the court, round the wing
    [TE, 60, -16, STRIP_N[2], G], // east of the tower, north of the lane
    [LANE[0], 60, STRIP_S[3], 16, G], // south of the lane
    [SE, GARDEN[1], BIKES[3], 16, G], // south of the bike court and the garden
    [STATION.x0, SE, STATION.zS, 16, G], // south of the station, round the walkway
    [COURT[1], 60, LANE[3], STRIP_S[3], G], // under the lane's south strip
  ]);
  const p = new Parts();
  keyaki(p, -9.2, -8.8, 1.1, 5);
  sakura(p, -8.2, -12.2, 1.05, 2);
  keyaki(p, -4.6, -14.2, 1.15, 8);
  cluster(p, -8.6, -10.4, { n: 4, r: 0.35, seed: 3 });
  sakura(p, -9.6, 7.5, 1.0, 5);
  keyaki(p, 8.4, 12.6, 1.1, 6);
  sakura(p, 11.8, 13.2, 1.0, 7);
  cluster(p, 10.2, 12.4, { n: 4, r: 0.35, seed: 6 });
  p.build(root);
  farTrees(root, [
    [-9.8, 10.6, 1.15],
    [14.6, 13.4, 0.95],
    [-12.6, -4.2, 1.0],
  ]);
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
  const inRect = PL.inRect;
  nav.extra = (x, z) => inRect(x, z, COURT) || inRect(x, z, BIKES) || inRect(x, z, LANE) || inRect(x, z, tower);
  // everything that never moves goes in one group, merged by material at the end
  const statics = new THREE.Group();
  root.add(statics);
  const station = buildStation(statics);
  yield;
  const lamps = lightSet(); // every lamp's lantern and pool, one mesh each
  buildCourt(statics, nav, lamps);
  yield;
  buildLane(statics, nav, lamps);
  const lights = lamps.build(statics);
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
    stationExit: [DOOR_X, ZN + 0.35],
    start: [DOOR_X, ZN - 1.5], // clear of the exit canopy, so a camera from the side sees him
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
    // after work the lamps come on
    lightsOn() {
      lights.evening();
    },
    update(t, dt) {
      const elapsed = dt ?? (previousTime == null ? 1 / 60 : t - previousTime);
      previousTime = t;
      lift.update(Math.min(0.1, Math.max(0, elapsed)));
    },
  };
}
