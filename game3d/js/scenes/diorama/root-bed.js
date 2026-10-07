import * as THREE from 'three';

// Read the collector's already-authored low planting surface. A root on a raised
// bed must meet that surface, while a lawn tree stays at lawn height.
function groundAt(p, x, z) {
  let height = 0.015;
  for (const set of p.sets.values()) {
    if (!['soil', 'grass', 'foliage'].includes(set.surf)) continue;
    for (const geometry of set.list) {
      geometry.computeBoundingBox();
      const b = geometry.boundingBox;
      if (b.max.y > 0.65 || b.max.y - b.min.y > 0.12 || x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z)
        continue;
      height = Math.max(height, b.max.y);
    }
  }
  return height;
}

export function rootBed(p, x, z, scale, seed) {
  const y = groundAt(p, x, z),
    radius = 0.43 * scale;
  const soil = new THREE.CylinderGeometry(radius, radius * 1.04, 0.025, 12);
  soil.translate(x, y + 0.012, z);
  p.geo('#514736', soil, { cast: false, surf: 'mulch' });
  const ring = new THREE.RingGeometry(radius, radius + 0.055 * scale, 12);
  ring.rotateX(-Math.PI / 2).translate(x, y + 0.027, z);
  p.geo('#80745f', ring, { cast: false, surf: 'stone' });
  const vertices = [],
    indices = [];
  const rings = [
    [0.02, 0.19, 0.08],
    [0.13, 0.135, 0.035],
    [0.38, 0.105, 0.006],
  ];
  rings.forEach(([height, width, flare], row) => {
    for (let i = 0; i < 12; i++) {
      const angle = seed * 0.37 + (i * Math.PI) / 6;
      const ridge = Math.pow(Math.max(0, Math.cos(angle * 3 + seed)), 4);
      const radius = (width + flare * ridge) * scale;
      vertices.push(x + Math.cos(angle) * radius, y + height * scale, z + Math.sin(angle) * radius);
      if (row) {
        const a = (row - 1) * 12 + i,
          b = (row - 1) * 12 + ((i + 1) % 12);
        const c = row * 12 + i,
          d = row * 12 + ((i + 1) % 12);
        indices.push(a, c, b, b, c, d);
      }
    }
  });
  const flare = new THREE.BufferGeometry();
  flare.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  flare.setIndex(indices);
  flare.computeVertexNormals();
  p.geo('#77644b', flare, { surf: 'bark' });
  const cover = [],
    coverIndices = [];
  for (let clump = 0; clump < 6; clump++) {
    const angle = seed * 0.63 + (clump * Math.PI) / 3,
      reach = radius * (0.65 + 0.12 * Math.sin(seed + clump));
    const cx = x + Math.cos(angle) * reach,
      cz = z + Math.sin(angle) * reach;
    for (let leaf = 0; leaf < 5; leaf++) {
      const turn = angle + leaf * 2.4 + 0.25 * Math.sin(seed + leaf),
        size = (0.075 + 0.012 * Math.sin(seed * 2 + leaf + clump)) * scale,
        dx = Math.cos(turn) * size,
        dz = Math.sin(turn) * size;
      const start = cover.length / 3,
        base = y + (0.035 + leaf * 0.005) * scale,
        lx = cx + dx * 0.5,
        lz = cz + dz * 0.5;
      cover.push(
        lx - dx - dz,
        base,
        lz - dz + dx,
        lx + dx - dz,
        base + 0.025 * scale,
        lz + dz + dx,
        lx + dx + dz,
        base + 0.035 * scale,
        lz + dz - dx,
        lx - dx + dz,
        base + 0.01 * scale,
        lz - dz - dx,
      );
      coverIndices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }
  const groundcover = new THREE.BufferGeometry();
  groundcover.setAttribute('position', new THREE.Float32BufferAttribute(cover, 3));
  groundcover.setIndex(coverIndices);
  groundcover.computeVertexNormals();
  p.geo('#678740', groundcover, { cast: false, surf: 'mulch-cover' });
  // Parts normalises geometry attributes; these cards need the same leaf atlas UVs as the crowns.
  const set = [...p.sets.values()].find((set) => set.surf === 'mulch-cover');
  const cards = set.list.at(-1),
    uv = cards.attributes.uv;
  const corners = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
    [1, 1],
    [0, 1],
  ];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ...corners[i % 6]);
  return y;
}
