import * as THREE from 'three';
import { faces, faceAt, onFace, tOf } from '../outdoor/block-face.js';
import { merged } from '../plaza-buildings.js';
import { sportsGlass } from './gym-facade.js';
import { arrivalGardens } from './arrival-gardens.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { sakura, keyaki } from '../outdoor/planting.js';

// r3 alone uses this shell in every source chunk. Other east-lane buildings retain
// their own construction; shared views therefore use exactly the same recesses.
export function northFront(parts, wallParts, k, wall) {
  // The frontage owns its beds and the original seed-330 trees in every chunk.
  // Translate the island planting plan into this building collector's frame once.
  const dx = k.rect[0] - k.row.rect[0],
    dz = k.rect[2] - k.row.rect[1],
    garden = {
      geo: (color, g, opts) => parts.geo(color, g.translate(dx, 0, dz), opts),
      box: (color, w, h, d, x, y, z, opts) => parts.box(color, w, h, d, x + dx, y, z + dz, opts),
      planting: parts.planting,
    };
  arrivalGardens(garden, { northStreet: true });
  for (const _ of belt(garden, [72.6, 76, -40.6, -30.2], [sakura, keyaki], {
    seed: 330,
    pitch: 3.2,
    soil: false,
    under: 0,
  }))
    void _;
  const fh = k.row.floorH,
    floors = k.row.storeys,
    panes = [],
    material = sportsGlass();
  const holes = (F, front, storey) => {
    if (storey) return [[0.3, F.L - 0.3, storey * fh + 0.55, storey * fh + 1.45]];
    if (!front) {
      const cols = Math.max(1, Math.floor(F.L / 1.7)),
        pitch = F.L / cols;
      return Array.from({ length: cols }, (_, i) => [pitch * (i + 0.5) - 0.4, pitch * (i + 0.5) + 0.4, 0.6, 1.45]);
    }
    const at = tOf(F, k.at),
      out = [[at - 0.7, at + 0.7, 0.02, 1.97]];
    for (const [a, b] of [
      [0.35, at - 1.3],
      [at + 1.3, F.L - 0.35],
    ]) {
      if (b - a < 0.6) continue;
      const count = Math.max(1, Math.round((b - a) / 1.6)),
        pitch = (b - a) / count;
      for (let i = 0; i < count; i++) out.push([a + i * pitch + 0.1, a + (i + 1) * pitch - 0.1, 0.75, 1.8]);
    }
    return out;
  };
  for (const [side, F] of Object.entries(faces(k.rect))) {
    for (let floor = 0; floor < floors; floor++) {
      const openings = holes(F, side === k.face, floor),
        bottom = floor * fh,
        top = bottom + fh;
      const ys = [...new Set([bottom, top, ...openings.flatMap((h) => [h[2], h[3]])])].sort((a, b) => a - b);
      for (let i = 0; i < ys.length - 1; i++) {
        const y = (ys[i] + ys[i + 1]) / 2,
          active = openings.filter((h) => y > h[2] && y < h[3]).sort((a, b) => a[0] - b[0]);
        let start = 0;
        for (const hole of [...active, [F.L, F.L]]) {
          if (hole[0] > start)
            onFace(wallParts, wall, F, start, hole[0], ys[i], ys[i + 1], -0.22, 0, { surf: 'cladding' });
          start = hole[1];
        }
      }
      if (!floor) continue;
      const [a, b, y0, y1] = openings[0],
        width = b - a,
        [x, z] = faceAt(F, (a + b) / 2, -0.14);
      const g = new THREE.PlaneGeometry(width, y1 - y0);
      g.rotateY(Math.atan2(F.n[0], F.n[1]));
      panes.push(g.translate(x, (y0 + y1) / 2, z));
      onFace(parts, '#afb4b2', F, a - 0.035, b + 0.035, y0 - 0.055, y0, -0.16, 0.035, { cast: false });
      const bays = Math.max(2, Math.round(width / 1.2));
      for (let i = 0; i <= bays; i++) {
        const at = a + (width * i) / bays;
        onFace(parts, '#58666a', F, at - 0.018, at + 0.018, y0, y1, -0.15, -0.1, { cast: false });
      }
    }
  }
  return {
    // The unchanged ground-floor builder supplies panes; recess them into its shell.
    pane(w, h, d, x, y, z) {
      const [x0, x1, z0, z1] = k.rect;
      if (w >= d) z += z > (z0 + z1) / 2 ? -0.16 : 0.16;
      else x += x > (x0 + x1) / 2 ? -0.16 : 0.16;
      const g = w >= d ? new THREE.PlaneGeometry(w, h) : new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2);
      panes.push(g.translate(x, y + h / 2, z));
    },
    meshes(root) {
      const mesh = merged(panes, material, { cast: false });
      mesh.name = 'sports:r3-recessed-glass';
      root.add(mesh);
    },
    evening() {
      material.emissiveIntensity = 0.36;
      material.color.set('#806d56');
    },
  };
}
