// One leaf of the monorail's platform-side doors (#361; Jørgen, 2026-10-09: the doors "clash visually with the rest
// of the cart"): brushed stainless like the car's skin, with a tall window in a slim dark gasket and a black rubber
// nosing on the edge that meets the other leaf. The leaves run inside the car wall's thickness and slide into pockets
// in it (train/doors.js for the play car, train/car.js for the shut doors of the closed cars).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { skyEnv } from './models.js';

export const LEAF_D = 0.03; // the leaf's thickness: it fits inside the wall (0.1) and the Blender skin (0.055)

let M = null;
const mats = () =>
  (M ??= {
    steel: new THREE.MeshStandardMaterial({
      name: 'doorSteel',
      color: '#b4bbc4',
      metalness: 0.75,
      roughness: 0.4,
      envMap: skyEnv(),
      envMapIntensity: 1,
    }),
    rubber: new THREE.MeshStandardMaterial({
      name: 'doorRubber',
      color: '#1b1e24',
      roughness: 0.85,
    }),
    glass: new THREE.MeshStandardMaterial({
      name: 'doorGlass',
      color: '#5f7892',
      roughness: 0.12,
      metalness: 0.35,
      envMap: skyEnv(),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  });

function rrect(path, x0, y0, x1, y1, r) {
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0);
  path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r);
  path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1);
  path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r);
  path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}

// A leaf w wide and h tall, its bottom at y = 0, centred on x and z. meet: which way the edge that meets the other
// leaf faces (-1 or 1); the nosing is on that edge. Every mesh is tagged doorLeaf (the doorway test skips them).
export function doorLeaf(w, h, meet) {
  const m = mats(),
    g = new THREE.Group();
  g.userData.doorLeaf = true;
  const wx0 = -w / 2 + 0.07,
    wx1 = w / 2 - 0.07,
    wy0 = 0.42,
    wy1 = h - 0.13;
  const body = rrect(new THREE.Shape(), -w / 2, 0, w / 2, h, 0.015);
  body.holes.push(rrect(new THREE.Path(), wx0, wy0, wx1, wy1, 0.035));
  const bevel = 0.003,
    depth = 0.024 - 2 * bevel;
  const add = (geo, mat, z = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = z;
    mesh.castShadow = mat !== m.glass;
    mesh.receiveShadow = true;
    mesh.userData.doorLeaf = true;
    g.add(mesh);
    return mesh;
  };
  const ext = {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 4,
  };
  add(new THREE.ExtrudeGeometry(body, ext), m.steel, -depth / 2);
  // the gasket: a slim dark ring just inside the window opening
  const ring = rrect(new THREE.Shape(), wx0 + 0.002, wy0 + 0.002, wx1 - 0.002, wy1 - 0.002, 0.033);
  ring.holes.push(rrect(new THREE.Path(), wx0 + 0.016, wy0 + 0.016, wx1 - 0.016, wy1 - 0.016, 0.022));
  const gasket = new THREE.ExtrudeGeometry(ring, {
    depth: LEAF_D - 0.004,
    bevelEnabled: false,
  }).translate(0, 0, -(LEAF_D - 0.004) / 2);
  // the nosing on the meeting edge, one mesh with the gasket
  const nose = new RoundedBoxGeometry(0.022, h, LEAF_D, 1, 0.006).translate(meet * (w / 2 - 0.011), h / 2, 0);
  add(mergeGeometries([gasket.toNonIndexed(), nose.toNonIndexed()]), m.rubber);
  const pane = add(new THREE.PlaneGeometry(wx1 - wx0 - 0.02, wy1 - wy0 - 0.02), m.glass);
  pane.position.y = (wy0 + wy1) / 2;
  pane.renderOrder = 2;
  return g;
}
