// The picked island map as the map's compare layer: the reference image rectified onto the island frame (so the
// built places and the layout can be laid over it at the same scale), and the landmark pairs that measure how far
// each built thing sits from where the reference draws it.
import { REF, fromImage, toImage, toIsland, CHUNKS } from '../scenes/island-layout.js';

// built thing (chunk and local point) against the same thing on the reference (image px). Anchored pairs are how
// a chunk is pinned, so they read 0; the rest are the gaps.
export const LANDMARKS = [
  { id: 'station', label: 'Station', chunk: 'gate', at: [0, 0], ref: [417, 571], anchor: true },
  { id: 'ho_door', label: 'Head office door', chunk: 'forecourt', at: [15.34, 2.65], ref: [505, 571] },
  { id: 'tower', label: 'Head office tower', chunk: 'forecourt', at: [20.89, 0.38], ref: [545, 544] },
  { id: 'shed', label: 'Platform roof', chunk: 'forecourt', at: [-7.5, -6.0], ref: [392, 522] },
  { id: 'fountain', label: 'Fountain', chunk: 'plaza', at: [0, -2.7], ref: [715, 612], anchor: true },
  { id: 'canteen', label: 'Canteen', chunk: 'plaza', at: [3.3, -21.8], ref: [736, 534] },
  { id: 'shops', label: 'Shop row', chunk: 'plaza', at: [0.45, 21.4], ref: [715, 705] },
  { id: 'dorm_door', label: 'Dorm entrance', chunk: 'dorm_court', at: [0.5, -1.2], ref: [955, 705], anchor: true },
  { id: 'dorm_block', label: 'Dorm block', chunk: 'dorm_court', at: [0.4, -6.2], ref: [1009, 694] },
];
// the lane ends the walks crossfade between: [from chunk, its edge, to chunk, its edge]
export const SEAMS = [
  ['forecourt', [7.3, -0.4], 'plaza', [-12.2, -1.6]],
  ['plaza', [12.8, 9.7], 'dorm_court', [-5.8, 0.5]],
];

export function landmarkGaps() {
  return LANDMARKS.map((m) => {
    const built = toIsland(m.chunk, ...m.at),
      ref = fromImage(...m.ref);
    return { ...m, built, refAt: ref, units: Math.hypot(built[0] - ref[0], built[1] - ref[1]) };
  });
}
export function seamGaps() {
  return SEAMS.map(([a, ea, b, eb]) => {
    const p = toIsland(a, ...ea),
      q = toIsland(b, ...eb);
    return { from: a, to: b, units: Math.hypot(p[0] - q[0], p[1] - q[1]) };
  });
}

// the reference's ground, rectified: a canvas in island units, top-left at (x0, z0), ppu pixels a unit
export function rectify(image, ppu = 4) {
  const [W, H] = REF.size;
  const corners = [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ].map(([u, v]) => fromImage(u, v));
  const x0 = Math.min(...corners.map((c) => c[0])),
    x1 = Math.max(...corners.map((c) => c[0]));
  const z0 = Math.min(...corners.map((c) => c[1])),
    z1 = Math.max(...corners.map((c) => c[1]));
  const src = document.createElement('canvas');
  src.width = W;
  src.height = H;
  const sctx = src.getContext('2d');
  sctx.drawImage(image, 0, 0, W, H);
  const from = sctx.getImageData(0, 0, W, H).data;
  const out = document.createElement('canvas');
  out.width = Math.ceil((x1 - x0) * ppu);
  out.height = Math.ceil((z1 - z0) * ppu);
  const octx = out.getContext('2d');
  const img = octx.createImageData(out.width, out.height),
    to = img.data;
  for (let j = 0; j < out.height; j++) {
    const z = z0 + (j + 0.5) / ppu;
    for (let i = 0; i < out.width; i++) {
      const [u, v] = toImage(x0 + (i + 0.5) / ppu, z);
      const ui = u | 0,
        vi = v | 0;
      if (ui < 0 || vi < 0 || ui >= W || vi >= H) continue;
      const s = (vi * W + ui) * 4,
        t = (j * out.width + i) * 4;
      to[t] = from[s];
      to[t + 1] = from[s + 1];
      to[t + 2] = from[s + 2];
      to[t + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return { canvas: out, x0, z0, ppu };
}

// the affine that best stands in for REF around one chunk (its Jacobian at the chunk's centre), island -> image
export function localAffine(chunk) {
  const [vx0, vx1, vz0, vz1] = CHUNKS[chunk].view;
  const [x, z] = toIsland(chunk, (vx0 + vx1) / 2, (vz0 + vz1) / 2);
  const e = 0.5,
    p = toImage(x, z),
    px = toImage(x + e, z),
    pz = toImage(x, z + e);
  const a = (px[0] - p[0]) / e,
    b = (px[1] - p[1]) / e,
    c = (pz[0] - p[0]) / e,
    d = (pz[1] - p[1]) / e;
  return [a, b, c, d, p[0] - a * x - c * z, p[1] - b * x - d * z];
}
