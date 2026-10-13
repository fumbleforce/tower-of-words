// Sweep the authored beam profile through shared miter sections. Rotated, independently capped prisms leave
// triangular holes on the outside of a bend and overlapping caps on its inside.
import * as THREE from 'three';

export function curveBeam(authored, points, top, beamH) {
  authored.computeBoundingBox();
  const bounds = authored.boundingBox,
    depth = bounds.max.y - bounds.min.y,
    length = bounds.max.z - bounds.min.z,
    directions = points.slice(1).map(([x, z], i) => new THREE.Vector2(x - points[i][0], z - points[i][1]).normalize()),
    offsets = points.map((_, i) => {
      const a = directions[Math.max(0, i - 1)],
        b = directions[Math.min(i, directions.length - 1)],
        normal = new THREE.Vector2(a.y + b.y, -a.x - b.x).normalize();
      return normal.multiplyScalar(1 / Math.max(0.25, normal.dot(new THREE.Vector2(b.y, -b.x))));
    });
  return points.slice(1).map(([bx, bz], i) => {
    const [ax, az] = points[i],
      geometry = authored.clone(),
      position = geometry.attributes.position,
      indices = geometry.index?.array || Array.from({ length: position.count }, (_, j) => j),
      kept = [];
    for (let j = 0; j < indices.length; j += 3) {
      const face = [indices[j], indices[j + 1], indices[j + 2]],
        cap = (z) => face.every((k) => Math.abs(position.getZ(k) - z) < 1e-6);
      if ((i > 0 && cap(bounds.min.z)) || (i + 2 < points.length && cap(bounds.max.z))) continue;
      kept.push(...face);
    }
    geometry.setIndex(kept);
    geometry.clearGroups();
    for (let j = 0; j < position.count; j++) {
      const x = position.getX(j),
        y = position.getY(j),
        t = (position.getZ(j) - bounds.min.z) / length,
        normal = offsets[i].clone().lerp(offsets[i + 1], t);
      position.setXYZ(
        j,
        ax + (bx - ax) * t + x * normal.x,
        top + ((y - bounds.max.y) * beamH) / depth,
        az + (bz - az) * t + x * normal.y,
      );
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  });
}
