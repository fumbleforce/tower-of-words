import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { textTexture } from '../../props.js';
import { BUILDINGS, PATHS } from '../island-layout.js';
import { signBoard } from '../plaza-buildings.js';
import { R } from './plan.js';
// Fitted waiting-room uses: the existing island paths, a leaflet ledge and luggage racks beside real seats.
function areaMap() {
  const tex = textTexture(
    (c, w, h) => {
      c.fillStyle = '#dce5de';
      c.fillRect(0, 0, w, h);
      c.save();
      c.beginPath();
      c.rect(22, 52, w - 44, h - 80);
      c.clip();
      const x = (v) => 32 + ((v + 124) / 152) * (w - 64),
        z = (v) => 64 + ((v + 112) / 126) * (h - 98);
      c.strokeStyle = '#91a8a6';
      c.fillStyle = '#b2c4ba';
      for (const path of PATHS) {
        if (path.rect) {
          const [a, b, d, e] = path.rect;
          c.fillRect(x(a), z(b), x(d) - x(a), z(e) - z(b));
        }
        if (path.line) {
          c.beginPath();
          path.line.forEach(([a, b], i) => (i ? c.lineTo(x(a), z(b)) : c.moveTo(x(a), z(b))));
          c.lineWidth = Math.max(3, (path.w || 2) * 3);
          c.stroke();
        }
      }
      c.fillStyle = '#637e84';
      for (const b of BUILDINGS) {
        if (b.rect) {
          const [a, d, e, f] = b.rect;
          c.fillRect(x(a), z(d), x(e) - x(a), z(f) - z(d));
        } else if (b.poly) {
          c.beginPath();
          b.poly.forEach(([a, d], i) => (i ? c.lineTo(x(a), z(d)) : c.moveTo(x(a), z(d))));
          c.closePath();
          c.fill();
        }
      }
      for (const [label, a, b] of [
        ['YOU ARE HERE', -112, -100],
        ['NORTH CAMPUS', -35, -54],
        ['HEAD OFFICE', -5, -16],
      ]) {
        c.fillStyle = '#35535e';
        c.beginPath();
        c.arc(x(a), z(b), 6, 0, Math.PI * 2);
        c.fill();
        c.font = 'bold 19px sans-serif';
        c.fillText(label, x(a) + 9, z(b) - 10);
      }
      c.restore();
      c.fillStyle = '#35535e';
      c.font = 'bold 26px sans-serif';
      c.fillText('HARBOUR · NORTH CAMPUS', 24, 34);
      c.font = '18px sans-serif';
      c.fillText('N ↑     Walking routes on the island', 24, h - 15);
    },
    768,
    512,
  );
  return new THREE.Mesh(new THREE.PlaneGeometry(2.68, 1.66), new THREE.MeshBasicMaterial({ map: tex }));
}
export function terminalWaiting(root) {
  const k = new Kit();
  // Broad, legible circulation stays between the two waiting groups and the service counter.
  for (const [x, z, w, d] of [
    [0.25, -5.05, 3.5, 1.2],
    [4.35, -2.1, 3.5, 1.2],
  ]) {
    k.box('#a7b8b7', w, 0.008, d, x, 0.002, z, { surf: 'rubber', cast: false, r: 0.08 });
  }
  // A shallow route/leaflet station fills the rear recess without a fictitious timetable.
  k.box('#617d86', 2.84, 1.84, 0.075, -0.25, 0.65, R.z0 + 0.06, { surf: 'metal', r: 0.02 });
  const map = areaMap();
  map.position.set(-0.25, 1.57, R.z0 + 0.108);
  root.add(map);
  k.box('#78958f', 3.8, 0.05, 0.52, -0.05, 0.72, -7.4, { surf: 'laminate', r: 0.025 });
  for (const x of [-1.72, 1.62]) k.box('#617d86', 0.06, 0.72, 0.46, x, 0, -7.4, { surf: 'metal' });
  for (const x of [-1.45, 1.25]) {
    k.box('#486671', 0.4, 0.18, 0.28, x, 0.77, -7.45, { surf: 'metal', r: 0.018 });
    for (let i = 0; i < 3; i++) {
      k.box(['#dfdfc8', '#bed5d1', '#d8e0dc'][i], 0.105, 0.15, 0.018, x - 0.12 + i * 0.12, 0.82, -7.29, {
        surf: 'card',
      });
      k.box('#6f9296', 0.08, 0.035, 0.003, x - 0.12 + i * 0.12, 0.91, -7.278, { cast: false });
    }
  }
  // Low shared reading table in front of the central bench; the route into the room branches around it.
  k.box('#87a3a2', 1.65, 0.055, 0.7, 0.25, 0.43, -3, { surf: 'laminate', r: 0.06 });
  for (const x of [-0.42, 0.92])
    for (const z of [-3.23, -2.77]) k.box('#627b85', 0.045, 0.43, 0.045, x, 0, z, { surf: 'metal' });
  for (const [x, z, angle] of [
    [-0.18, -3.05, 0.12],
    [0.58, -2.96, -0.16],
  ]) {
    k.box('#dfe5d8', 0.37, 0.015, 0.25, x, 0.488, z, { ry: angle, surf: 'card' });
    k.box('#719698', 0.12, 0.003, 0.21, x - 0.09, 0.504, z, { ry: angle, cast: false });
    for (let i = 0; i < 4; i++)
      k.box('#98aaa1', 0.13, 0.003, 0.009, x + 0.085, 0.504, z - 0.07 + i * 0.035, { ry: angle, cast: false });
  }
  // The east waiting bench has its own open luggage bay, with individually supported shelves and stops.
  for (const z of [-3.42, -0.68])
    for (const x of [6.78, 7.39]) {
      k.box('#667f87', 0.045, 1.25, 0.045, x, 0, z, { surf: 'metal' });
      k.box('#7c9298', 0.12, 0.016, 0.13, x, 0, z, { surf: 'metal' });
    }
  for (const y of [0.18, 0.67, 1.16]) {
    k.box('#829c9e', 0.73, 0.035, 2.8, 7.085, y, -2.05, { surf: 'metal' });
    k.box('#5e7781', 0.035, 0.11, 2.8, 7.46, y, -2.05, { surf: 'metal' });
  }
  const label = signBoard('にもつおき', 'LUGGAGE', 0.78, 0.2, '#567883');
  label.rotation.y = -Math.PI / 2;
  label.position.set(7.07, 1.53, -2.04);
  root.add(label);
  // A folded room-use trolley belongs to the rack, with visible wheels and grips rather than a blank box.
  for (const z of [-1.45, -1.04]) {
    k.box('#647a81', 0.038, 0.82, 0.038, 7.08, 0.23, z, { surf: 'metal' });
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.045, 12),
      new THREE.MeshStandardMaterial({ color: '#394d54', roughness: 0.9 }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(7.09, 0.105, z);
    root.add(wheel);
  }
  k.box('#799098', 0.38, 0.038, 0.48, 6.96, 0.18, -1.25, { surf: 'metal' });
  k.box('#3d5965', 0.055, 0.045, 0.46, 7.08, 1.04, -1.25, { surf: 'rubber' });
  // Coat/umbrella hooks are fitted to the existing left luggage recess, not added to the walking floor.
  k.box('#758d94', 0.035, 0.11, 1.35, R.x0 + 0.04, 1.4, -4.8, { surf: 'paint' });
  for (const z of [-5.25, -4.8, -4.35]) {
    k.box('#bdcbc8', 0.09, 0.025, 0.025, R.x0 + 0.08, 1.38, z, { surf: 'metal' });
    k.box('#bdcbc8', 0.018, 0.045, 0.025, R.x0 + 0.12, 1.38, z, { surf: 'metal' });
  }
  // Low wall protection ties service and waiting fixtures together at the height luggage actually touches.
  k.box('#a3b5b2', 0.018, 0.73, 4.7, R.x1 - 0.014, 0.12, -3.0, { surf: 'paint' });
  k.box('#849d9f', 0.045, 0.055, 4.7, R.x1 - 0.035, 0.85, -3.0, { surf: 'metal' });
  k.flush(root);
}
