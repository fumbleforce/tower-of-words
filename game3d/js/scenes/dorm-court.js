// The dorm courtyard, an outdoor chunk of island-map-4: the open entrance court on the west side of the dorm cluster.
// The camera looks at Eric's block (island east; the chunk is turned 90° in scenes/island-layout.js). Eric comes in
// from the plaza lane on the west edge of the frame. At the back, Eric's five-storey block (dorm-court/block.js)
// runs past both edges of the frame, balconies all along it, and returns forward on the east side. In front of it,
// its glass-fronted entrance hall is a one-storey front, cut low like every near wall, with the mailboxes on its
// back wall and the passage to the rooms beside them. West of it the coin laundry's lit front, east of it the
// sento's with its chimney; both are frontages. Bikes: a shelter on the near east side and an open rack on the near
// west. The rest of the cluster and the town around come from the island layout (scenes/skyline.js). Evening: a
// dim dusk sky, the last warm sun low, lit windows, the hall and the laundry. Merged per colour for the draw calls.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, rbox, wall, tileFloor, lampPost } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, bicycle, openDoor, tree, monument } from './forecourt/details.js';
import { laundry, sento } from './dorm-court/frontages.js';
import { ericBlock } from './dorm-court/block.js';
import { buildSkyline } from './skyline.js';
import * as layout from './island-layout.js';
import { eveningLight } from './town.js';
import { mergeStatic } from './merge-static.js';

const HALL = [-1.1, 2.5], // the entrance hall: x range
  FRONT_Z = -1.2, // its glass front (cut low), with the doors
  BACK_Z = -2.9, // its back wall (full height): mailboxes and the passage
  DOOR_X = 0.5,
  PASS_X = 1.75, // the passage toward the rooms
  BLOCK_Z = BACK_Z - 1.4, // the block's south face above and behind the hall
  NEAR = 2.5, // the court's near edge
  WEST = -5.2,
  EAST = 5.4;
const SKY = '#2b3342';
const roofMat = new THREE.MeshBasicMaterial({ color: '#555a63', toneMapped: false });

function ground(root) {
  // the court's pale concrete pavers, and the lane in from the plaza along the west edge
  root.add(tileFloor(WEST - 3, EAST, -1.9, NEAR, 0.9, { color: '#8a8886', seam: '#7c7a78', seamW: 0.02 }));
  root.add(
    tileFloor(WEST - 8, DOOR_X + 0.6, 0.1, 0.9, 0.75, { color: '#94918d', seam: '#86837f', seamW: 0.02, y: 0.004 }),
  );
  root.add(
    tileFloor(DOOR_X - 0.6, DOOR_X + 0.6, FRONT_Z, 0.1, 0.75, {
      color: '#94918d',
      seam: '#86837f',
      seamW: 0.02,
      y: 0.004,
    }),
  );
  // a kerb and grass strip along the near edge
  root.add(rbox(EAST - WEST + 6, 0.06, 0.9, '#58654f', { x: 0, z: NEAR + 0.45, seg: 1, r: 0.01, cast: false }));
  // grass either side of the lane where it leaves the court for the plaza, under a few trees
  for (const [z0, z1] of [
    [-4.3, 0.1],
    [0.9, NEAR + 0.9],
  ])
    root.add(rbox(5, 0.05, z1 - z0, '#58654f', { x: WEST - 5.5, z: (z0 + z1) / 2, seg: 1, r: 0.01, cast: false }));
}

// the entrance hall: cut-low glass front with open doors, side and back walls full height, mailboxes, the passage
function hall(root, nav) {
  const [x0, x1] = HALL;
  root.add(tileFloor(x0, x1, BACK_Z, FRONT_Z, 0.6, { color: '#9c9aa0', seam: '#8d8b91', seamW: 0.015 }));
  const opts = { color: '#7f848c', top: '#a6abb2' };
  root.add(
    wall('x', x0 - 0.09, x1 + 0.09, FRONT_Z, 0.5, 0.18, { ...opts, holes: [[DOOR_X - 0.85, DOOR_X + 0.85, 0, 1]] }),
  );
  const door = openDoor();
  door.position.set(DOOR_X, 0, FRONT_Z);
  door.scale.y = 0.29;
  root.add(door);
  for (const x of [x0, x1]) root.add(wall('z', BACK_Z - 0.09, FRONT_Z, x, 2.2, 0.18, opts));
  root.add(
    wall('x', x0 - 0.09, x1 + 0.09, BACK_Z, 2.2, 0.18, { ...opts, holes: [[PASS_X - 0.45, PASS_X + 0.45, 0, 1.5]] }),
  );
  // the passage beyond: a short corridor floor lit at its far end, where the block's ground floor begins
  root.add(
    tileFloor(PASS_X - 0.5, PASS_X + 0.5, BLOCK_Z, BACK_Z, 0.5, { color: '#7d8089', seam: '#71747c', seamW: 0.012 }),
  );
  root.add(
    boxes(
      [
        [0.1, 2.2, BACK_Z - BLOCK_Z, PASS_X - 0.55, 0, (BACK_Z + BLOCK_Z) / 2],
        [0.1, 2.2, BACK_Z - BLOCK_Z, PASS_X + 0.55, 0, (BACK_Z + BLOCK_Z) / 2],
        [1.2, 2.2, 0.1, PASS_X, 0, BLOCK_Z],
      ],
      '#5d626c',
    ),
  );
  root.add(lightPool(PASS_X, BACK_Z - 0.7, 0.55, { k: 0.3 }));
  // the roof over the passage and beside it, unlit like the forecourt annex's
  root.add(
    rbox(x1 - x0 + 0.2, 0.12, BACK_Z - BLOCK_Z, null, {
      x: (x0 + x1) / 2,
      y: 2.2,
      z: (BACK_Z + BLOCK_Z) / 2,
      seg: 1,
      r: 0.01,
      m: roofMat,
    }),
  );
  // mailboxes: a grey steel bank of small doors on the back wall, west of the passage
  const mx = -0.05,
    parts = [];
  root.add(rbox(1.5, 0.9, 0.22, '#9a9fa6', { x: mx, y: 0.3, z: BACK_Z + 0.2, r: 0.015 }));
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) parts.push([0.2, 0.17, 0.02, mx - 0.62 + c * 0.245, 0.37 + r * 0.205, BACK_Z + 0.315]);
  root.add(boxes(parts, '#b4b9bf'));
  root.add(
    boxes(
      parts.map(([, , , x, y, z]) => [0.07, 0.015, 0.025, x, y + 0.13, z + 0.005]),
      PAL.charcoal,
    ),
  );
  nav.block(mx - 0.85, mx + 0.85, BACK_Z, BACK_Z + 0.45);
  // a notice board and a wall lamp either side of the passage
  root.add(rbox(0.7, 0.5, 0.04, '#c9c6bd', { x: x1 - 0.1, y: 0.7, z: BACK_Z + 0.12, r: 0.01, cast: false }));
  root.add(
    boxes(
      [
        [0.18, 0.24, 0.01, x1 - 0.3, 0.8, BACK_Z + 0.145],
        [0.2, 0.14, 0.01, x1 - 0.02, 0.9, BACK_Z + 0.145],
        [0.16, 0.2, 0.01, x1 + 0.1, 0.74, BACK_Z + 0.145],
      ],
      PAL.paper,
    ),
  );
  const light = new THREE.PointLight('#ffd8a8', 2.2, 3.8, 1.8);
  light.position.set((x0 + x1) / 2, 1.6, (FRONT_Z + BACK_Z) / 2);
  root.add(light);
  root.add(lightPool((x0 + x1) / 2, (FRONT_Z + BACK_Z) / 2, 1.2, { k: 0.26, sx: 1.4 }));
  root.add(lightPool(DOOR_X, FRONT_Z + 0.6, 0.8, { k: 0.2 }));
  // the hall and everything north of the court's back line, except the hall itself and its passage
  nav.block(WEST, x0 + 0.1, BACK_Z, FRONT_Z - 0.55);
  nav.block(x1 - 0.1, EAST, BACK_Z, FRONT_Z + 0.1);
  nav.block(x0, DOOR_X - 0.8, FRONT_Z - 0.1, FRONT_Z + 0.1);
  nav.block(DOOR_X + 0.8, x1, FRONT_Z - 0.1, FRONT_Z + 0.1);
  // the back wall and the passage: Eric only goes through it on the watched trip in (places/dorm-court.js)
  nav.block(WEST, EAST, BACK_Z - 1.3, BACK_Z + 0.1);
}

// bikes: a shelter with a pale see-through roof on the near east side, and an open rack on the near west, clear of
// the lane where Eric comes in (the shelter's roof would hide him there)
const BIKES = ['#5f6f7d', '#7a6570', '#6b7466', '#8a8e95', '#55606e', '#6d7a86', '#7d7468'];
function bikeRow(root, x0, n, z, colour0 = 0) {
  for (let i = 0; i < n; i++) {
    const bike = bicycle(BIKES[(colour0 + i) % BIKES.length]);
    bike.rotation.y = Math.PI / 2 + (i % 2 ? 0.05 : -0.04);
    bike.position.set(x0 + i * 0.62, 0, z);
    root.add(bike);
  }
}
function bikes(root, nav) {
  const x0 = 1.0,
    x1 = 3.75,
    z0 = 1.35,
    z1 = 2.35;
  const posts = [];
  for (const x of [x0 + 0.1, (x0 + x1) / 2, x1 - 0.1]) posts.push([0.07, 1.35, 0.07, x, 0, z1 - 0.05]);
  posts.push(
    [x1 - x0, 0.06, 0.06, (x0 + x1) / 2, 1.3, z1 - 0.05],
    [x1 - x0, 0.05, 0.05, (x0 + x1) / 2, 1.1, z0 + 0.05],
  );
  root.add(boxes(posts, '#6f7782'));
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0 + 0.2, 0.03, z1 - z0 + 0.3),
    new THREE.MeshStandardMaterial({
      color: '#b9c8cf',
      transparent: true,
      opacity: 0.38,
      roughness: 0.4,
      depthWrite: false,
    }),
  );
  roof.position.set((x0 + x1) / 2, 1.22, (z0 + z1) / 2);
  roof.rotation.x = -0.2;
  root.add(roof);
  bikeRow(root, x0 + 0.4, 4, (z0 + z1) / 2 + 0.05);
  nav.block(x0, x1, z0 - 0.1, NEAR);
  // the open rack: a low steel hoop per bike
  const rx = -3.75,
    rz = 1.95,
    hoops = [];
  for (let i = 0; i < 4; i++) {
    const x = rx + i * 0.62;
    hoops.push([0.04, 0.55, 0.04, x - 0.2, 0, rz - 0.12], [0.04, 0.55, 0.04, x + 0.2, 0, rz - 0.12]);
    hoops.push([0.44, 0.04, 0.04, x, 0.53, rz - 0.12]);
  }
  root.add(boxes(hoops, '#8b939c'));
  bikeRow(root, rx, 4, rz, 3);
  nav.block(rx - 0.45, rx + 3 * 0.62 + 0.45, rz - 0.4, NEAR);
}

function planting(root, nav) {
  // beds either side of the hall doors and a longer one along the east edge
  for (const [x, len] of [
    [-0.45, 1.0],
    [1.75, 1.2],
  ]) {
    const bed = planter(len);
    bed.position.set(x, 0, FRONT_Z + 0.42);
    root.add(bed);
    nav.block(x - len / 2 - 0.05, x + len / 2 + 0.05, FRONT_Z + 0.05, FRONT_Z + 0.8);
  }
  const east = planter(2.8);
  east.position.set(4.3, 0, 1.4);
  east.rotation.y = Math.PI / 2;
  root.add(east);
  nav.block(3.9, EAST, -0.1, NEAR);
  for (const [i, [x, z, h]] of [
    [4.35, 0.4, 1.1],
    [4.3, 2.0, 0.95],
    [-5.35, 2.2, 1.05],
    [-5.6, -1.4, 1.2],
    [3.2, -3.7, 1.0],
    [-7.2, -1.6, 1.15],
    [-8.4, 2.0, 1.0],
    [-9.9, -1.0, 1.25],
    [-10.6, 1.9, 0.95],
  ].entries()) {
    const t = tree(i + 1, h);
    t.position.set(x, 0, z);
    root.add(t);
  }
  const stone = monument('社員寮', 'STAFF DORM', 1.0);
  stone.position.set(2.85, 0, FRONT_Z + 0.5);
  root.add(stone);
  nav.block(2.3, 3.4, FRONT_Z + 0.3, FRONT_Z + 0.7);
  for (const [x, z] of [
    [-0.9, 0.95],
    [2.9, 0.95],
  ]) {
    const lamp = lampPost();
    lamp.position.set(x, 0, z);
    root.add(lamp);
    nav.block(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
    root.add(lightPool(x, z, 0.55, { k: 0.24 }));
  }
}

// the near edge: the footpath past the court, behind a long low hedge
function nearEdge(root) {
  root.add(
    tileFloor(WEST - 8, EAST + 3, NEAR + 0.9, NEAR + 3, 0.9, { color: '#7f7d7b', seam: '#72706e', seamW: 0.02 }),
  );
  const hedge = planter(11.5);
  hedge.position.set(0.1, 0, NEAR + 1.35);
  root.add(hedge);
}

export function buildDormCourt() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.add(root);
  // evening, after work (scenes/town.js eveningLight, the same light as the rest of the walk home)
  scene.add(new THREE.HemisphereLight());
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 5, far: 70 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight();
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);
  eveningLight(scene);

  const nav = new Nav(WEST + 0.1, EAST - 0.2, BACK_Z - 1.2, NEAR - 0.05, 0.1);
  ground(root);
  hall(root, nav);
  ericBlock(root, { hall: HALL });
  laundry(root, nav, { west: WEST, roofMat });
  sento(root, nav, { east: EAST, roofMat });
  bikes(root, nav);
  planting(root, nav);
  nearEdge(root);
  mergeStatic(root);
  // the rest of the dorm cluster and the town around, from the island layout; Eric's block is built above
  const sky = buildSkyline(root, 'dorm_court', { layout, evening: true, skip: ['dorm_1'] });
  return {
    root,
    scene,
    sun,
    nav,
    sky,
    start: [WEST + 0.6, 0.5],
    plazaEntry: [WEST + 0.6, 0.5],
    westEdge: [WEST - 0.6, 0.5],
    dormEntry: [DOOR_X, FRONT_Z + 0.5],
    door: [DOOR_X, FRONT_Z],
    hallMid: [PASS_X - 0.2, BACK_Z + 0.55],
    passage: [PASS_X, BACK_Z],
    passageIn: [PASS_X, BACK_Z - 0.75],
    bounds: { west: WEST, east: EAST, front: FRONT_Z, back: BACK_Z, near: NEAR },
    camera: { elev: 46, fov: 24 },
    update() {},
  };
}
