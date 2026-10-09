// The station forecourt, the first outdoor chunk of island-map-4. The camera looks north, as in the station
// security room. Everything stands on the town's grid (scenes/island-layout.js), square to the camera: Honsha station
// is the two-storey block at the bottom left (scenes/station-exterior.js; its upper part fades while Eric stands just
// outside its north door), the platform shed runs north-south past its west side, and the head office tower stands
// north-east of it across the court (scenes/head-office.js), its lobby door in the south face. The plan (which zone
// is where) is forecourt/plan.js; the court with its walk, beds, bike court and garden is forecourt/court.js, the
// lane on to the fountain plaza forecourt/lane.js, what lies beyond the court's north bed (the head office
// wing, the street up the platform shed, the cross street behind the tower) forecourt/north.js, and the coast west
// of the shed outdoor/coast.js, all built with the shared outdoor kit (scenes/outdoor/); on the island map only, the
// west end of the shop street and the seafront (outdoor/seafront.js). The town beyond comes from the layout
// (scenes/skyline.js). No cars.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { applyGround } from '../movement/walk-ground.js';
import { ground, WALK_AREA, DOORWAY } from './forecourt/ground.js';
import { groundPatches, farTrees, TOWN } from './town.js';
import { lightRig } from '../kit/light/rig.js';
import { OUTDOOR } from '../kit/light/looks.js';
import { headOfficeSteps } from './head-office.js';
import { T } from './head-office/frame.js';
import { buildStation } from './station-exterior.js';
import { skylineSteps } from './skyline.js';
import { mergeStaticSteps } from './merge-static.js';
import { drain } from '../perf/slice.js';
import * as LAYOUT from './island-layout.js';
import { southLinkFrame, buildSouthLink } from './forecourt/south-link.js';
import { buildCourt } from './forecourt/court.js';
import { buildLane } from './forecourt/lane.js';
import { northSteps } from './forecourt/north.js';
import { coastSteps } from './outdoor/coast.js';
import { coastLand } from './island-west.js';
import { MAP_LAYER } from '../map/render.js';
import { seafrontSteps, mapOnly } from './outdoor/seafront.js';
import { shopStreet } from './plaza-buildings.js';
import { BAYS, SHOPS } from './island-south.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { keyaki, sakura, cluster } from './outdoor/planting.js';
import * as PL from './forecourt/plan.js';
import { buildNooks } from './outdoor/nooks.js';
import { streetPlanting } from './diorama/planting.js';
import { dressStreet, finishWindows, finishOffice } from './diorama/index.js';

const { STATION, DOOR_X, X0, SE, ZN, HZ, HO_X, COURT, BIKES, GARDEN, LANE, LANE_Z, STRIP_S, STRIP_N, SERVICE, TE } = PL;
const lanePt = (x) => [x, LANE_Z];

// beyond the court: lawns round the paving, a few trees near it in small groups (the lane's gardens are in
// lane.js, the north edge's avenues and grove in north.js), and the layout's buildings further out (skyline)
function* town(root, planting) {
  const G = TOWN.grass;
  groundPatches(root, [
    [-14, X0, -30, 16, G], // west of the court and the station, under the platform shed
    [X0, SERVICE[0], -30, HZ, G], // north of the court, round the wing
    [SERVICE[0], TE, -30, SERVICE[2], G], // north of the service way and the tower
    [TE, 60, -30, STRIP_N[2], G], // east of the tower, north of the lane
    [LANE[0], 60, STRIP_S[3], 16, G], // south of the lane
    [SE, GARDEN[1], BIKES[3], 16, G], // south of the bike court and the garden
    [GARDEN[0], GARDEN[1], ZN, BIKES[3], G], // the garden east of the bike court, behind its low wall
    [STATION.x0, SE, STATION.zS, 16, G], // south of the station, round the walkway
    [COURT[1], 60, LANE[3], STRIP_S[3], G], // under the lane's south strip
  ]);
  const p = new Parts({ planting });
  sakura(p, -9.6, 7.5, 1.0, 5);
  keyaki(p, 7.6, 12.6, 1.1, 6);
  sakura(p, 11.8, 13.2, 1.0, 7);
  cluster(p, 12.2, 12.4, { n: 4, r: 0.35, seed: 6 });
  p.build(root);
  farTrees(root, [
    [-9.8, 10.6, 1.15],
    [14.6, 13.4, 0.95],
  ]);
  // west of the platform shed: the coast path, the pines and the sea wall (scenes/island-west.js); the court's
  // cameras never see that far, so they're drawn on the island map only
  const at = (x, z) => LAYOUT.toLocal('forecourt', x, z);
  yield* coastSteps(root, { at, layer: MAP_LAYER });
  // the shop street's west end and the seafront south of it, which the map tile reaches (the plaza builds the rest)
  const rows = LAYOUT.BUILDINGS.find((b) => b.id === 'shops_north');
  const shops = shopStreet(root, {
    a: at(rows.rect[0], rows.rect[1]),
    dir: [1, 0],
    depth: rows.rect[3] - rows.rect[1],
    storeyH: rows.floorH,
    bays: { ...BAYS, u0: BAYS.x0 - rows.rect[0] },
    to: 27,
    shops: SHOPS,
  });
  // The western shopfronts are now the visible destination of the south path.
  mapOnly(shops.group, null, 'shops');
  const front = yield* seafrontSteps(root, { at, backWalk: true });
  const sky = yield* skylineSteps(root, 'forecourt', {
    layout: LAYOUT,
    // built here (the shop rows on the map only)
    skip: [
      'head_office',
      'station',
      'platform_shed',
      'head_office_wing',
      'office_e1',
      'shops_north',
      'arcade',
      'shops_south',
    ],
    land: coastLand(LAYOUT.COAST.line),
    landColor: G,
  });
  return { sky, front };
}

// buildForecourt() builds it at once; forecourtSteps() yields between parts, for building in slices (js/perf/slice.js)
export const buildForecourt = () => drain(forecourtSteps());
export function* forecourtSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#5d636c');
  scene.add(root);
  // the light for every period comes from the period table (kit/light/): the rig, and what glows at night below
  const light = lightRig(scene, { looks: OUTDOOR }),
    sun = light.sun;

  // walkable ground, one list for the walk grid and the kerbs (forecourt/ground.js): the court, the bike court, the
  // lane and its bench bays, the garden's gravel way and court, and the shed street up to where the campus trip
  // starts; inside the tower the head office decides (its lobby)
  const nav = new Nav(...WALK_AREA, 0.1),
    walkable = ground();
  applyGround(nav, walkable);
  // the station's doorway, shut to him by a tagged block from a step in (he still reaches its zone): only day 2's
  // walk back in to the platform goes through it (places/forecourt.js opens it for that walk, so he waits for the
  // gate room on floor)
  const southLink = southLinkFrame('forecourt');
  nav.blockTagged('station_door', DOORWAY[0], DOORWAY[1], ZN + 0.2, DOORWAY[3]);
  // everything that never moves goes in one group, merged by material at the end; the trees and hedges are the street
  // style's (scenes/diorama/planting.js), which the shared builders hand each plant to
  const planting = streetPlanting();
  const statics = new THREE.Group();
  statics.userData.dioramaPlanting = planting.records;
  root.add(statics);
  const station = buildStation(statics);
  yield;
  const lamps = lightSet(); // every lamp's lantern and pool, one mesh each
  buildCourt(statics, nav, lamps, planting, walkable);
  buildSouthLink(statics, { kerbs: false });
  yield;
  buildLane(statics, nav, lamps, planting);
  const north = yield* northSteps(statics, lamps, { closed: false, planting });
  const nookParts = new Parts({ planting });
  const nooks = buildNooks(PL.NOOKS, statics, { lights: lamps, p: nookParts });
  nookParts.build(statics); // outdoor/nooks.js: props round each, its spot named
  for (const r of nooks.blocks) nav.block(...r);
  const lights = lamps.build(statics);
  yield;
  const { sky, front } = yield* town(statics, planting);
  // the street style: its materials, the station's softened walls, the paving detail, leaves and meadow, its daylight
  const streetEnvironment = dressStreet(statics, scene, sun, station, nav);
  light.takeLook('day');
  yield* mergeStaticSteps(statics);
  const ho = yield* headOfficeSteps(root, nav);
  finishOffice(root);
  finishWindows(root, streetEnvironment);
  const lift = ho.landing;
  // after work the lamps, the lit windows and the station and tower glass glow
  light.glow.add(lights.glows, front.glows, nooks.glows, ho.glows, station.glows, sky.glows);
  if (north.lit) light.glow.add({ show: north.lit });
  let previousTime = null;
  return {
    root,
    scene,
    sun,
    light,
    nav,
    southLink,
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
    nooks: nooks.spots,
    doorX: DOOR_X,
    hoDoor: [HO_X, T.o[1]],
    update(t, dt) {
      statics.userData.dioramaDetail();
      const elapsed = dt ?? (previousTime == null ? 1 / 60 : t - previousTime);
      previousTime = t;
      lift.update(Math.min(0.1, Math.max(0, elapsed)));
    },
  };
}
