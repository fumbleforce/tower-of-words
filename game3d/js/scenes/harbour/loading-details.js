// Construction details of the existing supply yard, inside its original envelopes.
import * as THREE from 'three';
import { mat } from '../../props.js';

export const METAL = { surf: 'metal', opts: { roughness: 0.32, metalness: 0.55 } };
const TIMBER = { surf: 'wood', cast: false };

// A shallow closed loading recess: real side/head reveals, floor and back wall.
// It is not a new room or route; the warehouse's original blocker remains intact.
export function loadingShell(p, rect, doors, color) {
  const [x0, x1, z0, z1] = rect,
    h = 4.6,
    d = 0.3;
  p.box(color, x1 - x0, h - 0.35, d, (x0 + x1) / 2, 0.35, z0 + d / 2, METAL);
  for (const x of [x0 + d / 2, x1 - d / 2]) p.box(color, d, h - 0.35, z1 - z0, x, 0.35, (z0 + z1) / 2, METAL);
  let from = x0;
  for (const x of [...doors, x1 + 1.5]) {
    const end = x - 1.5;
    if (end > from) p.box(color, end - from, h - 0.35, d, (from + end) / 2, 0.35, z1 - d / 2, METAL);
    if (x < x1) {
      p.box(color, 3, h - 3.4, d, x, 3.4, z1 - d / 2, METAL);
      p.box('#72787b', 3, 0.08, 0.65, x, 0.35, z1 - 0.325, { surf: 'concrete' });
      p.box('#4d5458', 3, 3.05, 0.08, x, 0.43, z1 - 0.69, { surf: 'metal' });
      for (const side of [-1, 1]) p.box('#747d82', 0.05, 3.05, 0.55, x + side * 1.48, 0.35, z1 - 0.34, METAL);
    }
    from = x + 1.5;
  }
}

export function rollerDetails(p, x, z, up) {
  for (const s of [-1, 1]) {
    p.box('#657077', 0.065, 3.35, 0.12, x + s * 1.45, 0.35, z - 0.1, METAL);
    p.box('#a1a9ab', 0.02, 3.35, 0.055, x + s * 1.41, 0.35, z - 0.09, METAL);
  }
  p.box('#505b61', 2.84, 0.1, 0.1, x, Math.max(0.35, up), z - 0.15, METAL);
  if (!up) {
    p.box('#9aa3a5', 0.34, 0.065, 0.06, x, 1.05, z - 0.095, METAL);
    p.box('#424b51', 0.1, 0.12, 0.035, x, 0.82, z - 0.09, METAL);
  }
  // The jamb guards retain their old positions and gain bolted feet and a dark band.
  for (const s of [-1, 1]) {
    const bx = x + s * 1.8;
    p.box('#697076', 0.26, 0.035, 0.26, bx, 0, z + 0.25, METAL);
    p.box('#414950', 0.205, 0.15, 0.205, bx, 0.42, z + 0.25, METAL);
  }
}

export function cargo(p, [x, z, kind], i) {
  if (kind === 'pallet') {
    for (const dx of [-0.43, 0, 0.43]) p.box('#8b7659', 0.13, 0.09, 1.08, x + dx, 0, z, TIMBER);
    for (let j = 0; j < 5; j++)
      p.box(j % 2 ? '#b3a083' : '#a18e70', 1.08, 0.05, 0.19, x, 0.09, z - 0.43 + j * 0.215, TIMBER);
    const n = 1 + (i % 3);
    for (let k = 0; k < n; k++) {
      const y = 0.14 + k * 0.35;
      for (const s of [-1, 1])
        p.box(k % 2 ? '#c8bfa9' : '#b9ae95', 0.465, 0.35, 0.95, x + s * 0.24, y, z, { surf: 'cardboard' });
      p.box('#c5b797', 0.035, 0.004, 0.96, x, y + 0.35, z, { cast: false });
    }
    // Two tension straps continue down opposite sides and over the load.
    const h = n * 0.35;
    for (const dx of [-0.28, 0.28]) {
      p.box('#71807c', 0.045, 0.014, 0.972, x + dx, 0.14 + h - 0.01, z, METAL);
      for (const dz of [-0.482, 0.482]) p.box('#71807c', 0.045, h, 0.014, x + dx, 0.14, z + dz, METAL);
    }
  } else {
    for (const dx of [-0.51, 0.51]) p.box('#776449', 0.14, 0.1, 0.88, x + dx, 0, z, TIMBER);
    p.box('#847052', 1.16, 0.05, 0.85, x, 0.1, z, TIMBER);
    for (let j = 0; j < 5; j++) {
      const xx = x - 0.48 + j * 0.24;
      for (const dz of [-0.43, 0.43]) p.box(j % 2 ? '#938065' : '#a08c6d', 0.225, 0.77, 0.055, xx, 0.1, z + dz, TIMBER);
      p.box('#a18d70', 0.225, 0.055, 0.87, xx, 0.845, z, TIMBER);
    }
    for (const dx of [-0.575, 0.575])
      for (let j = 0; j < 4; j++) p.box('#8b775d', 0.055, 0.175, 0.85, x + dx, 0.11 + j * 0.19, z, TIMBER);
    for (const y of [0.17, 0.7])
      for (const dz of [-0.456, 0.456]) p.box('#74634c', 1.2, 0.08, 0.035, x, y, z + dz, TIMBER);
    for (const dx of [-0.46, 0.46])
      for (const dz of [-0.458, 0.458])
        for (const y of [0.21, 0.74]) p.box('#545a59', 0.035, 0.035, 0.012, x + dx, y, z + dz, METAL);
  }
}

export function containerHardware(p, x, z, w, d, y, h) {
  // Existing containers are oriented along x: working door face is the east end.
  const face = x + w - 0.012;
  for (const dz of [-d / 2 + 0.09, d / 2 - 0.09]) {
    p.box('#929b9c', 0.025, h - 0.12, 0.065, face, y + 0.06, z + dz, METAL);
    for (const yy of [0.15, h - 0.23]) p.box('#596369', 0.04, 0.08, 0.14, face + 0.012, y + yy, z + dz, METAL);
  }
  for (const dz of [-0.3, 0.3]) {
    p.box('#b0b5b1', 0.028, h - 0.22, 0.032, face + 0.025, y + 0.11, z + dz, METAL);
    p.box('#78817f', 0.04, 0.045, 0.2, face + 0.027, y + 0.58, z + dz + 0.07, METAL);
  }
}

// the hut's window: the shared glass (kit/materials/), reflecting the quay's sky with its horizon at the pane's
// middle (1.55 up), so the reflection runs from sky to ground across it as the camera moves
const paneOptions = {
  finish: 'glass',
  metalness: 0.78,
  roughness: 0.13,
  envK: 1.1,
  horizon: ['y', 1.55, 1.5],
  userData: { noLook: true },
};
export function hutPane(p, x, z) {
  p.geo('#b9ccd0', new THREE.PlaneGeometry(1.48, 0.78).translate(x, 1.55, z - 0.12), {
    cast: false,
    opts: paneOptions,
  });
  for (const dx of [-0.77, 0, 0.77]) p.box('#7a858a', 0.035, 0.86, 0.045, x + dx, 1.12, z - 0.085, METAL);
  for (const y of [1.1, 1.97]) p.box('#a2acad', 1.58, 0.04, 0.13, x, y, z - 0.07, METAL);
  const material = mat('#ffffff', { vertexColors: true, ...paneOptions });
  material.emissive.set('#ffd29b');
  material.emissiveIntensity = 0;
  return () => {
    material.emissiveIntensity = 0.45;
  };
}
