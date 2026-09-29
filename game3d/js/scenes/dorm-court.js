// The dorm courtyard, an outdoor chunk of island-map-4 (the dorm cluster in the south-east). The camera looks north,
// as in the forecourt. Eric comes in from the plaza lane on the west edge. At the back, a plain concrete dorm block:
// its glass-fronted entrance hall is a one-storey front, cut low like every near wall, with the mailboxes on its back
// wall and the passage to the rooms beside them; the block's floors rise behind. West of it the coin laundry's lit
// front, east of it the sento's; both are background frontages. The bicycle shelter is on the near west side,
// planting along the hall and the east edge. Evening: a cool dusk sky, the last warm sun low from the west, and the
// warm light from the hall and the laundry. Most parts are merged per colour to keep the draw calls low.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, mat, rbox, wall, tileFloor, lampPost } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, bicycle, openDoor, tree, monument } from './forecourt/details.js';
import { laundry, sento } from './dorm-court/frontages.js';
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
const CONCRETE = '#8f9194',
  CONCRETE_DARK = '#7b7e83',
  SKY = '#4b5260';
const roofMat = new THREE.MeshBasicMaterial({ color: '#555a63', toneMapped: false });

function ground(root) {
  root.add(rbox(44, 0.1, 40, '#63666b', { y: -0.12, z: -4, seg: 1, r: 0.01, cast: false }));
  // the court's pale concrete pavers, and the lane in from the plaza along the west edge
  root.add(tileFloor(WEST - 3, EAST, -1.9, NEAR, 0.9, { color: '#8a8886', seam: '#7c7a78', seamW: 0.02 }));
  root.add(
    tileFloor(WEST - 3, DOOR_X + 0.6, 0.1, 0.9, 0.75, { color: '#94918d', seam: '#86837f', seamW: 0.02, y: 0.004 }),
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

// the dorm block: plain concrete, four floors of windows and balcony rails over the hall; unlit windows mostly
function block(root) {
  const x0 = -3.6,
    x1 = 4.4,
    top = 9.6;
  root.add(rbox(x1 - x0, top, 3.8, CONCRETE, { x: (x0 + x1) / 2, z: BLOCK_Z - 1.9, seg: 1, r: 0.03 }));
  const dark = [],
    lit = [],
    rails = [],
    slabs = [];
  for (let f = 0; f < 4; f++) {
    const y = 2.6 + f * 1.75;
    slabs.push([x1 - x0 + 0.1, 0.1, 0.5, (x0 + x1) / 2, y - 0.1, BLOCK_Z + 0.25]);
    rails.push([x1 - x0 + 0.1, 0.5, 0.05, (x0 + x1) / 2, y, BLOCK_Z + 0.48]);
    for (let c = 0; c < 7; c++) {
      const x = x0 + 0.6 + c * 1.14;
      ((c * 3 + f * 5) % 7 < 2 ? lit : dark).push([0.72, 1.0, 0.03, x, y + 0.1, BLOCK_Z + 0.01]);
    }
  }
  root.add(boxes(dark, '#4e5864'), boxes(slabs, CONCRETE_DARK), boxes(rails, '#a8adb3'));
  const warm = boxes(lit, '#e8c89a');
  warm.material = mat('#e8c89a', { emissive: new THREE.Color('#ffc98a'), emissiveIntensity: 0.9 });
  root.add(warm);
  // roof edge and a water tank
  root.add(
    rbox(x1 - x0 + 0.1, 0.2, 3.9, CONCRETE_DARK, { x: (x0 + x1) / 2, y: top, z: BLOCK_Z - 1.9, seg: 1, r: 0.02 }),
  );
}

// the bicycle shelter on the near west side: steel posts, a pale see-through roof, a full row of bikes
function shelter(root, nav) {
  const x0 = -4.8,
    x1 = -1.6,
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
  const colors = ['#5f6f7d', '#7a6570', '#6b7466', '#8a8e95', '#55606e'];
  for (let i = 0; i < 5; i++) {
    const bike = bicycle(colors[i]);
    bike.rotation.y = Math.PI / 2;
    bike.position.set(x0 + 0.4 + i * 0.62, 0, (z0 + z1) / 2 + 0.05);
    root.add(bike);
  }
  nav.block(x0, x1, z0 - 0.1, NEAR);
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

// cheap distant massing so the court never sits in a void: two more dorm blocks and a row of low roofs
function massing(root) {
  // south of the court: the footpath along the sea wall, behind a long low hedge
  root.add(
    tileFloor(WEST - 3, EAST + 3, NEAR + 0.9, NEAR + 3, 0.9, { color: '#7f7d7b', seam: '#72706e', seamW: 0.02 }),
  );
  const hedge = planter(11.5);
  hedge.position.set(0.1, 0, NEAR + 1.35);
  root.add(hedge);
  root.add(rbox(4.2, 11, 4, '#878a8f', { x: 8.2, z: -6.5, seg: 1, r: 0.03 }));
  root.add(rbox(4.6, 8.4, 4, '#83868b', { x: -7.8, z: -6.8, seg: 1, r: 0.03 }));
  const dark = [];
  for (let f = 0; f < 5; f++)
    for (let c = 0; c < 3; c++) {
      dark.push([0.62, 0.8, 0.03, 6.9 + c * 1.3, 2.4 + f * 1.7, -4.49]);
      if (f < 4) dark.push([0.62, 0.8, 0.03, -9.3 + c * 1.4, 2.4 + f * 1.7, -4.79]);
    }
  root.add(boxes(dark, '#4e5864'));
}

export function buildDormCourt() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.add(root);
  // evening, after work: a cool dusk sky, the last of the sun low from the west, warm light from the doors
  scene.add(new THREE.HemisphereLight('#a8b2c6', '#55525a', 1.5));
  const sun = new THREE.DirectionalLight('#ffbe8c', 1.7);
  sun.position.copy(new THREE.Vector3(-0.85, 0.42, 0.25).normalize().multiplyScalar(30));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 5, far: 70 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#d6e0ff', 0.5);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);

  const nav = new Nav(WEST + 0.1, EAST - 0.2, BACK_Z - 1.2, NEAR - 0.05, 0.1);
  ground(root);
  hall(root, nav);
  block(root);
  laundry(root, nav, { west: WEST, roofMat });
  sento(root, nav, { east: EAST, roofMat });
  shelter(root, nav);
  planting(root, nav);
  massing(root);
  mergeStatic(root);
  return {
    root,
    scene,
    sun,
    nav,
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
