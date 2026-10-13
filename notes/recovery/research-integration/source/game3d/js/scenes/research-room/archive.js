import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { textTexture, JP_FONT } from '../../props.js';
import { INDEX, ARCHIVE } from './plan.js';

export function archiveArea(root) {
  const k = new Kit(),
    { x, z, w, d, top } = INDEX;
  // The index occupies a browsing table; its two entries open the real reference choices.
  k.box('#3d6279', 2.65, 0.006, 1.75, x, 0.004, z - 0.2, { surf: 'carpet', cast: false });
  k.box('#dcc398', w, 0.065, d, x, top - 0.065, z, { surf: 'laminate', r: 0.018 });
  k.box('#b59a70', w - 0.12, 0.13, 0.055, x, top - 0.19, z + d / 2 - 0.04, { surf: 'laminate' });
  for (const a of [-w / 2 + 0.12, w / 2 - 0.12])
    for (const b of [-d / 2 + 0.1, d / 2 - 0.1])
      k.box('#536366', 0.055, top - 0.065, 0.055, x + a, 0, z + b, { surf: 'metal' });
  const tex = textTexture(
    (g, width, height) => {
      g.fillStyle = '#eee7d6';
      g.fillRect(0, 0, width, height);
      g.fillStyle = '#334748';
      g.font = `600 40px ${JP_FONT}`;
      g.fillText('資料目録', 32, 57);
      g.font = '24px sans-serif';
      g.fillText('REFERENCE INDEX', 278, 54);
      g.font = `34px ${JP_FONT}`;
      g.fillText('01   観測設備', 32, 140);
      g.fillText('02   複写機', 32, 227);
      g.font = '25px sans-serif';
      g.fillText('Weather instruments', 104, 175);
      g.fillText('Copier', 104, 262);
      g.strokeStyle = '#9b947f';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(28, 92);
      g.lineTo(width - 28, 92);
      g.stroke();
    },
    640,
    300,
  );
  k.box('#4e666c', 0.77, 0.022, 0.42, x - 0.12, top + 0.004, z - 0.055, { surf: 'card', r: 0.007 });
  const index = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.36),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
  );
  index.rotation.x = -Math.PI / 2;
  index.position.set(x - 0.12, top + 0.028, z - 0.055);
  index.name = 'research-reference-index';
  root.add(index);
  for (let i = 0; i < 3; i++)
    k.box(['#a55747', '#426e91', '#d0ad57'][i], 0.35, 0.045, 0.3, x - 0.73, top + i * 0.048, z + 0.025, {
      surf: 'card',
      r: 0.004,
    });
  k.box('#b8a178', 0.16, 0.06, 0.2, x + 0.34, top, z + 0.15, { surf: 'laminate', r: 0.01 });
  for (let i = 0; i < 3; i++)
    k.box('#4c5c60', 0.012, 0.012, 0.15, x + 0.3 + i * 0.035, top + 0.061, z + 0.15, { surf: 'laminate' });
  k.cyl('#465e61', 0.11, 0.14, 0.025, x + 0.75, top, z - 0.15, { surf: 'metal' });
  k.box('#536c64', 0.025, 0.36, 0.025, x + 0.75, top + 0.025, z - 0.15, { surf: 'metal' });
  k.box('#3c6c63', 0.34, 0.07, 0.17, x + 0.75, top + 0.36, z - 0.15, { r: 0.02, surf: 'metal' });
  k.box('#efe1ad', 0.27, 0.008, 0.13, x + 0.75, top + 0.357, z - 0.15, { cast: false });
  k.flush(root);
  const cabinet = new THREE.Group();
  cabinet.name = 'research-archive-case';
  cabinet.position.x = ARCHIVE.back - 3.28;
  root.add(cabinet);
  // Closed archive boxes and standing bound issues contrast with the open working references.
  k.box('#b69a72', 1, 1.32, 0.055, 2.8, 0, 2.81, { surf: 'laminate' });
  for (const zz of [1.2, 2.8]) k.box('#b69a72', 1, 1.32, 0.055, 2.8, 0, zz, { surf: 'laminate' });
  k.box('#a68c65', 0.055, 1.32, 1.65, 3.28, 0, 2, { surf: 'laminate' });
  for (const y of [0.12, 0.68, 1.27]) k.box('#d2b98d', 1.02, 0.045, 1.66, 2.8, y, 2, { surf: 'laminate' });
  for (let i = 0; i < 4; i++) {
    const zz = 1.42 + i * 0.37;
    k.box('#b6b099', 0.69, 0.38, 0.3, 2.69, 0.17, zz, { surf: 'card', r: 0.005 });
    k.box('#e2dbc5', 0.006, 0.1, 0.2, 2.342, 0.31, zz, { surf: 'card', cast: false });
    k.box('#566266', 0.01, 0.025, 0.075, 2.334, 0.245, zz, { surf: 'metal' });
  }
  for (let i = 0; i < 10; i++) {
    const zz = 1.33 + i * 0.145;
    k.box(['#426e91', '#a55747', '#d0ad57'][i % 3], 0.52, 0.35 + (i % 2) * 0.07, 0.11, 2.63, 0.725, zz, {
      surf: 'card',
      r: 0.003,
    });
    k.box('#d8d2bd', 0.004, 0.06, 0.08, 2.368, 0.76, zz, { surf: 'card', cast: false });
  }
  k.flush(cabinet);
}
