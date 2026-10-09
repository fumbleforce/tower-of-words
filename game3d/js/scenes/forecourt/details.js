// Small outdoor fittings. Shared prop materials and low-sided geometry keep the court inexpensive.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, rbox, sh, textTexture, plane, JP_FONT, emissive } from '../../props.js';
import { shadowStandIns } from '../outdoor/plant-models.js';
import { setShadowGeometry, positions } from '../../perf/shadow-proxy.js';

export function boxes(parts, color) {
  const geometries = parts.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  const mesh = sh(new THREE.Mesh(mergeGeometries(geometries), mat(color)));
  geometries.forEach((g) => g.dispose());
  return mesh;
}

export function sign(label, width = 1.6, height = 0.25) {
  const texture = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#454d57';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e1e3df';
      ctx.font = '600 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2, w - 24);
    },
    512,
    80,
  );
  return plane(width, height, texture);
}

export function planter(length) {
  const group = new THREE.Group();
  group.add(rbox(length, 0.25, 0.65, '#858a87', { seg: 1, r: 0.025 }));
  group.add(rbox(length - 0.12, 0.025, 0.53, PAL.soil, { y: 0.25, r: 0.01 }));
  for (let i = 0; i < Math.ceil(length / 0.45); i++) {
    const shrub = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), mat(PAL.leaf[i % PAL.leaf.length])));
    shrub.position.set(-length / 2 + 0.25 + i * 0.43, 0.43, Math.sin(i * 2) * 0.07);
    shrub.scale.set(1, 0.68 + (i % 3) * 0.07, 0.78);
    group.add(shrub);
  }
  return group;
}

// a tube from a to b, open-ended: its ends sit in a joint or a wheel, or are a centimetre or two across
// (on a phone its shadow comes from a three-sided one: a tube this thin is a texel or two in the shadow map)
function bar(a, b, radius, color) {
  const from = new THREE.Vector3(...a),
    to = new THREE.Vector3(...b);
  const mesh = sh(
    new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 6, 1, true), mat(color)),
  );
  if (shadowStandIns())
    setShadowGeometry(mesh, positions(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 3, 1, true)));
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return mesh;
}

// basket: a wire basket on the front (the everyday mamachari); child: a child seat on the rear rack
export function bicycle(color, { basket = false, child = false } = {}) {
  const group = new THREE.Group();
  // The two triangular frame sections and a small rack distinguish parked bikes at game scale.
  for (const x of [-0.38, 0.38]) {
    const wheel = sh(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.028, 4, 12), mat(PAL.charcoal)));
    if (shadowStandIns()) setShadowGeometry(wheel, positions(new THREE.TorusGeometry(0.25, 0.028, 3, 8)));
    wheel.position.set(x, 0.28, 0);
    group.add(wheel);
    if (x > 0) group.userData.front = wheel; // spun about its axle (z) when the bike is wheeled
    group.add(bar([x - 0.22, 0.28, 0], [x + 0.22, 0.28, 0], 0.008, PAL.metal));
    group.add(bar([x, 0.06, 0], [x, 0.5, 0], 0.008, PAL.metal));
  }
  const points = [
    [-0.38, 0.28, 0],
    [-0.08, 0.59, 0],
    [0.04, 0.28, 0],
    [0.28, 0.65, 0],
    [0.38, 0.28, 0],
  ];
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [2, 0],
    [1, 3],
    [3, 2],
    [3, 4],
  ]) {
    group.add(bar(points[a], points[b], 0.018, color));
  }
  group.add(bar([-0.08, 0.54, 0], [-0.1, 0.73, 0], 0.018, PAL.metal));
  group.add(bar([0.28, 0.63, 0], [0.24, 0.82, 0], 0.016, PAL.metal));
  group.add(bar([0.24, 0.82, -0.13], [0.24, 0.82, 0.13], 0.019, PAL.dark));
  group.add(
    rbox(0.2, 0.045, 0.13, PAL.charcoal, {
      x: -0.12,
      y: 0.7,
      r: 0.012,
      seg: 1,
    }),
  );
  group.add(rbox(0.3, 0.025, 0.14, PAL.metal, { x: -0.38, y: 0.56, r: 0.008, seg: 1 }));
  if (basket) {
    group.add(rbox(0.22, 0.15, 0.26, '#8d939b', { x: 0.42, y: 0.66, r: 0.01, seg: 1 }));
    group.add(rbox(0.18, 0.02, 0.22, '#3e434d', { x: 0.42, y: 0.8, r: 0.005, seg: 1, cast: false })); // its open top
  }
  if (child) {
    group.add(rbox(0.26, 0.12, 0.24, '#5d6f86', { x: -0.4, y: 0.58, r: 0.03, seg: 1 }));
    group.add(rbox(0.06, 0.26, 0.24, '#5d6f86', { x: -0.53, y: 0.62, r: 0.03, seg: 1 }));
  }
  group.rotation.x = -0.09;
  return group;
}

// A row of bikes parked side by side in a rack, along x from 0; each bike's length runs along z. `gaps` are empty
// places. The parts merge by material when the scene is merged (scenes/merge-static.js).
// `fallen`: the place of one bike that has tipped over into the aisle
const BIKE_COLORS = ['#dcd9d2', '#5f6f7d', '#9aa3ab', '#3f4652', '#7a6570', '#6f8a9c', '#6c7a6a', '#d0ccc4', '#4f5866'];
// the bike parked in place i of a row with this seed, and how it stands there (its turn about y, in the row's frame)
export function rowBike(i, seed = 0) {
  const k = i * 5 + seed;
  return bicycle(BIKE_COLORS[k % BIKE_COLORS.length], { basket: k % 3 !== 1, child: k % 7 === 3 });
}
export const slotYaw = (i, seed = 0) => Math.PI / 2 + (((i * 7 + seed) % 3) - 1) * 0.05;
// a fallen bike, in the row's frame: on its side in the aisle in front of its place, turned a little across it
export const FALLEN = { dx: 0.1, z: -0.75, y: 0.04, yaw: Math.PI / 2 + 0.5, roll: Math.PI / 2 - 0.08 };
export function bikeRow(n, { step = 0.55, gaps = [], seed = 0, fallen = -1 } = {}) {
  const group = new THREE.Group();
  const rack = [[step * (n - 1) + 0.4, 0.05, 0.05, (step * (n - 1)) / 2, 0.02, 0.22]];
  for (let i = 0; i < n; i++) {
    rack.push([0.03, 0.42, 0.03, i * step, 0, 0.22], [0.03, 0.03, 0.34, i * step, 0.4, 0.08]);
    if (gaps.includes(i)) continue;
    const bike = rowBike(i, seed);
    if (i === fallen) {
      const lying = new THREE.Group();
      bike.rotation.x = FALLEN.roll;
      bike.position.set(0, FALLEN.y, 0);
      lying.add(bike);
      lying.rotation.y = FALLEN.yaw;
      lying.position.set(i * step + FALLEN.dx, 0, FALLEN.z);
      group.add(lying);
      continue;
    }
    bike.rotation.y = slotYaw(i, seed);
    bike.position.set(i * step, 0, 0);
    group.add(bike);
  }
  group.add(boxes(rack, PAL.metal));
  return group;
}

// A tall street lamp: a slim post, a short arm and a lit head facing down.
export function streetLamp() {
  const group = new THREE.Group();
  group.add(
    boxes(
      [
        [0.07, 2.35, 0.07, 0, 0, 0],
        [0.4, 0.05, 0.06, 0.17, 2.3, 0],
        [0.16, 0.04, 0.16, 0, 0, 0],
      ],
      PAL.dark,
    ),
  );
  group.add(rbox(0.34, 0.1, 0.2, PAL.dark, { x: 0.3, y: 2.22, r: 0.02, seg: 1 }));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.15), emissive(PAL.lamp, PAL.lampEm, 2.4));
  glow.rotation.x = Math.PI / 2;
  glow.position.set(0.3, 2.215, 0);
  group.add(glow);
  return group;
}

export function openDoor() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(rbox(0.07, 1.75, 0.16, PAL.doorFrame, { x: side * 0.86, seg: 1 }));
    // Leaves parked beside the opening, with opaque glazing like the existing lobby.
    group.add(rbox(0.54, 1.65, 0.045, PAL.doorFrame, { x: side * 1.15, seg: 1 }));
    group.add(rbox(0.46, 1.38, 0.055, '#84969f', { x: side * 1.15, y: 0.17, seg: 1 }));
    group.add(rbox(0.025, 0.28, 0.07, PAL.metal, { x: side * 0.95, y: 0.62, seg: 1 }));
  }
  group.add(rbox(1.8, 0.1, 0.18, PAL.doorFrame, { y: 1.7, seg: 1 }));
  group.add(rbox(1.65, 0.012, 0.22, PAL.metal, { y: 0.003, seg: 1, r: 0.003 }));
  return group;
}

// A street tree: a thin trunk and two stacked low-poly crowns in the muted leaf greens.
export function tree(seed = 0, height = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.CylinderGeometry(0.05, 0.07, 0.9 * height, 6).translate(0, 0.45 * height, 0);
  group.add(sh(new THREE.Mesh(trunk, mat('#5d5249'))));
  for (const [i, y, r] of [
    [0, 1.02, 0.5],
    [1, 1.42, 0.36],
  ]) {
    const crown = sh(
      new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(PAL.leaf[(seed + i * 2) % PAL.leaf.length])),
    );
    crown.position.set(i * (seed % 2 ? 0.08 : -0.08), y * height, 0);
    crown.rotation.set(seed * 0.7, seed * 1.3, 0);
    group.add(crown);
  }
  return group;
}

// A low stone name sign, the kind that stands at a Japanese company's front door.
export function monument(top, bottom, width = 1.3) {
  const group = new THREE.Group();
  group.add(rbox(width, 0.62, 0.22, '#565c66', { r: 0.02 }));
  group.add(rbox(width + 0.08, 0.05, 0.3, '#7b818a', { r: 0.01 }));
  const texture = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#565c66';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e6e4de';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 92px ' + JP_FONT;
      ctx.fillText(top, w / 2, h * 0.38, w - 30);
      ctx.globalAlpha = 0.75;
      ctx.font = '600 40px sans-serif';
      ctx.fillText(bottom, w / 2, h * 0.8, w - 30);
    },
    512,
    256,
  );
  const face = plane(width - 0.12, 0.47, texture);
  face.position.set(0, 0.33, 0.112);
  group.add(face);
  return group;
}
