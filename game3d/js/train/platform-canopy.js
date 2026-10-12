// The occupied platform keeps its authored floor/boarding positions. Reuse the station's approved curved
// roof above it, with columns, guard rails and a wind screen fitted to that floor, rather than a second shed.
import * as THREE from 'three';
import { boxes } from '../scenes/forecourt/details.js';
import { stationMesh } from '../scenes/station-model.js';
import { mat } from '../props.js';

export function platformCanopy(station, length, edge) {
  const roof = new THREE.Group();
  roof.name = 'platform-roof';
  const model = stationMesh('sh_roof');
  if (model) {
    model.geometry = model.geometry.clone();
    const p = model.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      p.setXYZ(i, (-(z + 4.55) * length) / 38.4, y - 4.75 + 3.3, ((x + 14.65) * (edge + 3.2)) / 4);
    }
    p.needsUpdate = true;
    model.geometry.computeVertexNormals();
    model.geometry.computeBoundingBox();
    model.geometry.computeBoundingSphere();
    roof.add(model);
  } else {
    roof.add(boxes([[length + 0.6, 0.12, (edge + 3.35) * 2, 0, 3.3, 0]], '#7f8e9d'));
  }
  const steel = [],
    panels = [];
  const outer = edge + 3.2,
    columnZ = (3.55 * outer) / 4;
  for (const s of [-1, 1]) {
    for (const v of [...Array.from({ length: 8 }, (_, i) => -18.6 + 4.8 * i), 18.9]) {
      const x = (-v * length) / 38.4;
      const top = 3.3 + 0.85 * (1 - (3.55 / 4.6) ** 2) - 0.32;
      steel.push([0.16, top, 0.16, x, 0, s * columnZ], [0.32, 0.035, 0.32, x, 0, s * columnZ]);
    }
    // Rails sit on the actual outer edge, leaving the whole boarding/walking lane clear.
    for (let x = -length / 2; x <= length / 2; x += 2) steel.push([0.065, 1.1, 0.065, x, 0, s * outer]);
    for (const y of [0.45, 1.08]) steel.push([length, 0.055, 0.065, 0, y, s * outer]);
    if (s < 0) {
      panels.push([length, 0.76, 0.08, 0, 0, -outer]);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(length, 2.48, 0.025),
        mat('#adc6d2', { transparent: true, opacity: 0.28, roughness: 0.3 }),
      );
      glass.position.set(0, 2, -outer);
      station.add(glass);
      for (let x = -length / 2; x <= length / 2; x += 2) steel.push([0.055, 3.3, 0.06, x, 0, -outer]);
    }
  }
  station.add(boxes(steel, '#68727e'), boxes(panels, '#c5ced1'), roof);
  // Perspective sees the complete roof; the existing overview keeps its clear cutaway.
  roof.visible = false;
  return roof;
}
