import * as THREE from 'three';

export function displayGoods(p, id, x, front, n, side) {
  const box = (c, w, h, d, dx, y, z, o = {}) => p.box(c, w, h, d, x + dx, y, front + n * z, o);
  const sphere = (c, rx, ry, rz, dx, y, z) =>
    p.geo(c, new THREE.SphereGeometry(1, 10, 6).scale(rx, ry, rz).translate(x + dx, y, front + n * z));
  const tray = (y, z) => {
    box('#8c9695', 1.04, 0.035, 0.36, 0, y, z, { surf: 'metal' });
    for (const dx of [-0.51, 0.51]) box('#b5bdb6', 0.025, 0.05, 0.36, dx, y, z, { surf: 'metal' });
  };
  if (id === 'bakery') {
    for (const [y, z] of [
      [0.84, 0.03],
      [1.21, -0.43],
    ]) {
      tray(y, z);
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 0.3;
        if (side === 0) {
          sphere('#bb8b55', 0.12, 0.085, 0.14, dx, y + 0.105, z);
          for (const off of [-0.035, 0.035]) box('#e6ca91', 0.15, 0.012, 0.014, dx, y + 0.181, z + off);
        } else {
          box('#c19964', 0.22, 0.16, 0.25, dx, y + 0.035, z);
          sphere('#d0a26a', 0.112, 0.065, 0.128, dx, y + 0.2, z);
        }
      }
      box('#ebebe0', 0.12, 0.075, 0.015, 0.39, y + 0.035, z + 0.2);
    }
    // Bread baskets sit on the lower cabinet; pale folded bags are held at its back.
    for (let i = 0; i < 4; i++) box('#e4ddc6', 0.09, 0.24, 0.04, -0.4 + i * 0.12, 1.44, -0.52);
    box('#c0b9a4', 0.64, 0.13, 0.16, -0.2, 1.43, -0.52);
    box('#879596', 0.56, 0.07, 0.08, -0.2, 1.46, -0.625, { surf: 'metal' });
  } else if (id === 'store') {
    for (const y of [0.84, 1.18, 1.51]) {
      tray(y, -0.3);
      for (let i = 0; i < 5; i++) {
        const dx = (i - 2) * 0.18,
          color = ['#a8bbb1', '#c8aaa0', '#8ca6b5', '#d3ccae', '#b1a6bd'][(i + side) % 5];
        if (side === 0) {
          box(color, 0.14, 0.23, 0.12, dx, y + 0.035, -0.3);
          box('#ecebe4', 0.11, 0.04, 0.014, dx, y + 0.14, -0.233);
        } else {
          p.geo(color, new THREE.CylinderGeometry(0.055, 0.062, 0.19, 8).translate(x + dx, y + 0.13, front - n * 0.3));
          box('#e0e7e3', 0.1, 0.055, 0.018, dx, y + 0.11, -0.235);
          box('#687c7b', 0.065, 0.032, 0.065, dx, y + 0.225, -0.3);
        }
      }
      box('#e2e8dc', 0.88, 0.045, 0.025, 0, y + 0.008, -0.09);
    }
    // Nearer low basket with packets, readable in an overhead approach.
    for (let i = 0; i < 4; i++) box(['#bbcab8', '#b4c5d0'][side], 0.2, 0.11, 0.21, (i - 1.5) * 0.24, 0.855, 0.1);
  } else {
    // A wheel and repair tools on the backboard, plus a real low parts tray.
    box('#bec7bb', 1.06, 0.79, 0.035, 0, 0.95, -0.58, { surf: 'wood' });
    const wheel = (dx, y, r) => {
      p.geo('#35454a', new THREE.TorusGeometry(r, 0.027, 6, 20).translate(x + dx, y, front - n * 0.49));
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        p.geo('#a4b2b5', new THREE.BoxGeometry(0.011, r * 2, 0.011).rotateZ(a).translate(x + dx, y, front - n * 0.48));
      }
      box('#b2bcbc', 0.07, 0.07, 0.16, dx, y - 0.035, -0.53, { surf: 'metal' });
    };
    if (side === 0) wheel(-0.05, 1.35, 0.29);
    else {
      for (let i = 0; i < 4; i++) {
        const dx = (i - 1.5) * 0.22;
        box('#87999c', 0.04, 0.35 - i * 0.045, 0.035, dx, 1.19, -0.5, { surf: 'metal' });
        box('#506d62', 0.07, 0.12, 0.055, dx, 1.11, -0.47);
        box('#adbabd', 0.11, 0.05, 0.035, dx, 1.5 - i * 0.045, -0.5, { surf: 'metal' });
      }
    }
    tray(0.84, 0.015);
    for (let i = 0; i < 3; i++) {
      box('#9eaba5', 0.25, 0.075, 0.25, (i - 1) * 0.32, 0.875, 0.015, { surf: 'metal' });
      sphere('#46565c', 0.075, 0.04, 0.075, (i - 1) * 0.32, 0.98, 0.015);
    }
  }
}
