import { faces, onFace } from './block-face.js';

// Two attached rainwater stacks, at opposite corners, with a hopper below the
// roof and a shallow catchpit at ground level. All details stay within 18 cm of
// the existing solid footprint; no loose props or extra navigation obstacles.
// The collector batches the steel with the rest of the building hardware.
export function facadeDrainage(parts, rect, height) {
  if (height < 1 || rect[1] - rect[0] < 1 || rect[3] - rect[2] < 1) return;
  const F = faces(rect);
  for (const face of [F.e, F.w]) {
    const t = 0.19;
    const steel = { surf: 'metal', cast: false };
    onFace(parts, '#717f89', face, t - 0.045, t + 0.045, 0.15, height - 0.12, 0.04, 0.13, steel);
    onFace(parts, '#586570', face, t - 0.1, t + 0.1, height - 0.3, height - 0.1, 0.01, 0.17, steel);
    for (let y = 0.45; y < height - 0.3; y += 1.45)
      onFace(parts, '#495661', face, t - 0.064, t + 0.064, y, y + 0.045, 0.025, 0.145, steel);
    onFace(parts, '#535b62', face, t - 0.14, t + 0.14, 0.008, 0.04, 0.015, 0.18, steel);
  }
}
