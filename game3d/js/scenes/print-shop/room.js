import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights, roomNav } from '../rooms/shell.js';
import { chair } from '../canteen/furniture.js';
import { signBoard } from '../plaza-buildings.js';
import { R, DOOR, SEAT, SPOTS } from './plan.js';
import { copierDetails, pressDetails, paperStock } from './details.js';
import { rbox } from '../../props.js';

export function buildPrintShop() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#344044');
  scene.add(root);
  shell(root, R, { entryDoor: true, holes: { s: [[-0.7, 0.7, 0, R.near]] }, color: '#dad5c5', top: '#82918c' });
  const nav = roomNav(R);
  k.box('#a9aca1', R.x1 - R.x0, 0.1, -R.z0, 0, -0.1, R.z0 / 2, { cast: false });
  for (let z = -0.6; z > R.z0; z -= 0.6) k.box('#a1a59a', R.x1 - R.x0, 0.003, 0.01, 0, 0, z, { cast: false });
  k.box('#3d6265', 1.35, 0.008, 0.6, 0, 0, -0.32, { surf: 'carpet', cast: false });
  // Self-service copier with paper cassette, scanner lid, real output slot and separate feed/output sheets.
  k.box('#d0d6cf', 0.93, 0.7, 0.88, -1.12, 0, -3.2, { surf: 'plastic' });
  k.box('#3e5759', 0.97, 0.08, 0.92, -1.12, 0.7, -3.2, { surf: 'metal' });
  k.box('#2d383b', 0.8, 0.06, 0.44, -1.12, 0.72, -3.25, { surf: 'glass' });
  k.box('#40585c', 0.05, 0.16, 0.65, -0.63, 0.5, -3.14, { surf: 'metal' });
  k.box('#333f41', 0.22, 0.025, 0.53, -0.55, 0.49, -3.14, { surf: 'metal' });
  k.box('#8caaa2', 0.32, 0.055, 0.2, -0.57, 0.66, -2.96, { surf: 'plastic' });
  for (const z of [-3.45, -3.02]) k.box('#869791', 0.68, 0.035, 0.025, -1.12, 0.28, z);
  copierDetails(k);
  const feed = rbox(0.28, 0.012, 0.4, '#f4f0dd'),
    output = rbox(0.28, 0.012, 0.4, '#f4f0dd');
  feed.position.set(-1.12, 0.802, -3.3);
  output.position.set(-0.64, 0.54, -3.15);
  root.add(feed, output);
  output.visible = false;
  nav.block(-1.7, -0.61, -3.72, -2.64);
  // Lit proof counter, guide rail, sample colour swatches, folders and a paper trimmer behind the public aisle.
  k.box('#425e61', 0.67, 0.69, 2.15, 1.3, 0, -5.65, { surf: 'metal' });
  k.box('#dfddc9', 0.76, 0.055, 2.22, 1.27, 0.69, -5.65, { surf: 'laminate' });
  for (const z of [-6.3, -6.0, -5.7, -5.4]) {
    k.box('#eee8d7', 0.5, 0.009, 0.24, 1.27, 0.75, z, { surf: 'paper' });
    for (let i = 0; i < 4; i++)
      k.box(['#446b79', '#b5625d', '#d5b559', '#4d5d4f'][i], 0.065, 0.004, 0.11, 1.12 + i * 0.09, 0.76, z, {
        surf: 'paper',
      });
  }
  const proofLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 1.9),
    new THREE.MeshStandardMaterial({ color: '#fff4d5', emissive: '#fff2c3', emissiveIntensity: 1.2 }),
  );
  proofLamp.position.set(1.38, 1.5, -5.65);
  root.add(proofLamp);
  k.box('#5c7471', 0.04, 0.82, 0.04, 1.55, 0.7, -6.55, { surf: 'metal' });
  k.box('#5c7471', 0.04, 0.82, 0.04, 1.55, 0.7, -4.75, { surf: 'metal' });
  nav.block(0.88, 1.74, -6.86, -4.46);
  // A compact two-drum production press, delivery stack, and labelled storage remain behind the safe work rail.
  k.box('#426869', 2.2, 0.66, 1.1, 0, 0, -8.38, { surf: 'metal' });
  for (const x of [-0.62, 0.5]) {
    k.cyl('#647c7c', 0.29, 0.29, 0.75, x, 0.8, -8.4, { rz: Math.PI / 2, surf: 'metal' });
    k.box('#263c42', 0.65, 0.13, 0.95, x, 0.9, -8.4, { surf: 'metal' });
  }
  k.box('#9baaa3', 0.82, 0.08, 0.6, 1.05, 0.56, -7.86, { surf: 'metal' });
  for (let i = 0; i < 8; i++) k.box('#e7e4d5', 0.61, 0.013, 0.43, 1.06, 0.645 + i * 0.014, -7.83, { surf: 'paper' });
  nav.block(R.x0, R.x1, R.z0, -7.72);
  pressDetails(k);
  paperStock(k);
  nav.block(-1.74, -1.08, -7.32, -4.28);
  chair(k, SEAT.x, SEAT.z, SEAT.ry);
  nav.block(SEAT.x - 0.28, SEAT.x + 0.28, SEAT.z - 0.28, SEAT.z + 0.28);
  for (const [jp, en, x, z, w] of [
    ['案内', 'ISLAND DIRECTORY', -1.62, -3.2, 1.15],
    ['校正', 'PROOF COUNTER', 1.66, -5.65, 1.8],
    ['印刷', 'PRINT WORKS', 0, R.z0 + 0.05, 2.1],
  ]) {
    const sign = signBoard(jp, en, w, 0.35, '#426869');
    sign.position.set(x, 1.74, z);
    sign.rotation.y = x < 0 ? Math.PI / 2 : x > 0 ? -Math.PI / 2 : 0;
    root.add(sign);
  }
  k.flush(root);
  const sun = roomLights(
    scene,
    root,
    { sky: '#eef1e8', ground: '#77796c', k: 1.35, key: { color: '#fff3dc', k: 1.05, at: [-3, 12, 7] } },
    R,
  );
  const hemi = scene.children.find((x) => x.isHemisphereLight);
  const period = (p) => {
    const night = p === 'evening';
    sun.intensity = night ? 0.6 : 1.05;
    hemi.intensity = night ? 1.05 : 1.35;
    hemi.color.set(night ? '#e4dac2' : '#eef1e8');
    proofLamp.material.emissiveIntensity = night ? 1.8 : 1.2;
  };
  return {
    scene,
    root,
    nav,
    sun,
    period,
    bounds: R,
    door: DOOR,
    seats: { print_seat: SEAT },
    spots: SPOTS,
    feed,
    output,
  };
}
