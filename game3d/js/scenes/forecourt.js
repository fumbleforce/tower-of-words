// The station forecourt, the first outdoor chunk of island-map-4. The camera looks north, as in the station
// security room: its exit is at the bottom (the station's north wall, cut low like every near wall), the head
// office entrance at the top, up and to the right, with the lift in the back of its small lobby and the tower
// behind. The blue platform roof runs along the west edge. Palette and light are the security room's.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, mat, rbox, wall, bench, lampPost } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, bicycle, openDoor, tree, monument } from './forecourt/details.js';
import { outdoorLight, groundPatches, blocks, farTrees, paving } from './town.js';

const DOOR_X = -1.5, // the station exit, in the station's north wall at z = STATION_Z
  STATION_Z = 2.65,
  HO_X = 1.6, // the head office door and the lift, one straight line
  ANNEX = [-0.3, 3.5], // the head office's glass-fronted ground floor: x range
  FRONT_Z = -1.3, // its front wall (cut low), with the doors
  BACK_Z = -3.21, // its back wall (full height), with the lift
  TOWER_Z = -5.6; // the tower's south face, behind the lift shaft
const ROOF = '#5d636c';
// the annex roof beside the shaft is unlit, like the lift's lid (drawn in the scene background) that covers the shaft
const roofMat = new THREE.MeshBasicMaterial({ color: ROOF, toneMapped: false });

export const FORECOURT_LIFT_SITE = {
  x: HO_X,
  zBack: BACK_Z - 0.09,
  zFront: BACK_Z + 0.09,
  hole: [HO_X - 0.62, HO_X + 0.62],
  wallH: 2.2,
  floor: '1',
  out: [HO_X, BACK_Z + 0.85],
  cap: true,
  shaft: true,
};

function ground(root) {
  // island paving all round, the forecourt's lighter stone, and the station floor beyond its cut wall
  root.add(rbox(40, 0.1, 40, '#6d6f73', { y: -0.12, z: -4, seg: 1, r: 0.01, cast: false }));
  root.add(paving(-4.7, 7, FRONT_Z, STATION_Z, 0.9, { color: '#8e8a86', seam: '#7f7b77' }));
  // the worn line people walk, door to door
  root.add(paving(-2.2, 2.3, -0.3, 0.45, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
  root.add(paving(-2.2, -0.8, 0.45, STATION_Z, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
  root.add(paving(0.9, 2.3, FRONT_Z, -0.3, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
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

function headOffice(root) {
  const [x0, x1] = ANNEX;
  root.add(paving(x0, x1, BACK_Z, FRONT_Z, 0.9, { color: PAL.floor, seam: PAL.floorSeam }));
  // glass front, cut low like every near wall, with the doors open in the middle
  root.add(wall('x', x0 - 0.09, x1 + 0.09, FRONT_Z, 0.5, 0.18, { holes: [[HO_X - 0.85, HO_X + 0.85, 0, 1]] }));
  const door = openDoor();
  door.position.set(HO_X, 0, FRONT_Z);
  door.scale.y = 0.29;
  root.add(door);
  for (const x of [x0, x1]) root.add(wall('z', BACK_Z - 0.09, FRONT_Z, x, 2.2, 0.18));
  root.add(wall('x', x0 - 0.09, x1 + 0.09, BACK_Z, 2.2, 0.18, { holes: [[HO_X - 0.62, HO_X + 0.62, 0, 1.45]] }));
  // a warm lobby: two wall lamps beside the lift and a pool of light on its floor
  for (const s of [-1, 1]) {
    const lamp = rbox(0.12, 0.5, 0.05, null, {
      x: HO_X + s * 1.15,
      y: 0.95,
      z: BACK_Z + 0.12,
      m: mat(PAL.lamp, { emissive: new THREE.Color(PAL.lampEm), emissiveIntensity: 2.2 }),
      cast: false,
    });
    root.add(lamp);
  }
  const light = new THREE.PointLight('#ffd8a8', 2.0, 3.6, 1.8);
  light.position.set(HO_X, 1.5, BACK_Z + 0.9);
  root.add(light);
  root.add(lightPool(HO_X, BACK_Z + 0.95, 1.0, { k: 0.3, sx: 1.4 }));
  const plant = planter(0.7);
  plant.position.set(x1 - 0.5, 0, BACK_Z + 0.45);
  plant.rotation.y = Math.PI / 2;
  root.add(plant);
  // roof beside the shaft (the lift's lid covers the shaft itself), then the tower
  const car = [HO_X - 1.42, HO_X + 1.42];
  for (const [a, b] of [
    [x0 - 0.1, car[0]],
    [car[1], x1 + 0.1],
  ])
    if (b - a > 0.02)
      root.add(
        rbox(b - a, 0.12, BACK_Z - TOWER_Z, null, {
          x: (a + b) / 2,
          y: 2.2,
          z: (BACK_Z + TOWER_Z) / 2,
          seg: 1,
          r: 0.01,
          m: roofMat,
        }),
      );
  root.add(rbox(4.6, 0.12, 0.2, null, { x: HO_X, y: 2.2, z: TOWER_Z + 0.1, seg: 1, r: 0.01, m: roofMat }));
  const tx = [x0 - 0.5, x1 + 0.5];
  root.add(rbox(tx[1] - tx[0], 9, 3.6, '#7b838d', { x: (tx[0] + tx[1]) / 2, z: TOWER_Z - 1.8, seg: 1, r: 0.03 }));
  const windows = [],
    bands = [];
  for (let level = 0; level < 7; level++) {
    const y = 2.5 + level * 0.95;
    for (let col = 0; col < 5; col++) windows.push([0.68, 0.6, 0.03, tx[0] + 0.52 + col * 0.84, y, TOWER_Z + 0.01]);
    bands.push([tx[1] - tx[0] + 0.06, 0.08, 0.06, (tx[0] + tx[1]) / 2, y + 0.72, TOWER_Z + 0.02]);
  }
  root.add(boxes(windows, '#4c5a68'), boxes(bands, '#a1a8b0'));
}

function court(root, nav) {
  // the head office's name stone, by its door
  const stone = monument('本社', 'HEAD OFFICE');
  stone.position.set(3.6, 0, FRONT_Z + 0.55);
  root.add(stone);
  nav.block(2.9, 4.3, FRONT_Z + 0.35, FRONT_Z + 0.75);
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
  hedge.position.set(5.3, 0, FRONT_Z - 0.1);
  root.add(hedge);
  root.add(paving(7, 12, -1.0, 0.3, 0.75, { color: '#98948f', seam: '#8a8681', y: 0.004 }));
}

// the town beyond the court: the road south of the station, grass by the platform, the lane on east toward the
// fountain plaza, and plain blocks around (the map's neighbours of head office), never walkable
function town(root) {
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
    { x: 10.9, z: 3.9, w: 3.2, d: 2.0, h: 1.2, wall: 3 },
    { x: -2.5, z: 8.2, w: 9, d: 2.6, h: 1.2, wall: 3 },
    { x: 6.6, z: 8.0, w: 5, d: 2.4, h: 1.4, wall: 0 },
  ]);
  farTrees(root, [
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
  ]);
}

export function buildForecourt() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(ROOF);
  scene.add(root);
  const sun = outdoorLight(scene);

  const nav = new Nav(-4.7, 6.2, BACK_Z + 0.1, STATION_Z - 0.05, 0.1);
  ground(root);
  station(root);
  headOffice(root);
  court(root, nav);
  town(root);
  const [x0, x1] = ANNEX;
  // the head office: everything north of its front line except its own lobby
  nav.block(-4.7, x0 + 0.1, BACK_Z, FRONT_Z + 0.1);
  nav.block(x1 - 0.1, 6.2, BACK_Z, FRONT_Z + 0.1);
  nav.block(x0, HO_X - 0.8, FRONT_Z - 0.1, FRONT_Z + 0.1);
  nav.block(HO_X + 0.8, x1, FRONT_Z - 0.1, FRONT_Z + 0.1);
  nav.block(x1 - 0.85, x1, BACK_Z, BACK_Z + 0.75); // the lobby's plant
  const lift = liftLanding(root);
  let previousTime = null;
  return {
    root,
    scene,
    sun,
    nav,
    stationExit: [DOOR_X, STATION_Z + 0.35],
    start: [DOOR_X, STATION_Z - 0.75],
    officeEntrance: [HO_X, FRONT_Z + 0.45],
    liftOut: [...FORECOURT_LIFT_SITE.out],
    plazaLane: [6.0, -0.4], // the east lane on to the fountain plaza; Eric leaves and comes back along it
    plazaIn: [5.3, -0.4], // where he stops coming back, clear of the lane's trigger
    plazaEdge: [7.3, -0.4],
    liftSite: {
      ...FORECOURT_LIFT_SITE,
      hole: [...FORECOURT_LIFT_SITE.hole],
      out: [...FORECOURT_LIFT_SITE.out],
    },
    liftLanding: { leaves: lift.leaves, k: () => lift.k },
    lift,
    setLiftOpen(k) {
      lift.want = THREE.MathUtils.clamp(k, 0, 1);
    },
    camera: { elev: 46, fov: 24 },
    towerZ: TOWER_Z,
    doorX: DOOR_X,
    update(t, dt) {
      const elapsed = dt ?? (previousTime == null ? 1 / 60 : t - previousTime);
      previousTime = t;
      lift.update(Math.min(0.1, Math.max(0, elapsed)));
    },
  };
}

function liftLanding(root) {
  const group = new THREE.Group();
  group.position.set(HO_X, 0, BACK_Z + 0.1);
  root.add(group);
  group.add(rbox(1.44, 0.1, 0.08, PAL.trim, { y: 1.44, seg: 1 }));
  for (const s of [-1, 1]) group.add(rbox(0.1, 1.44, 0.08, PAL.trim, { x: s * 0.67, seg: 1 }));
  group.add(rbox(1.28, 0.012, 0.24, PAL.metal, { y: 0.003, seg: 1, r: 0.003 }));
  const leaves = [-1, 1].map((s) => {
    const leaf = rbox(0.6, 1.36, 0.045, '#8e949d', { x: s * 0.31, z: -0.03, seg: 1 });
    group.add(leaf);
    return leaf;
  });
  group.add(rbox(0.08, 0.16, 0.025, PAL.metal, { x: 0.85, y: 0.6, seg: 1 }));
  const landing = { leaves, k: 0, want: 0 };
  landing.update = (dt) => {
    landing.k += (landing.want - landing.k) * Math.min(1, dt * 5);
    for (let i = 0; i < 2; i++) leaves[i].position.x = (i ? 1 : -1) * (0.31 + 0.6 * landing.k);
  };
  return landing;
}
