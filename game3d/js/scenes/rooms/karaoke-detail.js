import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';

const C = { dark: '#2a2630', trim: '#8b919b', pale: '#c6c0cd' };
const metal = { surf: 'metal' },
  laminate = { surf: 'laminate' };

export function drinkDispenser(k, x, z, color) {
  // The lower front is open: the cup fits between side cheeks, under the nozzle.
  k.box('#e6e6e1', 0.42, 0.23, 0.36, x, 0.77, z, { r: 0.015, surf: 'plastic' });
  k.box('#b5b2bb', 0.42, 0.32, 0.055, x, 0.45, z - 0.152, metal);
  for (const dx of [-0.183, 0.183]) k.box('#e6e6e1', 0.054, 0.32, 0.36, x + dx, 0.45, z, { surf: 'plastic' });
  k.box(color, 0.36, 0.13, 0.012, x, 0.81, z + 0.184, { surf: 'plastic' });
  k.box(C.dark, 0.31, 0.023, 0.32, x, 0.45, z + 0.04, metal);
  for (let dx = -0.12; dx < 0.13; dx += 0.04) k.box(C.trim, 0.012, 0.006, 0.19, x + dx, 0.473, z + 0.085, metal);
  k.cyl(C.trim, 0.026, 0.026, 0.035, x, 0.735, z + 0.07, { seg: 12, surf: 'metal' });
  k.cyl(C.dark, 0.014, 0.014, 0.017, x, 0.718, z + 0.07, { seg: 10 });
  k.box(C.pale, 0.07, 0.04, 0.015, x, 0.785, z + 0.192, metal);
  for (const dx of [-0.04, 0, 0.04]) k.box('#d8d3dc', 0.025, 0.008, 0.014, x + dx, 0.958, z + 0.18);
}

function basketRim(k, x, y, z, w, d) {
  for (const dx of [-w / 2, w / 2]) k.box('#555564', 0.012, 0.025, d, x + dx, y, z, { surf: 'plastic' });
  for (const dz of [-d / 2, d / 2]) k.box('#555564', w, 0.025, 0.012, x, y, z + dz, { surf: 'plastic' });
}

export function karaokeDeskDetail(k, R, S) {
  for (const x of [R.x0 + 0.02, R.x1 - 0.02]) {
    k.box('#706577', 0.04, 0.08, 4.4, x, 0, -2.2, laminate);
    k.box('#bbb3c5', 0.04, 0.045, 4.4, x, 1.39, -2.2, laminate);
  }
  k.box('#706577', 7.2, 0.08, 0.04, 0, 0, R.z0 + 0.02, laminate);
  k.box('#bbb3c5', 7.2, 0.045, 0.04, 0, 1.39, R.z0 + 0.02, laminate);
  // Reception front and staff-side cabinet doors stay within the blocked desk footprint.
  for (const z of [-2.91, -2.15, -1.39]) {
    k.box('#7d6994', 0.018, 0.29, 0.72, 2.491, 0.065, z, laminate);
    k.box('#716681', 0.018, 0.35, 0.72, 3.009, 0.065, z, laminate);
    k.box(C.trim, 0.03, 0.016, 0.17, 3.02, 0.35, z, metal);
  }
  k.box(C.dark, 0.022, 0.055, 2.28, 2.491, 0.005, -2.15, laminate);
  k.box(C.trim, 0.018, 0.025, 2.36, 2.452, 0.465, -2.15, metal);
  for (const z of [-1.95, -1.5]) basketRim(k, 2.7, 0.55, z, 0.24, 0.18);
  k.cyl('#c9c4b6', 0.021, 0.031, 0.018, 2.63, 0.525, -1.2, { seg: 12, surf: 'metal' });
  k.cyl(C.dark, 0.007, 0.009, 0.012, 2.63, 0.543, -1.2, { seg: 8 });
  // Drinks cupboard divisions, pulls and a washable back panel behind the machines.
  for (const x of [-0.12, 0.43, 0.98, 1.53]) {
    k.box('#b5afbf', 0.525, 0.32, 0.02, x, 0.06, -3.89, laminate);
    k.box(C.dark, 0.17, 0.016, 0.025, x, 0.33, -3.875, metal);
  }
  k.box(C.dark, 2.16, 0.045, 0.02, 0.7, 0.008, -3.893);
  k.box('#c6c0cd', 2.22, 0.57, 0.025, 0.7, 0.45, -4.365, metal);
  for (const x of [-0.1, 0.5, 1.1]) k.box(C.trim, 0.012, 0.54, 0.012, x, 0.465, -4.347, metal);
  // Dark inset tops clear the existing glass caps; a thin rim leaves the open mouth readable.
  for (const x of [1.55, 1.64]) k.cyl('#637384', 0.031, 0.031, 0.005, x, 0.648, -4.13, { seg: 10 });
  // The ice bin is shut, with a hinged lid and a short lifting handle.
  k.box('#a6a7b2', 0.22, 0.13, 0.14, 1.58, 0.45, -4.28, metal);
  k.box('#c6c0cd', 0.23, 0.018, 0.15, 1.58, 0.58, -4.28, metal);
  k.box(C.dark, 0.09, 0.02, 0.024, 1.58, 0.598, -4.27, { surf: 'plastic' });
  // Waiting bench plinth, cushion seams and the catalogue cabinet's front joinery.
  k.box(C.dark, 0.018, 0.06, 1.17, -3.213, 0.012, -2, laminate);
  for (const z of [-2.2, -1.8]) k.box('#a65375', 0.31, 0.004, 0.012, -3.4, 0.218, z, { surf: 'fabric' });
  k.box('#544b61', 0.02, 0.37, 0.27, -2.69, 0.06, -0.9, laminate);
  k.box(C.trim, 0.025, 0.02, 0.09, -2.675, 0.37, -0.9, metal);
  k.box(C.dark, 0.36, 0.035, 0.28, -2.9, 0.008, -0.9, laminate);
  // Metal nosings follow the actual treads; rail endpoints meet three floor-mounted posts.
  for (let i = 0; i < 7; i++) k.box(C.trim, 1.05, 0.009, 0.025, -3.05, 0.12 * (i + 1), S.z1 - i * 0.28 - 0.015, metal);
  const a = new THREE.Vector3(S.x1 + 0.03, 0.55, S.z1 - 0.05);
  const b = new THREE.Vector3(S.x1 + 0.03, 1.2, S.z0 + 0.35);
  const direction = b.clone().sub(a),
    midpoint = a.clone().add(b).multiplyScalar(0.5);
  k.add(
    C.trim,
    new THREE.CylinderGeometry(0.018, 0.018, direction.length(), 10)
      .applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      )
      .translate(...midpoint.toArray()),
    metal,
  );
  for (const t of [0, 0.5, 1]) {
    const p = a.clone().lerp(b, t);
    k.box(C.trim, 0.028, p.y, 0.028, p.x, 0, p.z, metal);
    k.box(C.dark, 0.07, 0.015, 0.07, p.x, 0, p.z, metal);
  }
}

export function boothBench(k, x0, x1, z0, z1) {
  const alongZ = z1 - z0 > x1 - x0,
    length = alongZ ? z1 - z0 : x1 - x0;
  k.box('#4a3448', x1 - x0, 0.09, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, laminate);
  const count = Math.ceil(length / 0.65),
    span = length / count;
  for (let i = 0; i < count; i++)
    k.box(
      '#8b3f63',
      alongZ ? x1 - x0 : span - 0.012,
      0.11,
      alongZ ? span - 0.012 : z1 - z0,
      alongZ ? (x0 + x1) / 2 : x0 + (i + 0.5) * span,
      0.09,
      alongZ ? z0 + (i + 0.5) * span : (z0 + z1) / 2,
      { r: 0.025, surf: 'fabric' },
    );
}

export function karaokeBoothDetail(k, R, root) {
  // Shallow acoustic fabric panels sit above the bench backs, clear of the door and screen.
  for (const z of [-2.58, -1.65, -0.72]) {
    k.box('#655774', 0.035, 0.59, 0.79, -2.3825, 0.57, z, { surf: 'fabric' });
    k.box('#8b7997', 0.018, 0.018, 0.79, -2.36, 0.57, z, laminate);
  }
  for (const z of [-2.63, -0.65]) k.box('#655774', 0.035, 0.59, 0.61, 2.3825, 0.57, z, { surf: 'fabric' });
  k.box('#71637f', 4.7, 0.035, 0.025, 0, 1.33, -3.5875, laminate);
  for (const x of [-2.3875, 2.3875]) k.box('#71637f', 0.025, 0.035, 3.55, x, 1.33, -1.775, laminate);
  // Separate upholstery panels retain the authored seat tops and usable seating footprints.
  for (const z of [-2.39, -1.79, -1.19, -0.59])
    k.box('#a25b7b', 0.012, 0.34, 0.009, -2.254, 0.045, z, { surf: 'fabric' });
  k.box('#7b3656', 2.55, 0.16, 0.08, -0.625, 0.2, -0.045, { r: 0.015, surf: 'fabric' });
  // AV cupboard doors, pulls and ventilated amplifier face below the television.
  for (const x of [-0.69, 0.69]) {
    k.box('#51475f', 0.55, 0.24, 0.024, x, 0.055, -3.168, laminate);
    k.box(C.trim, 0.14, 0.015, 0.028, x, 0.25, -3.151, metal);
  }
  k.box('#34313e', 0.68, 0.21, 0.025, 0, 0.08, -3.168, metal);
  for (let x = -0.25; x < 0.2; x += 0.055) k.box('#83808f', 0.019, 0.11, 0.01, x, 0.14, -3.15, metal);
  k.cyl('#b9b1c5', 0.035, 0.035, 0.012, 0.23, 0.17, -3.143, { seg: 12, rx: Math.PI / 2, surf: 'metal' });
  for (const x of [-1.25, 1.25]) {
    k.box('#5b5267', 0.255, 0.46, 0.016, x, 0.03, -3.24, { surf: 'fabric' });
    for (const [y, r] of [
      [0.17, 0.076],
      [0.37, 0.035],
    ])
      k.add('#a098af', new THREE.TorusGeometry(r, 0.005, 4, 16).translate(x, y, -3.226), metal);
    for (const y of [0.035, 0.478])
      for (const dx of [-0.106, 0.106]) k.box(C.trim, 0.009, 0.009, 0.005, x + dx, y, -3.228, metal);
  }
  // The table remains at its exact action height; lighter edging and a plinth separate its surfaces.
  k.box('#82718d', 1.45, 0.02, 0.012, -0.5, 0.524, -1.473, laminate);
  for (const x of [-1.226, 0.226]) k.box('#82718d', 0.012, 0.02, 0.84, x, 0.524, -1.9, laminate);
  k.box('#55465e', 1.37, 0.055, 0.012, -0.5, 0.025, -1.495, laminate);
  basketRim(k, -1.05, 0.6, -2, 0.28, 0.16);
  for (const x of [0.08, -1.12]) k.cyl('#535265', 0.027, 0.027, 0.005, x, 0.648, -1.7, { seg: 10 });
  // Door jambs live on the opening's edges, leaving the full route clear.
  const frame = new Kit(),
    group = new THREE.Group();
  for (const z of [-2.115, -1.285]) frame.box('#90839d', 0.048, 1.21, 0.026, R.x1 - 0.025, 0, z, laminate);
  frame.box('#90839d', 0.048, 0.04, 0.85, R.x1 - 0.025, 1.2, -1.7, laminate);
  frame.flush(group);
  group.traverse((o) => {
    o.userData.noOutline = true;
  });
  root.add(group);
}
