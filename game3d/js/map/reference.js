// The picked island map as the map's compare layer: the reference image rectified onto the island frame (so the
// built places and the layout can be laid over it at the same scale), and the landmark pairs that measure how far
// each built thing sits from where the reference draws it.
import { REF, TOPDOWN, fromImage, toImage, toPicture, toIsland, CHUNKS } from '../scenes/island-layout.js';

// built thing (chunk and local point) against the same thing on the reference (image px: where the straight-down
// trace puts its footprint, or the door as drawn). Anchored pairs are how a chunk is pinned, so they read 0; the
// rest are the gaps.
export const LANDMARKS = [
  {
    id: 'station',
    label: 'Station',
    chunk: 'gate',
    at: [0, 0],
    ref: [412.7, 572.4],
    anchor: true,
  },
  {
    id: 'ho_door',
    label: 'Head office door',
    chunk: 'forecourt',
    at: [12.25, -3.6],
    ref: [505, 571],
  },
  {
    id: 'tower',
    label: 'Head office tower',
    chunk: 'forecourt',
    at: [17.25, -8.4],
    ref: [545, 544],
  },
  {
    id: 'shed',
    label: 'Platform roof',
    chunk: 'forecourt',
    at: [-14.65, -4.55],
    ref: [378.4, 508.1],
  },
  {
    id: 'fountain',
    label: 'Fountain',
    chunk: 'plaza',
    at: [0, -2.7],
    ref: [715, 612],
    anchor: true,
  },
  {
    id: 'canteen',
    label: 'Canteen',
    chunk: 'plaza',
    at: [-3.74, -20.97],
    ref: [736, 534],
  },
  {
    id: 'shops',
    label: 'Shop row',
    chunk: 'plaza',
    at: [-1.89, 18.13],
    ref: [646.9, 701.3],
  },
  {
    id: 'dorm_door',
    label: 'Dorm entrance',
    chunk: 'dorm_court',
    at: [0.5, -1.2],
    ref: [953.7, 707.3],
    anchor: true,
  },
  {
    id: 'dorm_block',
    label: 'Dorm block',
    chunk: 'dorm_court',
    at: [0.4, -6.2],
    ref: [1009, 727.1],
  },
];
// the lane ends the walks crossfade between: [from chunk, its edge, to chunk, its edge]
export const SEAMS = [
  ['forecourt', [32.6, -2.1], 'plaza', [-12.2, 6.98]],
  ['plaza', [12.8, 6.98], 'dorm_court', [-5.8, 0.5]],
];

export function landmarkGaps() {
  return LANDMARKS.map((m) => {
    const built = toIsland(m.chunk, ...m.at),
      ref = fromImage(...m.ref);
    return {
      ...m,
      built,
      refAt: ref,
      units: Math.hypot(built[0] - ref[0], built[1] - ref[1]),
    };
  });
}
export function seamGaps() {
  return SEAMS.map(([a, ea, b, eb]) => {
    const p = toIsland(a, ...ea),
      q = toIsland(b, ...eb);
    return { from: a, to: b, units: Math.hypot(p[0] - q[0], p[1] - q[1]) };
  });
}

// The reference's ground on the island frame: a canvas in island units, top-left at (x0, z0), ppu pixels a unit.
// From the straight-down picture (TOPDOWN, turned onto the grid) when it loaded, else the oblique picture's ground
// plane rectified through REF (its buildings lean north over their footprints).
export function rectify(image, ppu = 4, topdown = false) {
  const [W, H] = topdown ? [image.naturalWidth, image.naturalHeight] : REF.size;
  const src = document.createElement('canvas');
  src.width = W;
  src.height = H;
  const sctx = src.getContext('2d');
  sctx.drawImage(image, 0, 0, W, H);
  const from = sctx.getImageData(0, 0, W, H).data;
  // island point -> source pixel
  const pixel = topdown
    ? (x, z) => {
        const [px, pz] = toPicture(x, z);
        return [(px - TOPDOWN.x0) * TOPDOWN.ppu, (pz - TOPDOWN.z0) * TOPDOWN.ppu];
      }
    : toImage;
  // the island rectangle the picture covers
  const corners = topdown
    ? [
        [0, 0],
        [W, 0],
        [0, H],
        [W, H],
      ].map(([i, j]) => {
        const px = TOPDOWN.x0 + i / TOPDOWN.ppu,
          pz = TOPDOWN.z0 + j / TOPDOWN.ppu,
          t = (REF.turn * Math.PI) / 180;
        return [px * Math.cos(t) + pz * Math.sin(t), -px * Math.sin(t) + pz * Math.cos(t)];
      })
    : [
        [0, 0],
        [W, 0],
        [0, H],
        [W, H],
      ].map(([u, v]) => fromImage(u, v));
  const x0 = Math.min(...corners.map((c) => c[0])),
    x1 = Math.max(...corners.map((c) => c[0]));
  const z0 = Math.min(...corners.map((c) => c[1])),
    z1 = Math.max(...corners.map((c) => c[1]));
  const out = document.createElement('canvas');
  out.width = Math.ceil((x1 - x0) * ppu);
  out.height = Math.ceil((z1 - z0) * ppu);
  const octx = out.getContext('2d');
  const img = octx.createImageData(out.width, out.height),
    to = img.data;
  for (let j = 0; j < out.height; j++) {
    const z = z0 + (j + 0.5) / ppu;
    for (let i = 0; i < out.width; i++) {
      const [u, v] = pixel(x0 + (i + 0.5) / ppu, z);
      const ui = u | 0,
        vi = v | 0;
      if (u < 0 || v < 0 || ui >= W || vi >= H) continue;
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
