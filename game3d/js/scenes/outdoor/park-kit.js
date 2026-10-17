// The park kit for the outdoor kit (scenes/outdoor/): what a park, a garden or a seafront is furnished with, as the
// dorm quarter first laid them (dorm-quarter/). Each piece writes into a Parts collector (outdoor/parts.js), in the
// caller's frame; seats go in p.seats as the bench's do (outdoor/furniture.js), so people can sit on them.
//   pergola(p, rect, { h, along, wood })        posts at its corners (and between, on a long one), beams along it,
//                                                slats across; along 'x' or 'z' (the beams' way)
//   boards(p, rect, { y, along, tones })        timber decking in planks across `along`, top at y (a deck, a bridge)
//   picnicTable(p, x, z, { ry })                a timber top and two benches on A-legs, one piece
//   ringSeat(p, x, z, r)                        slats on short legs in a ring round a tree's trunk, the seat 0.28 up
//   swingFrame(p, x, z, { len })                two A-frames, the beam along x, two seats on chains
//   slide(p, x, z)                              a platform on four posts with a ladder, the chute down toward +z
//   springRider(p, x, z, color)                 a coil on a pad, a little animal seat on it
//   fitnessBars(p, x, z, { heights })           pull-up bars of rising height along x, one behind the other in z
import * as THREE from 'three';
import { STEEL, PAINTED } from './furniture.js';
import { hash2 } from './parts.js';

export const WOOD = { pale: '#9a846c', mid: '#7a654f', dark: '#6d5a47', plank: '#a08b72' };

export function pergola(p, [x0, x1, z0, z1], { h = 2.25, along = 'x', wood = WOOD, slat = 0.4 } = {}) {
  const L = along === 'x' ? x1 - x0 : z1 - z0,
    n = Math.max(1, Math.round(L / 3)); // a post every 3 or so along it
  for (let i = 0; i <= n; i++) {
    const t = 0.15 + ((L - 0.3) * i) / n;
    for (const s of [0.15, (along === 'x' ? z1 - z0 : x1 - x0) - 0.15]) {
      const [x, z] = along === 'x' ? [x0 + t, z0 + s] : [x0 + s, z0 + t];
      p.box(wood.dark, 0.14, h, 0.14, x, 0, z, { surf: 'wood' });
    }
  }
  // the beams along it, the slats across over them
  for (const s of [0.15, (along === 'x' ? z1 - z0 : x1 - x0) - 0.15])
    if (along === 'x') p.box(wood.mid, L + 0.3, 0.14, 0.12, (x0 + x1) / 2, h, z0 + s, { surf: 'wood' });
    else p.box(wood.mid, 0.12, 0.14, L + 0.3, x0 + s, h, (z0 + z1) / 2, { surf: 'wood' });
  for (let t = -0.1; t <= L + 0.11; t += slat)
    if (along === 'x') p.box(wood.pale, 0.07, 0.08, z1 - z0 + 0.5, x0 + t, h + 0.14, (z0 + z1) / 2, { surf: 'wood' });
    else p.box(wood.pale, x1 - x0 + 0.5, 0.08, 0.07, (x0 + x1) / 2, h + 0.14, z0 + t, { surf: 'wood' });
}

export function boards(p, [x0, x1, z0, z1], { y = 0.05, along = 'x', tones = [WOOD.pale, WOOD.plank], w = 0.26 } = {}) {
  if (along === 'x')
    for (let x = x0 + w / 2; x < x1; x += w)
      p.box(tones[hash2(x, z0, 3) < 0.5 ? 0 : 1], w - 0.03, 0.06, z1 - z0, x, y - 0.06, (z0 + z1) / 2, {
        surf: 'wood',
      });
  else
    for (let z = z0 + w / 2; z < z1; z += w)
      p.box(tones[hash2(z, x0, 3) < 0.5 ? 0 : 1], x1 - x0, 0.06, w - 0.03, (x0 + x1) / 2, y - 0.06, z, {
        surf: 'wood',
      });
}

export function picnicTable(p, x, z, { ry = 0 } = {}) {
  const c = Math.cos(ry),
    s = Math.sin(ry);
  const put = (color, w, h, d, u, y, v) =>
    p.box(color, w, h, d, x + u * c + v * s, y, z - u * s + v * c, { ry, surf: 'wood' });
  put(WOOD.pale, 1.4, 0.05, 0.6, 0, 0.5, 0);
  for (const v of [-0.5, 0.5]) put(WOOD.pale, 1.4, 0.04, 0.24, 0, 0.3, v);
  for (const u of [-0.55, 0.55]) put(WOOD.dark, 0.06, 0.5, 1.2, u, 0, 0);
  (p.seats ||= []).push(
    { x: x + 0.5 * s, z: z + 0.5 * c, facing: ry + Math.PI, len: 1.3 },
    { x: x - 0.5 * s, z: z - 0.5 * c, facing: ry, len: 1.3 },
  );
}

export function ringSeat(p, x, z, r, { n = 24 } = {}) {
  // slats as wide as the ring's outer edge, so no gaps show there; every other one a hair higher where they overlap
  const w = (2 * Math.PI * (r + 0.21)) / n;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.box(WOOD.pale, w, 0.05, 0.42, x + Math.cos(a) * r, 0.28 + (i % 2) * 0.004, z + Math.sin(a) * r, {
      ry: -a + Math.PI / 2,
      surf: 'wood',
    });
    if (i % 2 === 0)
      p.box(STEEL.dark, 0.06, 0.28, 0.3, x + Math.cos(a) * r, 0, z + Math.sin(a) * r, {
        ry: -a + Math.PI / 2,
        ...PAINTED,
      });
  }
  // sitters face out, round it
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    (p.seats ||= []).push({
      x: x + Math.cos(a) * (r + 0.05),
      z: z + Math.sin(a) * (r + 0.05),
      facing: Math.PI / 2 - a,
      len: 1.0,
    });
  }
}

export function swingFrame(p, x, z, { len = 2.6, color = '#4d6b8a', seat = '#c0533f' } = {}) {
  const x0 = x - len / 2,
    x1 = x + len / 2;
  for (const fx of [x0, x1])
    for (const s of [-1, 1])
      p.geo(
        color,
        new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6).rotateX(s * 0.28).translate(fx, 1.0, z + s * 0.28),
        PAINTED,
      );
  p.geo(color, new THREE.CylinderGeometry(0.05, 0.05, len, 8).rotateZ(Math.PI / 2).translate(x, 2.0, z), PAINTED);
  for (const sx of [x0 + 0.75, x1 - 0.75]) {
    for (const d of [-0.18, 0.18]) p.box(STEEL.pale, 0.015, 1.5, 0.015, sx + d, 0.48, z, { cast: false });
    p.box(seat, 0.45, 0.05, 0.2, sx, 0.46, z);
  }
}

export function slide(p, x, z, { posts = '#d9a73e', chute = '#4f8a6a' } = {}) {
  for (const [dx, dz] of [
    [-0.4, -0.4],
    [0.4, -0.4],
    [-0.4, 0.4],
    [0.4, 0.4],
  ])
    p.box(posts, 0.08, 1.5, 0.08, x + dx, 0, z + dz, PAINTED);
  p.box(WOOD.pale, 0.9, 0.06, 0.9, x, 0.95, z, { surf: 'wood' });
  p.box(posts, 0.9, 0.05, 0.05, x, 1.45, z - 0.42, PAINTED);
  for (let i = 0; i < 4; i++) p.box(STEEL.pale, 0.5, 0.04, 0.04, x, 0.22 + i * 0.22, z - 0.55, { cast: false });
  p.geo(chute, new THREE.BoxGeometry(0.6, 0.05, 1.9).rotateX(0.5).translate(x, 0.52, z + 1.22), PAINTED);
  for (const s of [-1, 1])
    p.geo(chute, new THREE.BoxGeometry(0.06, 0.18, 1.9).rotateX(0.5).translate(x + s * 0.3, 0.6, z + 1.22), PAINTED);
}

export function springRider(p, x, z, color) {
  p.geo(STEEL.mid, new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8).translate(x, 0.2, z), { cast: false });
  p.box(color, 0.22, 0.24, 0.55, x, 0.37, z, PAINTED);
  p.box(color, 0.2, 0.22, 0.18, x, 0.57, z - 0.22, PAINTED);
}

export function fitnessBars(p, x, z, { heights = [1.2, 1.55, 1.9], gap = 0.6, span = 1.1 } = {}) {
  heights.forEach((h, i) => {
    const bx = x + i * gap;
    for (const s of [-1, 1])
      p.geo(STEEL.mid, new THREE.CylinderGeometry(0.045, 0.05, h, 8).translate(bx, h / 2, z + (s * span) / 2), PAINTED);
    p.geo(
      STEEL.pale,
      new THREE.CylinderGeometry(0.025, 0.025, span, 8).rotateX(Math.PI / 2).translate(bx, h - 0.06, z),
      PAINTED,
    );
  });
}
