// The fountain plaza, the second outdoor chunk of island-map-4, east of the head-office forecourt. The camera
// looks north, as in the forecourt. A stone lane runs west to east across the frame along the fountain's near
// edge: in from the forecourt on the left, on toward the dorms on the right. North of it the round plaza with the
// fountain and two benches, the canteen and its terrace behind; south of it a planted verge, then the backs and
// roofs of the shop row (background only). Palette and light are the forecourt's.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Nav } from '../movement/navigation.js';
import { PAL, mat, rbox, bench, lampPost, textTexture, plane, JP_FONT } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, tree } from './forecourt/details.js';
import { outdoorLight, groundPatches, blocks, farTrees, paving, TOWN } from './town.js';

const LANE = [-0.2, 1.0], // the lane's z range; the fountain ring touches its north edge
  LZ = 0.4,
  FX = 0,
  FZ = -2.7, // the fountain's centre
  RING = 2.5,
  BASIN = 1.5,
  EDGE_X = 6.6, // the walkable ends of the lane, west and east
  SHOPS_Z = 2.6; // the shop row's lane-side face

function ground(root) {
  root.add(rbox(44, 0.1, 40, TOWN.paving, { y: -0.12, z: -4, seg: 1, r: 0.01, cast: false }));
  root.add(paving(-4.2, 4.2, -5.6, LANE[0], 0.9));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(RING, RING, 0.01, 32), mat('#98948f', { roughness: 0.35 }));
  ring.position.set(FX, 0.002, FZ);
  ring.receiveShadow = true;
  root.add(ring);
  root.add(paving(-12, 12, LANE[0], LANE[1], 0.75, { color: '#98948f', seam: '#8a8681' }));
  // the planted verge south of the lane, a pavement strip, then the shops
  root.add(
    rbox(24, 0.06, SHOPS_Z - 0.6 - LANE[1], '#5f6d58', {
      z: (LANE[1] + SHOPS_Z - 0.6) / 2,
      seg: 1,
      r: 0.01,
      cast: false,
    }),
  );
  groundPatches(root, [
    [-12, 12, SHOPS_Z - 0.6, SHOPS_Z, '#7a7c80'],
    [-12, -4.2, -9, LANE[0], TOWN.grass],
    [4.2, 12, -9, LANE[0], TOWN.grass],
    [-3.6, 3.6, -7.2, -5.6, '#7a7c80'],
    // behind the shops, the seafront promenade and the sea (the map's south shore)
    [-14, 14, SHOPS_Z + 1.6, SHOPS_Z + 2.8, '#85878a'],
    [-14, 14, SHOPS_Z + 2.8, 16, '#50667a'],
  ]);
}

function fountain(root) {
  const g = new THREE.Group();
  g.position.set(FX, 0, FZ);
  const stone = mat('#9a9690', { roughness: 0.6 }),
    water = mat('#7894a3', {
      roughness: 0.12,
      metalness: 0.1,
      emissive: new THREE.Color('#2c4452'),
      emissiveIntensity: 0.5,
    });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(BASIN, BASIN + 0.05, 0.36, 28), stone);
  rim.position.y = 0.18;
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(BASIN - 0.12, BASIN - 0.12, 0.02, 28), water);
  pool.position.y = 0.3;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.8, 10), stone);
  column.position.y = 0.4;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.32, 0.16, 18), stone);
  bowl.position.y = 0.86;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 18), water);
  top.position.y = 0.935;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.34, 8), stone);
  spout.position.y = 1.08;
  for (const m of [rim, pool, column, bowl, top, spout]) {
    m.castShadow = m !== pool && m !== top;
    m.receiveShadow = true;
    g.add(m);
  }
  root.add(g);
}

function seating(root, nav) {
  // two benches either side of the fountain, facing it
  for (const s of [-1, 1]) {
    const b = bench(1.4, { seats: 2 });
    b.rotation.y = -s * (Math.PI / 2);
    b.position.set(FX + s * 3.3, 0, FZ);
    root.add(b);
    nav.block(FX + s * 3.3 - 0.35, FX + s * 3.3 + 0.35, FZ - 0.8, FZ + 0.8);
  }
  for (const x of [-3.4, 3.4]) {
    const lamp = lampPost();
    lamp.position.set(x, 0, LANE[0] - 0.25);
    root.add(lamp);
    nav.block(x - 0.14, x + 0.14, LANE[0] - 0.39, LANE[0] - 0.11);
    root.add(lightPool(x, LANE[0] - 0.25, 0.55, { k: 0.22 }));
  }
}

function planting(root) {
  // the verge: low shrub beds with gaps, kept low so nothing hides Eric on the lane
  for (const x of [-7.4, -3.2, 1.2, 5.4]) {
    const bed = planter(2.4);
    bed.position.set(x, 0, (LANE[1] + SHOPS_Z - 0.6) / 2);
    root.add(bed);
  }
  // trees in the corner beds either side of the plaza
  for (const [i, [x, z, h]] of [
    [-5.2, -1.4, 1.1],
    [-5.6, -3.9, 1.0],
    [5.3, -1.5, 1.05],
    [5.8, -4.2, 1.15],
  ].entries()) {
    const t = tree(i + 1, h);
    t.position.set(x, 0, z);
    root.add(t);
  }
}

// a rooftop shop sign facing the camera: the kana large, the English small under it
function roofSign(text, en, color) {
  const tex = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ecebe6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 104px ' + JP_FONT;
      ctx.fillText(text, w / 2, h * 0.4, w - 30);
      ctx.globalAlpha = 0.8;
      ctx.font = '600 34px sans-serif';
      ctx.fillText(en, w / 2, h * 0.84, w - 30);
    },
    384,
    192,
  );
  return plane(1.2, 0.6, tex);
}

// the shop row south of the lane: low single-storey units whose awnings lean out over the pavement toward the lane.
// The camera sees them from behind and above: roofs, the awnings' tops and three rooftop signs. No interiors.
function shops(root) {
  const units = [
    [-9.8, '#94706b', 1],
    [-6.6, '#627888', 3],
    [-3.4, '#74866c', 0],
    [-0.2, '#9a8f7c', 2],
    [3.0, '#74718b', 1],
    [6.2, '#627888', 3],
    [9.4, '#94706b', 0],
  ];
  const w = 3.1,
    d = 1.6,
    h = 1.1;
  blocks(
    root,
    units.map(([x, , wall]) => ({ x, z: SHOPS_Z + d / 2, w: w - 0.06, d, h, wall })),
    { roof: mat('#7a7f87', { roughness: 0.8 }) },
  );
  // awnings: one sloped slab per unit, merged per colour, the low edge toward the lane
  const byColor = new Map();
  for (const [x, color] of units) {
    const slab = new THREE.BoxGeometry(w - 0.3, 0.05, 0.8).rotateX(-0.42).translate(x, h - 0.28, SHOPS_Z - 0.34);
    (byColor.get(color) || byColor.set(color, []).get(color)).push(slab);
  }
  for (const [color, parts] of byColor) {
    const m = new THREE.Mesh(mergeGeometries(parts), mat(color));
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  const posts = [];
  for (const [x, text, en, color] of [
    [-6.6, 'パン', 'BAKERY', '#4f6371'],
    [-0.2, 'くすり', 'PHARMACY', '#5c6d57'],
    [6.2, 'カフェ', 'CAFE', '#5d5a72'],
  ]) {
    const sign = roofSign(text, en, color);
    sign.position.set(x, h + 0.38, SHOPS_Z + 0.3);
    sign.rotation.x = -0.25;
    root.add(sign);
    posts.push([0.05, 0.3, 0.05, x - 0.4, h, SHOPS_Z + 0.35], [0.05, 0.3, 0.05, x + 0.4, h, SHOPS_Z + 0.35]);
  }
  root.add(boxes(posts, PAL.metal));
}

// the canteen behind the fountain (the map's blue roof, muted) with its terrace, and the town around
function town(root) {
  root.add(rbox(6.4, 2.0, 3.0, '#8a8f96', { x: 0, z: -8.7, seg: 1, r: 0.02 }));
  root.add(rbox(6.7, 0.14, 3.3, '#56697d', { x: 0, y: 2.0, z: -8.7, seg: 1, r: 0.02 }));
  root.add(boxes([[5.4, 0.9, 0.03, 0, 0.5, -7.19]], '#4c5a68'));
  // terrace: three umbrellas over small tables
  const poles = [],
    tops = [];
  for (const x of [-2.2, 0, 2.2]) {
    poles.push([0.035, 1.0, 0.035, x, 0, -6.4], [0.42, 0.04, 0.42, x, 0.34, -6.4], [0.06, 0.34, 0.06, x, 0, -6.4]);
    tops.push(new THREE.ConeGeometry(0.5, 0.22, 8).translate(x, 1.08, -6.4));
  }
  root.add(boxes(poles, '#8e939a'));
  const cones = new THREE.Mesh(mergeGeometries(tops), mat('#b8b2a6'));
  cones.castShadow = true;
  root.add(cones);
  blocks(root, [
    { x: -10.2, z: -7.4, w: 4.4, d: 3.6, h: 9, wall: 0, east: true }, // the head office tower, back west
    { x: -6.4, z: -8.6, w: 2.8, d: 2.6, h: 4.2, wall: 2 },
    { x: 6.8, z: -8.0, w: 3.6, d: 3.0, h: 4.6, wall: 1 },
    { x: 10.4, z: -4.8, w: 3.0, d: 3.0, h: 3.4, wall: 3, west: true },
    { x: 11.4, z: -2.1, w: 3.2, d: 1.6, h: 5.2, wall: 1, west: true }, // the first dorm block, where the lane goes
  ]);
  farTrees(root, [
    [-7.4, -2.2, 1.0],
    [-8.2, -5.0, 1.1],
    [8.2, -2.6, 0.9],
    [8.6, -6.0, 1.2],
    [-3.8, -6.9, 0.8],
    [3.9, -6.9, 0.8],
  ]);
}

export function buildPlaza() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  const nav = new Nav(-EDGE_X, EDGE_X, -5.4, LANE[1], 0.1);
  // the lane, and the plaza north of it; the corner beds and the fountain basin are not walkable
  nav.block(-EDGE_X, -4.2, -5.4, LANE[0]);
  nav.block(4.2, EDGE_X, -5.4, LANE[0]);
  nav.extra = (x, z) => Math.hypot(x - FX, z - FZ) > BASIN + 0.25;
  ground(root);
  fountain(root);
  seating(root, nav);
  planting(root);
  shops(root);
  town(root);
  return {
    root,
    scene,
    sun,
    nav,
    officeEdge: [-7.3, LZ], // where the lane leaves the frame toward the forecourt
    officeIn: [-5.4, LZ], // where he stops coming in, clear of the lane's trigger
    dormExit: [5.4, LZ],
    fountainEdge: [FX, FZ + BASIN + 0.5],
    fountain: [FX, FZ],
    edgeX: EDGE_X,
    shopsZ: SHOPS_Z,
    camera: { elev: 46, fov: 24 },
  };
}
