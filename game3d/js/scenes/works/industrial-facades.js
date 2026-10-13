// Local construction for the old works: actual wall openings, inset glazing and steel closures.
import * as THREE from 'three';
import { faces, faceAt, onFace } from '../outdoor/block-face.js';

export const WORKS_METAL = {
  surf: 'metal',
  opts: { finish: 'painted', metalness: 0.5, roughness: 0.36 },
};
const FRAME = { ...WORKS_METAL, cast: false };

export function worksWindow(p, f, a, b, y0, y1, seed = 0) {
  const [x, z] = faceAt(f, (a + b) / 2, -0.21);
  const pane = new THREE.PlaneGeometry(b - a, y1 - y0)
    .rotateY(Math.atan2(f.n[0], f.n[1]))
    .translate(x, (y0 + y1) / 2, z);
  p.geo(seed % 3 === 0 ? '#adbfc2' : '#bacacb', pane, {
    cast: false,
    opts: { finish: 'glass', horizon: ['y', 3.6, 0.22] },
  });
  const nx = Math.max(2, Math.round((b - a) / 0.65)),
    ny = Math.max(2, Math.round((y1 - y0) / 0.7));
  for (let i = 0; i <= nx; i++) {
    const t = a + ((b - a) * i) / nx;
    onFace(p, '#536065', f, t - 0.02, t + 0.02, y0, y1, -0.19, -0.12, FRAME);
  }
  for (let j = 0; j <= ny; j++) {
    const y = y0 + ((y1 - y0) * j) / ny;
    onFace(p, '#657176', f, a - 0.025, b + 0.025, y - 0.019, y + 0.019, -0.19, -0.12, FRAME);
  }
  onFace(p, '#78858a', f, a - 0.04, b + 0.04, y1 - 0.005, y1 + 0.05, -0.245, 0.025, FRAME);
  onFace(p, '#a4aaa6', f, a - 0.045, b + 0.045, y0 - 0.075, y0 - 0.015, -0.26, 0.035, {
    surf: 'concrete',
    cast: false,
  });
}

// Holes are [along-start, along-end, bottom, top] in each face's own frame.
// Every remaining rectangle has physical depth; corrugation stops at the same openings.
export function industrialShell(
  p,
  rect,
  height,
  holes,
  { wall, surf = 'concrete', baseColor = wall, baseHeight = 0, rib, ribSides = [], bottom = 0, thickness = 0.28 },
) {
  for (const [side, f] of Object.entries(faces(rect))) {
    const cuts = holes[side] || [];
    const ys = [
      ...new Set([bottom, height, ...(baseHeight > bottom ? [baseHeight] : []), ...cuts.flatMap((h) => [h[2], h[3]])]),
    ]
      .filter((y) => y >= bottom && y <= height)
      .sort((a, b) => a - b);
    for (let j = 0; j < ys.length - 1; j++) {
      const y = (ys[j] + ys[j + 1]) / 2,
        active = cuts.filter((h) => y > h[2] && y < h[3]).sort((a, b) => a[0] - b[0]);
      let from = 0;
      for (const hole of [...active, [f.L, f.L]]) {
        if (hole[0] > from)
          onFace(p, y < baseHeight ? baseColor : wall, f, from, hole[0], ys[j], ys[j + 1], -thickness, 0, {
            surf: y < baseHeight ? 'concrete' : surf,
            ...(surf === 'metal' && y >= baseHeight ? { opts: WORKS_METAL.opts } : {}),
          });
        from = Math.max(from, hole[1]);
      }
    }
    if (!rib || !ribSides.includes(side)) continue;
    for (let t = 0.25; t < f.L; t += 0.5) {
      const active = cuts.filter((h) => t + 0.04 > h[0] && t - 0.04 < h[1]).sort((a, b) => a[2] - b[2]);
      let from = Math.max(bottom, baseHeight) + 0.05;
      for (const hole of [...active, [0, 0, height - 0.05, height]]) {
        if (hole[2] > from) onFace(p, rib, f, t - 0.04, t + 0.04, from, hole[2], 0, 0.04, FRAME);
        from = Math.max(from, hole[3]);
      }
    }
  }
}

export function doorReveals(p, f, a, b, y0, y1) {
  for (const t of [a, b]) onFace(p, '#667175', f, t - 0.035, t + 0.035, y0, y1, -0.25, 0.015, FRAME);
  onFace(p, '#707b7d', f, a - 0.035, b + 0.035, y1 - 0.045, y1 + 0.015, -0.25, 0.015, FRAME);
  onFace(p, '#999e99', f, a, b, y0 - 0.04, y0, -0.28, 0.04, {
    surf: 'concrete',
  });
}
export const wallRust = (p, f, t, y, len) =>
  onFace(p, '#9a705c', f, t - 0.035, t + 0.035, y - len, y, 0.04, 0.047, {
    cast: false,
  });
