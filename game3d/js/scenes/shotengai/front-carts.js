// Low shop furniture facing the walking route. These sit outside the roof edge,
// so their contents remain visible from the phone overview as well as street level.
import * as THREE from 'three';
export const CARTS = [
  { id: 'bakery', bay: 10, dx: -1.72, width: 0.68, depth: 0.64, dz: 0.7 },
  { id: 'store', bay: 7, dx: -1.95, width: 0.46, depth: 0.56, dz: 0.72 },
];
export function frontCarts(p, mid, front) {
  return CARTS.map(({ id, bay, dx, width, depth, dz }) => {
    const x = mid(bay) + dx,
      z = front + dz,
      c = id === 'bakery' ? '#9aa8a0' : '#647e83';
    for (const u of [-width / 2 + 0.075, width / 2 - 0.075])
      for (const v of [-depth / 2 + 0.06, depth / 2 - 0.06]) {
        p.geo(
          '#34434a',
          new THREE.CylinderGeometry(0.055, 0.055, 0.035, 8).rotateZ(Math.PI / 2).translate(x + u, 0.055, z + v),
        );
        p.box('#768489', 0.035, 0.55, 0.035, x + u, 0.1, z + v, { surf: 'metal' });
      }
    for (const y of [0.2, 0.66]) p.box(c, width, 0.05, depth, x, y, z, { surf: 'metal' });
    if (id === 'bakery') {
      p.box('#d1c9b1', width - 0.07, 0.045, depth - 0.07, x, 0.71, z, { surf: 'wood' });
      for (let i = 0; i < 6; i++) {
        const xx = x + ((i % 2) - 0.5) * 0.25,
          zz = z + (Math.floor(i / 2) - 1) * 0.17;
        p.geo('#c39763', new THREE.SphereGeometry(1, 10, 6).scale(0.1, 0.07, 0.075).translate(xx, 0.82, zz));
        p.box('#e4c995', 0.12, 0.008, 0.012, xx, 0.887, zz);
      }
      // A closed, shallow glass case; front and lid show the bread in both lenses.
      const glass = { cast: false, opts: { transparent: true, opacity: 0.15, depthWrite: false, roughness: 0.18 } };
      p.box('#bfd6d7', width, 0.012, depth, x, 0.99, z, glass);
      for (const v of [-depth / 2, depth / 2]) p.box('#bfd6d7', width, 0.28, 0.012, x, 0.71, z + v, glass);
      for (const u of [-width / 2, width / 2]) {
        p.box('#bfd6d7', 0.012, 0.28, depth, x + u, 0.71, z, glass);
        for (const v of [-depth / 2, depth / 2]) p.box(c, 0.02, 0.28, 0.02, x + u, 0.71, z + v, { surf: 'metal' });
      }
      p.box('#ded8c7', width - 0.1, 0.25, depth - 0.12, x, 0.26, z, { surf: 'wood' });
    } else {
      // Stacked crates of bottled drinks, with dividers rather than a flat coloured block.
      for (const y of [0.25, 0.71]) {
        p.box('#a9bcb1', width - 0.08, 0.04, depth - 0.07, x, y, z);
        for (const u of [-width / 2 + 0.04, width / 2 - 0.04])
          p.box(c, 0.045, 0.16, depth - 0.03, x + u, y, z, { surf: 'plastic' });
        for (const v of [-depth / 2 + 0.035, depth / 2 - 0.035])
          p.box(c, width - 0.05, 0.1, 0.025, x, y, z + v, { surf: 'plastic' });
        for (let i = 0; i < 6; i++) {
          const xx = x + ((i % 2) - 0.5) * 0.2,
            zz = z + (Math.floor(i / 2) - 1) * 0.17;
          p.geo(
            ['#8aab96', '#a6b9c3'][i % 2],
            new THREE.CylinderGeometry(0.055, 0.06, 0.21, 8).translate(xx, y + 0.15, zz),
          );
          p.box('#ebede0', 0.07, 0.023, 0.07, xx, y + 0.25, zz);
        }
      }
    }
    return [x - width / 2 - 0.02, z - depth / 2 - 0.02, x + width / 2 + 0.02, z + depth / 2 + 0.02];
  });
}
