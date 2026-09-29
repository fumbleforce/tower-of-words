// West: station/security. East: head office. The open court is a short walk between their facing doors.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, mat, rbox, sh, wall, tileFloor, bench, lampPost } from '../props.js';
import { boxes, sign, planter, bicycle, openDoor } from './forecourt/details.js';

export const FORECOURT_LIFT_SITE = {
  x: 5.2,
  zBack: -2.5,
  zFront: -2.32,
  hole: [4.58, 5.82],
  wallH: 2.2,
  floor: '1',
  out: [5.2, -0.7],
  cap: true,
  shaft: true,
};

function station(root) {
  const color = '#8d9397';
  root.add(
    tileFloor(-6.8, -3.6, -3.3, 1.6, 0.8, {
      color: '#a09e99',
      seam: '#908e8b',
    }),
  );
  root.add(wall('x', -6.8, -3.6, -3.3, 2.15, 0.18, { color }));
  root.add(wall('z', -3.3, 1.6, -6.8, 2.15, 0.18, { color }));
  root.add(
    wall('z', -3.3, 1.6, -3.6, 2.15, 0.18, {
      color,
      holes: [[-0.85, 0.85, 0, 1.8]],
    }),
  );
  // The near wall and roof are cut back, as in the indoor places, to keep the watched arrival visible.
  root.add(wall('x', -6.8, -3.6, 1.6, 0.42, 0.18, { color }));
  root.add(rbox(3.5, 0.16, 2.1, '#6c7e91', { x: -5.2, z: -2.4, y: 2.17, seg: 1 }));
  const door = openDoor();
  door.position.set(-3.49, 0, 0);
  door.rotation.y = Math.PI / 2;
  root.add(door);
  const plate = sign('HONSHA STATION', 2.0, 0.24);
  plate.position.set(-5.15, 1.6, -3.195);
  root.add(plate);
  const seat = bench(1.65, { seats: 2 });
  seat.position.set(-5.65, 0, -2.75);
  root.add(seat);
  // A cropped blue platform canopy anchors the station to the approved map without building the railway.
  const roof = sh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 5.3, 12, 1, true, -Math.PI / 2, Math.PI), mat('#566f86')),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(-6.15, 2.2, -5.9);
  root.add(roof);
  root.add(
    boxes(
      [
        [1.9, 0.12, 5.3, -6.15, -0.12, -5.9],
        [0.12, 2.2, 0.12, -6.98, 0, -4],
        [0.12, 2.2, 0.12, -5.32, 0, -4],
        [0.12, 2.2, 0.12, -6.98, 0, -7.6],
        [0.12, 2.2, 0.12, -5.32, 0, -7.6],
      ],
      '#89929c',
    ),
  );
}

function tower(root) {
  // The tall rear volume sits behind the low entrance annex, leaving the lift approach in view.
  root.add(rbox(4.0, 8.0, 3.2, '#8b969f', { x: 5.3, z: -5.9, seg: 1, r: 0.04 }));
  const windows = [],
    rails = [];
  for (let level = 0; level < 7; level++) {
    const y = 0.5 + level * 1.02;
    for (let col = 0; col < 5; col++) windows.push([0.58, 0.75, 0.025, 3.74 + col * 0.78, y, -4.282]);
    for (let col = 0; col < 4; col++) windows.push([0.025, 0.75, 0.57, 3.282, y, -4.75 - col * 0.76]);
    rails.push([4.04, 0.09, 3.24, 5.3, y + 0.79, -5.9]);
  }
  root.add(boxes(windows, '#596e7e'), boxes(rails, '#a4adb3'));
  root.add(rbox(4.18, 0.14, 3.38, '#bcc0c0', { x: 5.3, z: -5.9, y: 8, seg: 1 }));
  root.add(rbox(1.4, 0.55, 0.9, '#7d888f', { x: 6, z: -6.2, y: 8.14, seg: 1 }));
  root.add(tileFloor(3.6, 6.7, -2.5, 1.6, 0.65, { color: '#a6a7a4', seam: '#939792' }));
  root.add(wall('z', -2.5, 1.6, 3.6, 2.2, 0.18, { holes: [[-0.85, 0.85, 0, 1.8]] }));
  root.add(wall('z', -4.25, 1.6, 6.7, 0.52, 0.18));
  root.add(wall('x', 3.6, 6.7, 1.6, 0.32, 0.18));
  root.add(wall('x', 3.6, 6.7, -2.41, 2.2, 0.18, { holes: [[4.58, 5.82, 0, 1.45]] }));
  const door = openDoor();
  door.position.set(3.49, 0, 0);
  door.rotation.y = -Math.PI / 2;
  root.add(door);
  const plate = sign('HEAD OFFICE', 1.65, 0.22);
  plate.position.set(3.48, 1.98, 0);
  plate.rotation.y = -Math.PI / 2;
  root.add(plate);
  root.add(rbox(0.48, 0.09, 3.05, '#7e8990', { x: 3.28, z: 0, y: 2.22, seg: 1 }));
  const light = new THREE.PointLight('#ffe2b8', 1.1, 3.6, 2);
  light.position.set(5.1, 1.75, -1.45);
  root.add(light);
}

function liftLanding(root) {
  const group = new THREE.Group();
  group.position.set(5.2, 0, -2.31);
  root.add(group);
  group.add(rbox(1.44, 0.1, 0.08, PAL.trim, { y: 1.44, seg: 1 }));
  for (const s of [-1, 1]) group.add(rbox(0.1, 1.44, 0.08, PAL.trim, { x: s * 0.67, seg: 1 }));
  group.add(rbox(1.28, 0.012, 0.24, PAL.metal, { y: 0.003, seg: 1, r: 0.003 }));
  const leaves = [-1, 1].map((s) => {
    const leaf = rbox(0.6, 1.36, 0.045, '#8e949d', {
      x: s * 0.31,
      z: -0.03,
      seg: 1,
    });
    group.add(leaf);
    return leaf;
  });
  const indicator = sign('1', 0.25, 0.12);
  indicator.position.set(0, 1.62, 0.05);
  group.add(indicator);
  group.add(rbox(0.08, 0.16, 0.025, PAL.metal, { x: 0.85, y: 0.6, seg: 1 }));
  const landing = { leaves, k: 0, want: 0 };
  landing.update = (dt) => {
    landing.k += (landing.want - landing.k) * Math.min(1, dt * 5);
    for (let i = 0; i < 2; i++) leaves[i].position.x = (i ? 1 : -1) * (0.31 + 0.6 * landing.k);
  };
  return landing;
}

function edges(root, nav) {
  // Bike parking occupies the station side of the planted northern edge, not the walking desire line.
  root.add(boxes([[3.0, 0.035, 1.35, -1.45, 0, -1.85]], '#878c8b'));
  for (const [i, x] of [-2.15, -1.35, -0.55].entries()) {
    const rack = boxes(
      [
        [0.035, 0.46, 0.035, -0.25, 0, 0],
        [0.035, 0.46, 0.035, 0.25, 0, 0],
        [0.53, 0.035, 0.035, 0, 0.44, 0],
      ],
      PAL.metal,
    );
    rack.position.set(x, 0, -1.8);
    root.add(rack);
    if (i < 2) {
      const bike = bicycle(i ? '#6a7978' : '#7c6470');
      bike.rotation.y = Math.PI / 2;
      bike.position.set(x + 0.07, 0, -1.8);
      root.add(bike);
    }
  }
  nav.block(-2.8, -0.1, -2.5, -1.15);
  for (const [x, z, length] of [
    [1.45, -2.07, 2.45],
    [-1.35, 2.48, 3.9],
  ]) {
    const bed = planter(length);
    bed.position.set(x, 0, z);
    root.add(bed);
    nav.block(x - length / 2, x + length / 2, z - 0.33, z + 0.33);
  }
  const lamp = lampPost();
  lamp.position.set(2.8, 0, 2.2);
  root.add(lamp);
  nav.block(2.67, 2.93, 2.07, 2.33);
  // Two quiet blocks close the northern view; the rest of the island belongs to later chunks.
  for (const [x, z, width, height] of [
    [-0.7, -7.2, 3.4, 3.0],
    [0.8, -10.8, 3.0, 4.2],
  ]) {
    root.add(rbox(width, height, 2.0, '#838f96', { x, z, seg: 1 }));
    root.add(rbox(width + 0.12, 0.12, 2.1, '#a8afaf', { x, z, y: height, seg: 1 }));
    const windows = [];
    for (let y = 0.6; y < height - 0.3; y += 1.05) windows.push([width - 0.5, 0.55, 0.025, x, y, z + 1.015]);
    root.add(boxes(windows, '#61737f'));
  }
}

export function buildForecourt() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#a6afb7');
  scene.fog = new THREE.Fog('#a6afb7', 45, 85);
  scene.add(root);
  scene.add(new THREE.HemisphereLight('#c4cfdb', '#757570', 1.7));
  const sun = new THREE.DirectionalLight('#ffe3bc', 2.3);
  sun.position.set(-7, 15, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
    near: 1,
    far: 40,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  root.add(
    rbox(17, 0.16, 18, '#8d9692', {
      x: 0,
      y: -0.2,
      z: -4,
      seg: 1,
      cast: false,
    }),
  );
  root.add(
    tileFloor(-3.6, 3.6, -2.65, 2.9, 0.9, {
      color: '#a5a6a0',
      seam: '#959991',
      seamW: 0.018,
    }),
  );
  root.add(
    tileFloor(3.6, 6.7, 1.6, 2.9, 0.9, {
      color: '#a5a6a0',
      seam: '#959991',
      seamW: 0.018,
    }),
  );
  // A warmer, worn paving strip joins the thresholds; no change in elevation interrupts the walk.
  root.add(
    tileFloor(-3.6, 3.6, -0.72, 0.72, 0.72, {
      color: '#b0afa6',
      seam: '#a09f98',
      seamW: 0.018,
      y: 0.005,
    }),
  );
  const nav = new Nav(-4.4, 6.7, -2.32, 2.7, 0.1);
  nav.block(-4.4, -3.5, -2.32, -0.85);
  nav.block(-4.4, -3.5, 0.85, 2.7);
  nav.block(3.51, 3.69, -2.32, -0.85);
  nav.block(3.51, 3.69, 0.85, 1.69);
  nav.block(3.51, 6.7, 1.51, 1.69);
  nav.block(6.61, 6.7, -2.32, 1.6);
  station(root);
  tower(root);
  edges(root, nav);
  const lift = liftLanding(root);
  let previousTime = null;
  return {
    root,
    scene,
    sun,
    nav,
    stationExit: [-3.8, 0],
    start: [-2.8, 0],
    officeEntrance: [3.8, 0],
    liftOut: [5.2, -0.7],
    plazaExit: [5.9, 2.15],
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
    camera: {
      elev: 48,
      fov: 26,
      yaw: -0.18,
      centre: [0.8, 0, -0.1],
      bounds: [-4.7, 7.1, -2.8, 2.9],
    },
    update(t, dt) {
      const elapsed = dt ?? (previousTime == null ? 1 / 60 : t - previousTime);
      previousTime = t;
      lift.update(Math.min(0.1, Math.max(0, elapsed)));
    },
  };
}
