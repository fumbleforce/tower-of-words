import { terminalWaiting } from './waiting.js';
import { terminalDetails } from './details.js';
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights } from '../rooms/shell.js';
import { terminalView } from './view.js';
import { R, DOOR, SEATS, SPOTS, terminalNav } from './plan.js';

function bench(k, x, z, facing) {
  const side = Math.cos(facing);
  k.box('#4f7c82', 3.15, 0.065, 0.54, x, 0.275, z, { surf: 'plastic', r: 0.035 });
  for (const dx of [-1.15, 1.15]) {
    k.box('#64747a', 0.075, 0.275, 0.43, x + dx, 0, z, { surf: 'metal' });
    k.box('#64747a', 0.1, 0.42, 0.045, x + dx, 0.3, z - side * 0.27, { surf: 'metal' });
  }
  k.box('#5e858a', 3.15, 0.35, 0.055, x, 0.37, z - side * 0.28, { surf: 'plastic', r: 0.02 });
  for (const dx of [-1.45, 1.45]) k.box('#65777b', 0.055, 0.08, 0.56, x + dx, 0.57, z, { surf: 'metal', r: 0.02 });
}
export function buildFerryTerminal() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#6f858d');
  scene.add(root);
  shell(root, R, {
    entryDoor: true,
    holes: {
      s: [
        [-0.7, 0.7, 0, R.near],
        [R.x0 + 0.25, -0.85, 0.61, 2.08],
        [0.85, R.x1 - 0.25, 0.61, 2.08],
      ],
    },
    color: '#d9e0db',
    top: '#677d86',
  });
  const cx = (R.x0 + R.x1) / 2;
  k.box('#bfc9c7', R.x1 - R.x0, 0.1, -R.z0, cx, -0.1, R.z0 / 2);
  for (let x = R.x0; x < R.x1; x += 0.8) k.box('#b0bcba', 0.01, 0.003, -R.z0, x, 0, R.z0 / 2, { cast: false });
  for (let z = -0.8; z > R.z0; z -= 0.8) k.box('#b0bcba', R.x1 - R.x0, 0.003, 0.01, cx, 0, z, { cast: false });
  k.box('#426674', 1.5, 0.012, 0.7, 0, 0.003, -0.4, { surf: 'carpet', cast: false });
  bench(k, 4.35, -2.1, Math.PI);
  bench(k, 0.25, -5.05, 0);
  bench(k, -5.15, -5.8, 0);
  bench(k, -5.15, -2.8, Math.PI);
  // A modest service window, not a ticket shop. The shutter closes when staff are off duty.
  k.box('#718c94', 3.65, 0.6, 0.64, 4.75, 0, -6.05, { surf: 'laminate' });
  k.box('#dde2da', 3.8, 0.06, 0.72, 4.75, 0.6, -6.05, { surf: 'stone' });
  for (const x of [2.88, 6.63]) k.box('#5d7580', 0.055, 1.6, 0.06, x, 0.65, -6.08, { surf: 'metal' });
  k.box('#5d7580', 3.8, 0.07, 0.09, 4.75, 2.2, -6.08, { surf: 'metal' });
  const shutter = new THREE.Group();
  shutter.name = 'ferry-service-shutter';
  const sk = new Kit();
  for (let y = 0.71; y < 2.19; y += 0.12) sk.box('#70858b', 3.7, 0.115, 0.04, 4.75, y, -6.08, { surf: 'metal' });
  sk.flush(shutter);
  root.add(shutter);
  // Open paper slots and a small luggage shelf identify use without filling the room with stock.
  for (const z of [-5.35, -4.9, -4.45]) k.box('#71858b', 0.46, 0.025, 0.38, R.x0 + 0.27, 0.44, z, { surf: 'metal' });
  for (const y of [0.18, 0.56]) k.box('#8da1a4', 0.52, 0.035, 1.85, R.x0 + 0.29, y, -4.86, { surf: 'metal' });
  k.box('#607780', 0.43, 0.55, 0.36, 1.08, 0, -0.37, { surf: 'metal' });
  for (const x of [0.95, 1.15]) k.box('#485d65', 0.024, 0.75, 0.024, x, 0, -0.37, { surf: 'metal' });
  // Rear storage is visibly closed and does not pretend to be another playable room.
  k.box('#81979b', 1.0, 1.95, 0.035, 7.42, 0, R.z0 + 0.025, { surf: 'paint' });
  k.box('#c1ccca', 0.15, 0.035, 0.07, 7.08, 0.91, R.z0 + 0.06, { surf: 'metal' });
  const windowKit = new Kit();
  for (const [a, b] of [
    [R.x0 + 0.25, -0.85],
    [0.85, R.x1 - 0.25],
  ]) {
    windowKit.box('#d9e0db', b - a, 0.6 - R.near, 0.14, (a + b) / 2, R.near, 0.07, { surf: 'plaster', cast: false });
    for (let x = a; x <= b + 0.01; x += (b - a) / Math.ceil((b - a) / 1.4))
      windowKit.box('#627b86', 0.045, 1.47, 0.1, x, 0.61, 0.025, { surf: 'frame', cast: false });
    for (const y of [0.61, 2.08])
      windowKit.box('#627b86', b - a, 0.045, 0.1, (a + b) / 2, y, 0.025, { surf: 'frame', cast: false });
  }
  const windowGroup = new THREE.Group();
  windowKit.flush(windowGroup);
  windowGroup.traverse((o) => {
    if (o.isMesh) o.userData.noBatch = true;
  });
  windowGroup.visible = false;
  windowGroup.name = 'terminal-glazing';
  root.add(windowGroup);
  k.box('#657f86', 0.46, 0.62, 0.42, 7.28, 0, -5.23, { surf: 'metal', r: 0.025 });
  k.box('#314b55', 0.31, 0.105, 0.014, 7.28, 0.44, -5.007, { surf: 'metal' });
  k.box('#b5c7c4', 0.48, 0.035, 0.44, 7.28, 0.62, -5.23, { surf: 'metal' });
  k.flush(root);
  terminalDetails(root);
  terminalWaiting(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#e8eff0',
      ground: '#768b8b',
      k: 1.25,
      key: { color: '#f7f0de', k: 1.15, at: [-3, 11, 8] },
      lamps: [
        { at: [-4, 2.3, -4], k: 0.75, reach: 7, pool: 1.5 },
        { at: [4, 2.3, -4], k: 0.75, reach: 7, pool: 1.5 },
      ],
    },
    R,
  );
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const outside = terminalView(root);
  return {
    scene,
    root,
    sun,
    nav: terminalNav(),
    bounds: R,
    door: DOOR,
    seats: SEATS,
    spots: SPOTS,
    shutter,
    period(p) {
      outside.period(p);
      const evening = p === 'evening';
      sun.intensity = evening ? 0.4 : 1.15;
      hemi.intensity = evening ? 0.9 : 1.25;
      hemi.color.set(evening ? '#dddacb' : '#e8eff0');
    },
  };
}
