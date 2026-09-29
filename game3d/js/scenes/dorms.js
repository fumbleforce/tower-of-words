// Eric's dorm room: the worst one, facing a bare concrete wall a couple of metres out (docs/game/cast.md). The
// camera looks north as everywhere else. At the back, the room itself (about 3 by 4 m): the bed on the left, the
// desk, chair and his two shipped boxes on the right, one window straight ahead onto the wall. At the front, the
// entry strip with the kitchenette on the left and the unit bath on the right behind a closed door. Every wall
// in front of the room is cut low for the camera. Dim cool evening light, one warm ceiling lamp.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, mat, rbox, wall, tileFloor } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes } from './forecourt/details.js';

const X0 = -1.05, // side walls
  X1 = 1.05,
  BACK = -2.7, // the back wall, with the window
  PART = 0, // the low wall between the room and the entry strip
  NEAR = 1.05, // the near wall, with the front door, cut low
  H = 1.55, // ceiling height
  LOW = 0.45, // cut-away walls
  OUT = BACK - 1.25, // the concrete wall outside, about two metres off
  BATH_X = 0.38, // the unit bath's west wall, with its door
  COUNTER_X = -0.69; // the kitchenette counter's front edge
const WIN = [-0.5, 0.45, 0.52, 1.24]; // window: x from, x to, sill, head
const WALL = '#7c8494',
  WALL_TOP = '#a3a9b3',
  CONCRETE = '#a2a5a7',
  BG = '#2f343c';

function shell(root) {
  // floor: grey-blue vinyl in the room and the strip, a lower darker genkan by the front door
  root.add(tileFloor(X0, X1, BACK, NEAR, 0.6, { color: '#6c7280', seam: '#646a77', seamW: 0.012 }));
  root.add(rbox(0.62, 0.02, 0.3, '#565b64', { x: -0.14, y: -0.004, z: NEAR - 0.17, seg: 1, r: 0.005, cast: false }));
  const opts = { color: WALL, top: WALL_TOP };
  root.add(wall('x', X0 - 0.09, X1 + 0.09, BACK - 0.05, H, 0.1, { ...opts, holes: [WIN] }));
  for (const x of [X0 - 0.05, X1 + 0.05]) root.add(wall('z', BACK - 0.09, NEAR + 0.05, x, H, 0.1, opts));
  // the room's own wall across the strip, cut low, with the open doorway into the room
  root.add(wall('x', X0, X1, PART, LOW, 0.08, { ...opts, holes: [[-0.4, 0.34, 0, 1]] }));
  // the near wall and its front door, both cut low
  root.add(wall('x', X0 - 0.09, X1 + 0.09, NEAR + 0.04, LOW, 0.1, { ...opts, holes: [[-0.44, 0.16, 0, 1]] }));
  root.add(
    boxes(
      [
        [0.6, LOW - 0.02, 0.05, -0.14, 0, NEAR + 0.04],
        [0.05, LOW, 0.1, -0.47, 0, NEAR + 0.04],
        [0.05, LOW, 0.1, 0.19, 0, NEAR + 0.04],
      ],
      '#4a515c',
    ),
  );
  // skirting round the room
  root.add(
    boxes(
      [
        [X1 - X0, 0.05, 0.015, 0, 0, BACK + 0.008],
        [0.015, 0.05, PART - BACK, X0 + 0.008, 0, (BACK + PART) / 2],
        [0.015, 0.05, PART - BACK, X1 - 0.008, 0, (BACK + PART) / 2],
      ],
      PAL.skirting,
    ),
  );
  // two sockets and a light switch
  root.add(
    boxes(
      [
        [0.06, 0.07, 0.012, -0.8, 0.2, BACK + 0.006],
        [0.06, 0.07, 0.012, 0.25, 0.2, BACK + 0.006],
        [0.012, 0.09, 0.06, X1 - 0.006, 0.62, -0.25],
      ],
      '#d8d8d2',
    ),
  );
}

function window_(root) {
  // a dark aluminium frame with one mullion, the glass faintly blue, and the concrete wall right behind it
  const [a, b, y0, y1] = WIN,
    z = BACK - 0.05,
    cx = (a + b) / 2;
  root.add(
    boxes(
      [
        [b - a + 0.08, 0.05, 0.13, cx, y0 - 0.05, z],
        [b - a + 0.08, 0.05, 0.13, cx, y1, z],
        [0.05, y1 - y0, 0.13, a - 0.015, y0, z],
        [0.05, y1 - y0, 0.13, b + 0.015, y0, z],
        [0.04, y1 - y0, 0.08, b - 0.25, y0, z],
        [b - a + 0.14, 0.025, 0.1, cx, y0 - 0.03, z + 0.06],
      ],
      '#4a515c',
    ),
  );
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(b - a, y1 - y0),
    new THREE.MeshStandardMaterial({ color: '#b9cbd6', transparent: true, opacity: 0.16, roughness: 0.1 }),
  );
  glass.position.set(cx, (y0 + y1) / 2, z);
  root.add(glass);
  // outside: a narrow concrete gap, then the wall, taller than the dorm, panel seams and a little staining
  // (lit as if open to the sky: the dorm's own shadow would turn the whole view black)
  root.add(
    rbox(X1 - X0 + 0.2, 0.06, BACK - OUT + 0.2, '#7a7d80', {
      y: -0.08,
      z: (OUT + BACK) / 2 - 0.1,
      seg: 1,
      r: 0.005,
      recv: false,
    }),
  );
  const wallMat = mat(CONCRETE, { roughness: 0.95 });
  root.add(rbox(4.4, 3.4, 0.3, null, { z: OUT - 0.15, seg: 1, r: 0.01, m: wallMat, recv: false }));
  const seams = [];
  for (const x of [-1.5, -0.6, 0.3, 1.2]) seams.push([0.018, 3.4, 0.01, x, 0, OUT + 0.003]);
  for (const y of [1.9]) seams.push([4.4, 0.018, 0.01, 0, y, OUT + 0.003]);
  root.add(boxes(seams, '#7b7e80'));
  // a drain pipe down the wall, seen through the window
  root.add(boxes([[0.06, 3.4, 0.06, 0.2, 0, OUT + 0.05]], '#6c7073'));
}

function bed(root, nav) {
  // a single bed along the left wall, head to the back: a plain grey frame, white sheet, navy cover, one pillow
  const x0 = X0 + 0.02,
    x1 = -0.4,
    z0 = BACK + 0.03,
    z1 = BACK + 1.23,
    cx = (x0 + x1) / 2;
  root.add(
    boxes(
      [
        [x1 - x0, 0.2, z1 - z0, cx, 0.02, (z0 + z1) / 2],
        [x1 - x0, 0.46, 0.05, cx, 0, z0 + 0.025],
        [x1 - x0, 0.28, 0.05, cx, 0, z1 - 0.025],
      ],
      '#6b6a6e',
    ),
  );
  root.add(rbox(x1 - x0 - 0.04, 0.07, z1 - z0 - 0.1, '#e6e6e2', { x: cx, y: 0.22, z: (z0 + z1) / 2, r: 0.02 }));
  root.add(
    rbox(x1 - x0 + 0.01, 0.06, z1 - z0 - 0.32, '#34406a', { x: cx, y: 0.25, z: (z0 + 0.32 + z1) / 2, r: 0.025 }),
  );
  root.add(rbox(0.36, 0.06, 0.17, '#eeeeea', { x: cx, y: 0.29, z: z0 + 0.16, r: 0.03 }));
  nav.block(X0, x1 + 0.04, BACK, z1 + 0.04);
  return { x: cx, z: (z0 + z1) / 2 };
}

function desk(root, nav) {
  // a grey steel desk on the right wall with a drawer pedestal, the chair pulled out into the aisle
  const x0 = 0.62,
    x1 = X1 - 0.02,
    z0 = -2.25,
    z1 = -1.5,
    top = 0.43,
    cx = (x0 + x1) / 2;
  root.add(rbox(x1 - x0, 0.03, z1 - z0, '#a4a8ae', { x: cx, y: top - 0.03, z: (z0 + z1) / 2, r: 0.006 }));
  root.add(
    boxes(
      [
        [x1 - x0 - 0.04, top - 0.04, 0.2, cx, 0, z1 - 0.12],
        [0.03, top - 0.03, 0.03, x0 + 0.03, 0, z0 + 0.03],
        [0.03, top - 0.03, 0.03, x1 - 0.03, 0, z0 + 0.03],
      ],
      '#848a93',
    ),
  );
  root.add(
    boxes(
      [
        [0.012, 0.012, 0.1, x0 + 0.004, 0.33, z1 - 0.12],
        [0.012, 0.012, 0.1, x0 + 0.004, 0.18, z1 - 0.12],
      ],
      PAL.trim,
    ),
  );
  // a desk lamp, off, and a closed laptop
  root.add(rbox(0.26, 0.018, 0.2, '#3a3f48', { x: cx + 0.04, y: top, z: -1.92, r: 0.006 }));
  root.add(boxes([[0.03, 0.26, 0.03, x1 - 0.1, top, z0 + 0.1]], '#3a3f48'));
  // the chair, facing the desk
  const chair = new THREE.Group();
  const leg = '#6f747c';
  chair.add(
    boxes(
      [
        [0.025, 0.24, 0.025, -0.1, 0, -0.1],
        [0.025, 0.24, 0.025, 0.1, 0, -0.1],
        [0.025, 0.24, 0.025, -0.1, 0, 0.1],
        [0.025, 0.24, 0.025, 0.1, 0, 0.1],
        [0.025, 0.28, 0.025, -0.1, 0.24, -0.11],
        [0.025, 0.28, 0.025, 0.1, 0.24, -0.11],
      ],
      leg,
    ),
  );
  chair.add(rbox(0.24, 0.04, 0.24, '#2f3a5c', { y: 0.24, r: 0.01 }));
  chair.add(rbox(0.23, 0.12, 0.03, '#2f3a5c', { y: 0.38, z: -0.115, r: 0.01 }));
  chair.rotation.y = -Math.PI / 2; // the back to the aisle, the seat toward the desk
  chair.position.set(0.46, 0, -1.82);
  root.add(chair);
  nav.block(x0 - 0.02, X1, z0, z1 + 0.02);
  nav.block(0.32, 0.6, -1.98, -1.66);
}

function shipped(root, nav) {
  // his two boxes, sent ahead, taped shut, by the desk; one stood on end
  const card = [
    [0.34, 0.28, 0.3, 0.82, 0, -1.23],
    [0.3, 0.36, 0.28, 0.84, 0, -0.82],
  ];
  root.add(boxes(card, PAL.box));
  root.add(
    boxes(
      [
        [0.07, 0.005, 0.3, 0.82, 0.28, -1.23],
        [0.07, 0.005, 0.28, 0.84, 0.36, -0.82],
        [0.07, 0.1, 0.005, 0.82, 0.18, -1.079],
        [0.07, 0.1, 0.005, 0.84, 0.26, -0.678],
      ],
      '#c9b48c',
    ),
  );
  // the shipping labels
  root.add(
    boxes(
      [
        [0.12, 0.07, 0.004, 0.74, 0.12, -1.079],
        [0.1, 0.08, 0.004, 0.78, 0.14, -0.678],
      ],
      '#f0eee8',
    ),
  );
  nav.block(0.63, X1, -1.4, -0.66);
  return { x: 0.83, z: -1.02 };
}

function kitchenette(root, nav) {
  // along the left wall of the strip: a counter with a sink and one hob ring, a small fridge under it, a kettle,
  // and a little warm light over it
  const x0 = X0 + 0.01,
    x1 = COUNTER_X,
    z0 = PART + 0.08,
    z1 = NEAR - 0.02,
    top = 0.5,
    cx = (x0 + x1) / 2;
  root.add(rbox(x1 - x0, top - 0.03, z1 - z0, '#c9ccd0', { x: cx, z: (z0 + z1) / 2, r: 0.008 }));
  root.add(rbox(x1 - x0 + 0.02, 0.03, z1 - z0, '#9aa0a8', { x: cx, y: top - 0.03, z: (z0 + z1) / 2, r: 0.005 }));
  // the sink, the hob, the fridge door, the tap and the fridge handle
  root.add(rbox(0.22, 0.012, 0.26, '#5b6068', { x: cx + 0.01, y: top, z: z0 + 0.22, r: 0.02, cast: false }));
  root.add(rbox(0.22, 0.014, 0.22, '#2c3038', { x: cx + 0.01, y: top, z: z0 + 0.58, r: 0.01, cast: false }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 4, 16), mat('#6a6f78'));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx + 0.01, top + 0.016, z0 + 0.58);
  root.add(ring);
  root.add(boxes([[0.012, 0.3, 0.3, x1 + 0.006, 0.04, z1 - 0.2]], '#e4e5e3'));
  root.add(
    boxes(
      [
        [0.02, 0.12, 0.02, x0 + 0.05, top, z0 + 0.22],
        [0.018, 0.1, 0.018, x1 + 0.02, 0.18, z1 - 0.34],
      ],
      PAL.metal,
    ),
  );
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.12, 10), mat('#d8d9d6'));
  kettle.position.set(cx + 0.02, top + 0.06, z1 - 0.12);
  root.add(kettle);
  nav.block(X0, x1 + 0.03, z0, NEAR);
  const warm = new THREE.PointLight('#ffd6a0', 0.7, 1.4, 2);
  warm.position.set(x1 - 0.05, 0.95, (z0 + z1) / 2);
  root.add(warm);
}

function bath(root, nav) {
  // the unit bath on the right of the strip: low cut walls, its door shut, a small tub and a toilet inside
  const z0 = PART + 0.05,
    z1 = NEAR,
    opts = { color: WALL, top: WALL_TOP };
  root.add(wall('z', z0, z1, BATH_X, LOW, 0.08, { ...opts, holes: [[0.34, 0.78, 0, 1]] }));
  // the door, closed and cut with the wall: frame, a pale leaf, the handle
  root.add(
    boxes(
      [
        [0.1, LOW, 0.04, BATH_X, 0, 0.32],
        [0.1, LOW, 0.04, BATH_X, 0, 0.8],
      ],
      '#4a515c',
    ),
  );
  root.add(rbox(0.045, LOW - 0.02, 0.44, '#c3c6ca', { x: BATH_X, z: 0.56, seg: 1, r: 0.006 }));
  root.add(boxes([[0.07, 0.025, 0.025, BATH_X - 0.035, LOW - 0.09, 0.73]], PAL.metal));
  // inside: a white moulded floor, the tub at the back, the toilet by the near wall
  root.add(
    rbox(X1 - BATH_X - 0.04, 0.012, z1 - z0 - 0.02, '#d9dcdf', {
      x: (BATH_X + X1) / 2,
      y: 0.003,
      z: (z0 + z1) / 2,
      seg: 1,
      r: 0.004,
      cast: false,
    }),
  );
  root.add(rbox(X1 - BATH_X - 0.08, 0.3, 0.42, '#eceeef', { x: (BATH_X + X1) / 2 + 0.01, z: z0 + 0.25, r: 0.03 }));
  root.add(
    rbox(X1 - BATH_X - 0.2, 0.02, 0.32, '#9fb6c6', {
      x: (BATH_X + X1) / 2 + 0.01,
      y: 0.28,
      z: z0 + 0.25,
      r: 0.02,
      cast: false,
    }),
  );
  root.add(rbox(0.16, 0.2, 0.22, '#eceeef', { x: X1 - 0.12, z: z1 - 0.26, r: 0.05 }));
  root.add(rbox(0.07, 0.3, 0.2, '#eceeef', { x: X1 - 0.04, z: z1 - 0.26, r: 0.02 }));
  nav.block(BATH_X - 0.06, X1, z0, NEAR);
}

export function buildDorms() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.add(root);
  // evening: a dim cool sky through the window, a little cool light down the gap, the warm lamp inside
  scene.add(new THREE.HemisphereLight('#9aa8c0', '#3d4350', 1.25));
  const sun = new THREE.DirectionalLight('#b8c6e0', 0.9);
  sun.position.copy(new THREE.Vector3(-0.3, 1, 0.55).normalize().multiplyScalar(20));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 5, far: 40 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe7ff', 0.35);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);

  const nav = new Nav(X0 + 0.08, X1 - 0.08, BACK + 0.1, NEAR - 0.1, 0.05);
  shell(root);
  window_(root);
  const bedAt = bed(root, nav);
  desk(root, nav);
  const boxAt = shipped(root, nav);
  kitchenette(root, nav);
  bath(root, nav);
  // the partition, either side of the doorway
  nav.block(X0, -0.4, PART - 0.06, PART + 0.06);
  nav.block(0.34, X1, PART - 0.06, PART + 0.06);

  // the ceiling lamp over the middle of the room: its warm light and the pool it makes (the fitting itself is on
  // the ceiling the camera looks through, so it isn't drawn; drawn, it floats over the floor)
  const lampZ = -1.3;
  const lamp = new THREE.PointLight('#ffcf96', 3.2, 3.4, 1.6);
  lamp.position.set(0, H - 0.15, lampZ);
  root.add(lamp);
  root.add(lightPool(0, lampZ - 0.2, 0.95, { k: 0.26, sz: 1.3 }));
  root.add(lightPool(-0.15, 0.55, 0.45, { k: 0.12 }));

  const win = [(WIN[0] + WIN[1]) / 2, BACK];
  return {
    root,
    scene,
    sun,
    nav,
    start: [-0.15, 0.72],
    roomEntry: [-0.15, 0.72],
    frontDoor: [-0.14, NEAR + 0.04],
    windowFront: [win[0], BACK + 0.45],
    window: win,
    windowY: (WIN[2] + WIN[3]) / 2,
    bed: bedAt,
    boxes: boxAt,
    bounds: { x0: X0, x1: X1, back: BACK, near: NEAR, out: OUT, h: H },
    camera: { elev: 50, fov: 24 },
    update() {},
  };
}
