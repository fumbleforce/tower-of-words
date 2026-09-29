// Cheap town massing around the outdoor chunks: the island's paving continues, and plain blocks with window rows
// stand beyond the walkable area so a chunk sits in a town instead of a grey void. Everything here is merged by
// colour (a handful of draw calls per chunk), casts no shadow and is never walkable.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from '../props.js';

// the island palette for background buildings: the security room's greys, a little warmer or cooler per block
export const TOWN = {
  walls: ['#7b838d', '#8a8f96', '#72787f', '#868079'],
  roof: '#5d636c',
  window: '#4c5a68',
  band: '#a1a8b0',
  paving: '#6d6f73',
  road: '#5b5e63',
  grass: '#5f6d58',
};

function merged(parts, material) {
  const geometries = parts.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
  geometries.forEach((g) => g.dispose());
  mesh.receiveShadow = true;
  return mesh;
}

// flat ground pieces: [x0, x1, z0, z1, color], a hair above the base so they never flicker
export function groundPatches(root, patches, y = -0.018) {
  const byColor = new Map();
  for (const [x0, x1, z0, z1, color] of patches)
    (byColor.get(color) || byColor.set(color, []).get(color)).push([
      x1 - x0,
      0.01,
      z1 - z0,
      (x0 + x1) / 2,
      y,
      (z0 + z1) / 2,
    ]);
  for (const [color, parts] of byColor) root.add(merged(parts, mat(color, { roughness: 0.9 })));
}

// blocks: { x, z, w, d, h, wall (index into TOWN.walls) }. Windows go on the south face (the one the camera sees)
// and, when `east` or `west` is set, on that side too. One mesh per wall colour, one for roofs, one for windows.
// Roofs are unlit dark grey like the head office annex's, unless a `roof` material is given.
export function blocks(root, list, { roof = null } = {}) {
  const walls = new Map(),
    roofs = [],
    windows = [];
  for (const b of list) {
    const color = TOWN.walls[b.wall || 0];
    (walls.get(color) || walls.set(color, []).get(color)).push([b.w, b.h, b.d, b.x, 0, b.z]);
    roofs.push([b.w + 0.1, 0.1, b.d + 0.1, b.x, b.h, b.z]);
    const rows = Math.max(1, Math.floor((b.h - 0.6) / 0.95));
    const cols = Math.max(1, Math.floor(b.w / 0.84));
    const step = b.w / cols;
    for (let r = 0; r < rows; r++) {
      const y = 0.55 + r * 0.95;
      for (let c = 0; c < cols; c++)
        windows.push([step * 0.7, 0.55, 0.03, b.x - b.w / 2 + step * (c + 0.5), y, b.z + b.d / 2 + 0.01]);
      for (const side of [b.east && 1, b.west && -1].filter(Boolean)) {
        const n = Math.max(1, Math.floor(b.d / 0.84)),
          s = b.d / n;
        for (let c = 0; c < n; c++)
          windows.push([0.03, 0.55, s * 0.7, b.x + side * (b.w / 2 + 0.01), y, b.z - b.d / 2 + s * (c + 0.5)]);
      }
    }
  }
  for (const [color, parts] of walls) root.add(merged(parts, mat(color)));
  root.add(merged(roofs, roof || new THREE.MeshBasicMaterial({ color: TOWN.roof, toneMapped: false })));
  if (windows.length) root.add(merged(windows, mat(TOWN.window, { roughness: 0.35 })));
}

// small trees for the far distance: one merged crown mesh and one trunk mesh for the lot. items: [x, z, size]
export function farTrees(root, items, colors = ['#4d6b47', '#43603f']) {
  const trunks = [],
    crowns = colors.map(() => []);
  items.forEach(([x, z, s = 1], i) => {
    trunks.push(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.7 * s, 5).translate(x, 0.35 * s, z));
    crowns[i % colors.length].push(new THREE.IcosahedronGeometry(0.5 * s, 0).translate(x, 1.0 * s, z));
  });
  const add = (geos, color) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat(color));
    geos.forEach((g) => g.dispose());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  add(trunks, '#5d5249');
  crowns.forEach((geos, i) => add(geos, colors[i]));
}

// stone paving with its seams as one mesh (tileFloor in props.js makes a mesh per seam line, too many outdoors)
export function paving(x0, x1, z0, z1, tile, { color = '#8e8a86', seam = '#7f7b77', y = 0 } = {}) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0),
    mat(color, { roughness: 0.3, metalness: 0.04 }),
  );
  floor.position.set((x0 + x1) / 2, y - 0.05, (z0 + z1) / 2);
  floor.receiveShadow = true;
  floor.name = 'floor';
  floor.userData.surf = 'tile';
  floor.userData.tile = [x0, z0, tile];
  g.add(floor);
  const parts = [];
  for (let x = x0 + tile; x < x1 - 0.01; x += tile) parts.push([0.02, 0.004, z1 - z0, x, y, (z0 + z1) / 2]);
  for (let z = z0 + tile; z < z1 - 0.01; z += tile) parts.push([x1 - x0, 0.004, 0.02, (x0 + x1) / 2, y, z]);
  if (parts.length) {
    const seams = mat(seam, { roughness: 0.7 });
    seams.userData.noInk = true;
    const mesh = merged(parts, seams);
    mesh.userData.surf = 'grout';
    g.add(mesh);
  }
  return g;
}

// the security room's light, outdoors: cool sky, a warm low morning sun from the east, a soft fill from the camera
export function outdoorLight(scene) {
  scene.add(new THREE.HemisphereLight('#b7c1d2', '#6a625c', 1.7));
  const sun = new THREE.DirectionalLight('#ffc990', 3.2);
  sun.position.copy(new THREE.Vector3(0.8, 0.52, -0.3).normalize().multiplyScalar(30));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 5, far: 70 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe7ff', 0.6);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);
  return sun;
}
