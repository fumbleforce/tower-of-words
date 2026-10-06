// Existing game-centre crane cabinets: visible fitted machinery, no new activity.
import * as THREE from 'three';
const CASES = ['#d7d3cc', '#6e88a6', '#c58c8f'];
export function crane(p, x, z, k) {
  const c = CASES[k % CASES.length];
  p.box(c, 0.8, 0.8, 0.75, x, 0, z, { surf: 'metal' });
  p.box('#303e49', 0.7, 0.055, 0.64, x, 0.79, z);
  p.box('#8eacb5', 0.72, 0.76, 0.035, x, 0.83, z - 0.33);
  for (const u of [-0.35, 0.35]) for (const v of [-0.33, 0.33]) p.box(c, 0.045, 0.8, 0.045, x + u, 0.8, z + v);
  p.box(c, 0.82, 0.22, 0.77, x, 1.6, z, { surf: 'metal' });
  p.box('#e7eee9', 0.68, 0.065, 0.025, x, 1.68, z + 0.39);
  // Prizes rest on the cabinet bed. Their round ears and heads read through the window.
  for (let i = 0; i < 5; i++) {
    const px = x + ((i % 3) - 1) * 0.2,
      pz = z + (i < 3 ? 0.16 : -0.13);
    const tone = ['#edc97f', '#cdb9d5', '#c7d8cd'][(i + k) % 3];
    p.geo(tone, new THREE.SphereGeometry(0.095, 8, 6).scale(1, 1.15, 0.85).translate(px, 0.94, pz));
    for (const u of [-0.055, 0.055]) p.geo(tone, new THREE.SphereGeometry(0.035, 6, 4).translate(px + u, 1.04, pz));
    for (const u of [-0.03, 0.03]) p.box('#3c4952', 0.016, 0.016, 0.008, px + u, 0.96, pz + 0.08, { cast: false });
  }
  // Track, hanging cable, motor and three metal fingers over the prizes.
  p.box('#505e66', 0.66, 0.045, 0.045, x, 1.51, z);
  p.box('#505e66', 0.02, 0.22, 0.02, x + 0.09, 1.27, z + 0.04);
  p.geo('#bac6c9', new THREE.CylinderGeometry(0.055, 0.045, 0.07, 8).translate(x + 0.09, 1.26, z + 0.04));
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    p.geo(
      '#bac6c9',
      new THREE.BoxGeometry(0.014, 0.13, 0.02)
        .rotateZ(0.45)
        .rotateY(a)
        .translate(x + 0.09 + Math.cos(a) * 0.045, 1.18, z + 0.04 + Math.sin(a) * 0.045),
    );
  }
  p.box('#354650', 0.38, 0.05, 0.12, x, 0.69, z + 0.38);
  p.geo('#617888', new THREE.SphereGeometry(0.032, 8, 6).translate(x - 0.09, 0.79, z + 0.4));
  p.box('#d7b75e', 0.065, 0.015, 0.05, x + 0.09, 0.748, z + 0.4);
  p.box('#33414a', 0.35, 0.24, 0.025, x, 0.12, z + 0.38);
  p.box('#a3bcc5', 0.7, 0.76, 0.008, x, 0.83, z + 0.34, {
    cast: false,
    opts: { transparent: true, opacity: 0.14, depthWrite: false, roughness: 0.15 },
  });
}
