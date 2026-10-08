// Mooring and access fittings attach to the existing concrete, not loose props.
import * as THREE from 'three';
import { along } from '../outdoor/coast.js';
import { rod } from '../outdoor/furniture.js';
import { METAL } from './loading-details.js';
const STEEL = { ...METAL, cast: false };

export function bittFoot(p, x, z) {
  p.box('#535e63', 0.43, 0.045, 0.43, x, 0.045, z, STEEL);
  for (const dx of [-0.155, 0.155])
    for (const dz of [-0.155, 0.155])
      p.geo('#9fa8a6', new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6).translate(x + dx, 0.1025, z + dz), STEEL);
}
export function fenderFixings(p, at, d, u, sea) {
  // Wall plates reach behind the rubber; exposed ears hold the mounting bolts.
  for (const y of [sea + 0.17, -0.24]) {
    along(p, '#69747a', at(u, -0.025), d, 0.7, 0.15, y, y + 0.07, STEEL);
    for (const s of [-0.31, 0.31]) along(p, '#b1b7b4', at(u + s, 0.065), d, 0.045, 0.03, y + 0.012, y + 0.057, STEEL);
  }
}
export function ladderReturns(p, [x, z], d, sea) {
  const metal = { geo: (color, g) => p.geo(color, g, STEEL) };
  const n = [-d[1], d[0]],
    at = (s, o, y) => [x + d[0] * s + n[0] * o, y, z + d[1] * s + n[1] * o];
  for (const s of [-0.22, 0.22]) {
    rod(metal, '#a0aaab', at(s, 0, 0.4), at(s, -0.31, 0.4), 0.027, STEEL);
    rod(metal, '#a0aaab', at(s, -0.31, 0.4), at(s, -0.31, 0.07), 0.027, STEEL);
    const foot = at(s, -0.31, 0);
    p.box('#5c686e', 0.14, 0.025, 0.14, foot[0], 0.045, foot[2], STEEL);
    for (const y of [sea + 0.12, -0.15]) rod(metal, '#6c797d', at(s, 0, y), at(s, -0.2, y), 0.032, STEEL);
  }
}
export function copingJoints(p, at, d, from, to) {
  for (let u = from + 1.6; u < to - 0.4; u += 1.8)
    along(p, '#858a89', at(u, -0.38), d, 0.018, 0.8, 0.045, 0.047, { cast: false });
}
export function apronDrain(p, [x0, x1, , z1]) {
  const z = z1 + 0.52;
  p.box('#565f61', x1 - x0 - 0.6, 0.012, 0.2, (x0 + x1) / 2, 0.003, z, { cast: false });
  for (let x = x0 + 0.34; x < x1 - 0.32; x += 0.16) p.box('#899493', 0.04, 0.016, 0.18, x, 0.015, z, STEEL);
  for (const dz of [-0.11, 0.11]) p.box('#b0b5b0', x1 - x0 - 0.6, 0.012, 0.025, (x0 + x1) / 2, 0.013, z + dz, STEEL);
}
