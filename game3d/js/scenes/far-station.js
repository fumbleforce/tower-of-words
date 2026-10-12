// The platform shed's silhouette, matching station-shed.js and tools/station/station.py.
// Platforms at 2.5 m and a curved roof at 4.75 m stand on open columns; the shed is
// not a ground-level office block. This joins the far island's existing mesh.
import * as THREE from 'three';
import { bucket, edgeBox, quad } from './skyline-geom.js';

export function farStation(target, building, local) {
  const [x0, z0, x1, z1] = building.rect;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    length = z1 - z0;
  const b = bucket(true),
    concrete = new THREE.Color('#8a8f96'),
    steel = new THREE.Color('#56697d');
  const roof = new THREE.Color(building.roof || '#56697d'),
    glass = new THREE.Color('#75959f');
  const box = (u0, u1, y0, y1, v0, v1, color) => edgeBox(b, [0, 0], [1, 0], [0, 1], u0, u1, y0, y1, v0, v1, color);
  for (const side of [-1, 1]) {
    const a = side < 0 ? -4 : 1.38,
      e = side < 0 ? -1.38 : 4;
    box(a, e, 2.05, 2.5, -length / 2, length / 2, concrete);
    box(side * 4 - 0.05, side * 4 + 0.05, 2.5, 2.65, -length / 2, length / 2, steel);
    box(side * 4.6 - 0.06, side * 4.6 + 0.06, 4.66, 4.79, -length / 2 - 0.4, length / 2 + 0.4, steel);
    for (let v = -length / 2 + 0.6; v < length / 2; v += 4.8) {
      box(side * 3.55 - 0.2, side * 3.55 + 0.2, 0, 2.05, v - 0.2, v + 0.2, concrete);
      box(side * 3.55 - 0.08, side * 3.55 + 0.08, 2.5, 4.75, v - 0.08, v + 0.08, steel);
    }
  }
  box(-1.38, 1.38, 2.05, 2.5, -length / 2, -length / 2 + 2.4, concrete);
  box(-0.42, 0.42, 1.38, 2.34, -length / 2 + 2.4, length / 2, concrete);
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8,
      e = a + Math.PI / 8;
    const p = (angle) => [Math.sin(angle) * 4.6, 4.75 + Math.cos(angle) * 0.85];
    const [u, y] = p(a),
      [v, h] = p(e),
      mid = (a + e) / 2;
    const n = new THREE.Vector3(Math.sin(mid) / 4.6, Math.cos(mid) / 0.85, 0).normalize().toArray();
    quad(
      b,
      [u, y, -length / 2 - 0.4],
      [v, h, -length / 2 - 0.4],
      [v, h, length / 2 + 0.4],
      [u, y, length / 2 + 0.4],
      n,
      roof,
    );
    quad(
      b,
      [u, y - 0.06, -length / 2 - 0.4],
      [v, h - 0.06, -length / 2 - 0.4],
      [v, h - 0.06, length / 2 + 0.4],
      [u, y - 0.06, length / 2 + 0.4],
      n.map((x) => -x),
      steel,
    );
  }
  // The sea-facing glazed windbreak leaves the undercroft open.
  quad(
    b,
    [-4, 2.65, -length / 2],
    [-4, 4.7, -length / 2],
    [-4, 4.7, length / 2],
    [-4, 2.65, length / 2],
    [-1, 0, 0],
    glass,
  );
  const origin = local([cx, cz]),
    px = local([cx + 1, cz]),
    pz = local([cx, cz + 1]);
  const ux = [px[0] - origin[0], px[1] - origin[1]],
    uz = [pz[0] - origin[0], pz[1] - origin[1]];
  for (let i = 0; i < b.pos.length; i += 3) {
    const x = b.pos[i],
      z = b.pos[i + 2],
      nx = b.nor[i],
      nz = b.nor[i + 2];
    target.pos.push(origin[0] + x * ux[0] + z * uz[0], b.pos[i + 1], origin[1] + x * ux[1] + z * uz[1]);
    target.nor.push(nx * ux[0] + nz * uz[0], b.nor[i + 1], nx * ux[1] + nz * uz[1]);
    target.col.push(...b.col.slice(i, i + 3));
  }
}
