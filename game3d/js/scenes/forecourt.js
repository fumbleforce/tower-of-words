// The station forecourt, the first outdoor chunk of island-map-4. The camera looks north, as in the station
// security room: its exit is at the bottom left (the station's north wall, cut low like every near wall), and the
// head office stands east of the station, where the island layout puts it (scenes/head-office.js). The blue
// platform roof runs along the west edge. Palette and light are the security room's; the town around comes from
// the island layout (scenes/skyline.js).
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, mat, rbox, wall, bench, lampPost } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, bicycle, openDoor, tree } from './forecourt/details.js';
import { outdoorLight, groundPatches, blocks, farTrees, paving } from './town.js';
import { buildHeadOffice } from './head-office.js';
import { buildSkyline } from './skyline.js';
import * as LAYOUT from './island-layout.js';

const DOOR_X = -1.5, // the station exit, in the station's north wall at z = STATION_Z
  STATION_Z = 2.65,
  COURT_N = -1.3, // the court's north edge (the stone paving), with the hedge along the lane
  WALK = [-4.7, 22.2, -3.6, 3.9]; // where Eric can walk: the court, the way east to head office, its lobby

function ground(root) {
  // island paving all round, the forecourt's lighter stone, and the station floor beyond its cut wall
  root.add(rbox(64, 0.1, 40, '#6d6f73', { x: 8, y: -0.12, z: -4, seg: 1, r: 0.01, cast: false }));
  root.add(paving(-4.7, 7, COURT_N, STATION_Z, 0.9, { color: '#8e8a86', seam: '#7f7b77' }));
  // the worn line people walk, door to door
  root.add(paving(-2.2, 2.3, -0.3, 0.45, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
  root.add(paving(-2.2, -0.8, 0.45, STATION_Z, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
  root.add(paving(-7, 1.2, STATION_Z, 5.2, 1.25, { color: PAL.floor, seam: PAL.floorSeam }));
  // a kerb and grass verge to the west, under the platform roof's edge
  root.add(rbox(1.3, 0.06, 12, '#5f6d58', { x: -5.45, z: STATION_Z - 6, seg: 1, r: 0.01, cast: false }));
}

function station(root) {
  // the north wall of the security room, cut low like the near walls indoors; the doors stand open
  root.add(
    wall('x', -7, 1.2, STATION_Z + 0.09, 0.45, 0.18, {
      holes: [[DOOR_X - 0.85, DOOR_X + 0.85, 0, 1]],
    }),
  );
  root.add(wall('z', STATION_Z, 5.2, 1.21, 0.45, 0.18));
  const door = openDoor();
  door.position.set(DOOR_X, 0, STATION_Z + 0.09);
  door.scale.y = 0.26; // the frame cut with the wall, so it never hides Eric in the doorway
  root.add(door);
  root.add(lightPool(DOOR_X, STATION_Z + 0.9, 0.9, { k: 0.28 }));
  // the platform's blue roof along the west edge (the map's long blue roof), on slim posts
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 13, 14, 1, true, -Math.PI / 2, Math.PI),
    mat('#56697d', { side: THREE.DoubleSide }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.scale.set(1, 1, 0.42);
  roof.position.set(-5.9, 2.3, -2.5);
  roof.castShadow = true;
  root.add(roof);
  const posts = [];
  for (let z = 3.5; z > -9; z -= 2.6) posts.push([0.1, 2.3, 0.1, -4.75, 0, z], [0.1, 2.3, 0.1, -7.05, 0, z]);
  root.add(boxes(posts, '#6f7782'));
}

function court(root, nav) {
  // bicycle parking in the north-west corner, off the walking line
  const racks = [];
  for (const z of [-0.8, -0.1, 0.6])
    racks.push(
      [0.035, 0.46, 0.035, -3.5, 0, z - 0.25],
      [0.035, 0.46, 0.035, -3.5, 0, z + 0.25],
      [0.035, 0.035, 0.53, -3.5, 0.44, z],
    );
  root.add(boxes(racks, PAL.metal));
  for (const [i, z] of [-0.8, 0.6].entries()) {
    const bike = bicycle(i ? '#5f6f7d' : '#7a6570');
    bike.rotation.y = Math.PI;
    bike.position.set(-3.45, 0, z);
    root.add(bike);
  }
  nav.block(-4.7, -3.0, -1.2, 1.0);
  // planting: a bed of shrubs with two trees on the east side, trees west of the head office
  const bed = planter(2.6);
  bed.position.set(3.4, 0, 1.7);
  root.add(bed);
  nav.block(2.05, 4.75, 1.33, 2.07);
  for (const [i, [x, z, h]] of [
    [2.6, 1.7, 1.05],
    [4.3, 1.75, 0.95],
    [-1.2, -2.2, 1.15],
    [-3.4, -2.6, 1.0],
    [5.6, -2.3, 1.1],
  ].entries()) {
    const t = tree(i, h);
    t.position.set(x, 0, z);
    root.add(t);
  }
  // a bench against the station wall, facing the court
  const seat = bench(1.4, { seats: 2 });
  seat.rotation.y = Math.PI;
  seat.position.set(-3.6, 0, STATION_Z - 0.35);
  root.add(seat);
  nav.block(-4.35, -2.85, STATION_Z - 0.65, STATION_Z);
  for (const [x, z] of [
    [0.9, 1.75],
    [-2.6, -1.0],
  ]) {
    const lamp = lampPost();
    lamp.position.set(x, 0, z);
    root.add(lamp);
    nav.block(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
    root.add(lightPool(x, z, 0.55, { k: 0.22 }));
  }
  // east, the lane on to the fountain plaza runs between the hedge and the planting
  const hedge = planter(3.2);
  hedge.position.set(5.3, 0, COURT_N - 0.1);
  nav.block(3.7, 6.9, COURT_N - 0.45, COURT_N + 0.25);
  root.add(hedge);
  root.add(paving(7, 12, -1.0, 0.3, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
}

// the town beyond the court: the road south of the station, grass by the platform, the lane on east toward the
// fountain plaza, and plain blocks around; the island layout's buildings beyond (skyline)
function town(root, nav) {
  groundPatches(root, [
    [-12, 12, 5.3, 6.5, '#5b5e63'],
    [-12, -7.2, -12, 5.3, '#5f6d58'],
    [7, 12, 0.3, 1.2, '#5f6d58'],
    [7, 12, -2.2, -1.0, '#5f6d58'],
    [1.2, 12, STATION_Z, 5.3, '#5f6d58'],
  ]);
  blocks(root, [
    { x: -4.6, z: -7.4, w: 4.2, d: 3.4, h: 4.8, wall: 1 },
    { x: -9.2, z: -4.6, w: 3.2, d: 4.2, h: 3.2, wall: 2, east: true },
    { x: 7.4, z: -6.2, w: 3.6, d: 3.4, h: 5.6, wall: 3, west: true },
    { x: 10.8, z: -3.6, w: 2.8, d: 2.4, h: 2.6, wall: 1 },
    { x: -2.5, z: 8.2, w: 9, d: 2.6, h: 1.2, wall: 3 },
    { x: 6.6, z: 8.0, w: 5, d: 2.4, h: 1.4, wall: 0 },
  ]);
  nav.block(9.4, 12.2, -4.8, -2.4);
  const trees = [
    [-8.2, 0.5, 1.1],
    [-8.6, 3.2, 0.9],
    [7.8, -1.6, 0.9],
    [9.6, -1.7, 1.1],
    [8.4, 0.8, 0.8],
    [11.2, 0.8, 1.0],
    [-1.8, -5.3, 0.9],
    [3.2, 3.9, 0.9],
    [5.4, 4.3, 1.0],
    [7.6, 3.6, 0.85],
  ];
  farTrees(root, trees);
  for (const [x, z] of trees) nav.block(x - 0.15, x + 0.15, z - 0.15, z + 0.15);
  return buildSkyline(root, 'forecourt', { layout: LAYOUT, skip: ['head_office', 'station', 'platform_shed'] });
}

export function buildForecourt() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#5d636c');
  scene.add(root);
  const sun = outdoorLight(scene);

  const nav = new Nav(...WALK, 0.1);
  nav.block(WALK[0], 5.9, STATION_Z - 0.05, WALK[3]); // the station
  ground(root);
  station(root);
  court(root, nav);
  const sky = town(root, nav);
  const ho = buildHeadOffice(root, nav);
  const lift = ho.landing;
  let previousTime = null;
  return {
    root,
    scene,
    sun,
    nav,
    stationExit: [DOOR_X, STATION_Z + 0.35],
    start: [DOOR_X, STATION_Z - 0.75],
    officeEntrance: ho.entrance,
    liftOut: [...ho.liftSite.out],
    plazaLane: [6.0, -0.4], // the east lane on to the fountain plaza; Eric leaves and comes back along it
    plazaIn: [5.3, -0.4], // where he stops coming back, clear of the lane's trigger
    plazaEdge: [7.3, -0.4],
    liftSite: {
      ...ho.liftSite,
      hole: [...ho.liftSite.hole],
      out: [...ho.liftSite.out],
    },
    liftLanding: { leaves: lift.leaves, k: () => lift.k },
    lift,
    headOffice: ho,
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
