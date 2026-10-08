// Broad opaque leaves for the Works verge, merged into the ordinary foliage material.
import * as THREE from 'three';
import { rng } from '../outdoor/parts.js';

export function broadLeaf(at, angle, length, width, rise) {
  const outline = [
    [-0.5, 0],
    [-0.34, -0.36],
    [-0.02, -0.5],
    [0.31, -0.35],
    [0.5, 0],
    [0.27, 0.38],
    [-0.07, 0.46],
    [-0.36, 0.28],
  ];
  const vertices = [],
    c = Math.cos(angle),
    s = Math.sin(angle);
  const put = (x, y, z) => vertices.push(at.x + x * c - z * s, at.y + y, at.z + x * s + z * c);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    put(0, rise, 0);
    put(b[0] * length, 0, b[1] * width);
    put(a[0] * length, 0, a[1] * width);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Recessed branch bulk and overlapping, staggered leaves share one envelope.
export function leafMass(color, center, size, seed, count = 56) {
  const random = rng(seed),
    parts = [];
  const bulk = new THREE.IcosahedronGeometry(1, count < 30 ? 0 : 1);
  bulk.scale(size.x * 0.79, size.y * 0.79, size.z * 0.79).translate(...center.toArray());
  parts.push({ color: new THREE.Color(color).multiplyScalar(0.88), geometry: bulk });
  for (let i = 0; i < count; i++) {
    const y = -0.64 + ((i + 0.5) / count) * 1.64,
      angle = i * 2.39996 + seed + (random() - 0.5) * 0.36;
    const r = Math.sqrt(1 - y * y),
      direction = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
    const at = center.clone().add(new THREE.Vector3(direction.x * size.x, direction.y * size.y, direction.z * size.z));
    const normal = new THREE.Vector3(direction.x / size.x, direction.y / size.y, direction.z / size.z).normalize();
    const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    const length = Math.max(size.x, size.z) * (0.76 + random() * 0.18);
    const geometry = broadLeaf(
      new THREE.Vector3(),
      angle + random() * 0.9,
      length,
      length * (0.64 + random() * 0.13),
      length * 0.07,
    );
    geometry.applyQuaternion(turn).translate(...at.toArray());
    const shade = new THREE.Color(color).offsetHSL(0, 0, (random() - 0.5) * 0.065);
    parts.push({ color: shade, geometry });
  }
  return parts;
}

export function fitFoliage(parts, bounds) {
  const expanded = new THREE.Box3();
  for (const { geometry } of parts) {
    geometry.computeBoundingBox();
    expanded.union(geometry.boundingBox);
  }
  const size = expanded.getSize(new THREE.Vector3()),
    target = bounds.getSize(new THREE.Vector3());
  for (const { geometry } of parts) {
    const v = geometry.attributes.position;
    for (let i = 0; i < v.count; i++)
      v.setXYZ(
        i,
        bounds.min.x + ((v.getX(i) - expanded.min.x) / size.x) * target.x,
        bounds.min.y + ((v.getY(i) - expanded.min.y) / size.y) * target.y,
        bounds.min.z + ((v.getZ(i) - expanded.min.z) / size.z) * target.z,
      );
    geometry.computeVertexNormals();
  }
  return parts;
}
