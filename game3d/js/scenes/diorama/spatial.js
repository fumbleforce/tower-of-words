import * as THREE from 'three';

// Parts batches entire streets by surface. Split only those static batches so the
// camera and shadow frusta can reject distant geometry without removing scenery.
export function splitStreetSurfaces(root, tileSize = 8) {
  const sources = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material) || mesh.userData.noBatch) return;
    if (mesh.name === 'diorama-foliage-interior' || (!mesh.name && mesh.userData.surf)) sources.push(mesh);
  });
  let tiles = 0;
  for (const mesh of sources) {
    const geometry = mesh.geometry,
      position = geometry.attributes.position,
      index = geometry.index;
    const count = index?.count ?? position.count;
    if (count < 1800) continue;
    const bins = new Map();
    for (let i = 0; i < count; i += 3) {
      const ids = [0, 1, 2].map((j) => (index ? index.getX(i + j) : i + j));
      const x = ids.reduce((sum, id) => sum + position.getX(id), 0) / 3;
      const z = ids.reduce((sum, id) => sum + position.getZ(id), 0) / 3;
      const key = `${Math.floor(x / tileSize)}:${Math.floor(z / tileSize)}`;
      if (!bins.has(key)) bins.set(key, []);
      bins.get(key).push(...ids);
    }
    if (bins.size < 2) continue;
    for (const [key, ids] of bins) {
      const mapping = new Map(),
        vertices = [],
        compact = [];
      for (const id of ids) {
        if (!mapping.has(id)) {
          mapping.set(id, vertices.length);
          vertices.push(id);
        }
        compact.push(mapping.get(id));
      }
      const part = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const size = attribute.itemSize,
          array = new attribute.array.constructor(vertices.length * size);
        vertices.forEach((old, next) => {
          for (let j = 0; j < size; j++) array[next * size + j] = attribute.array[old * size + j];
        });
        part.setAttribute(name, new THREE.BufferAttribute(array, size, attribute.normalized));
      }
      part.setIndex(compact);
      part.computeBoundingBox();
      part.computeBoundingSphere();
      const tile = mesh.clone(false);
      tile.geometry = part;
      tile.name = `diorama-surface-${mesh.name || mesh.userData.surf}-${key}`;
      tile.userData.noBatch = true;
      mesh.parent.add(tile);
      tiles++;
    }
    mesh.removeFromParent();
    geometry.dispose();
  }
  return tiles;
}
