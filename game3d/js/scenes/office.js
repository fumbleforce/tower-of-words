// Place 3: the office floor seen from above with cutaway walls (game3d/ref/3-office.png), in the muted
// palette of the lobby. Local space: floor y = 0, the lift at the bottom centre (+z, near the camera).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  PAL,
  mat,
  emissive,
  rbox,
  plant,
  wall,
  tileFloor,
  door,
  desk,
  officeChair,
  filingCabinet,
  shelf,
  pinboard,
  clock,
  textTexture,
  plane,
  JP_FONT,
  sh,
  monitor,
  bench,
  wallLamp,
} from '../props.js';
import { PEOPLE, sit, armsHold, idle, mug } from '../cast.js';
import { cat } from '../train/people.js';
import { blob, Nav } from '../engine.js';
import { lightPool, steam, dust, clockHands, screenMat, groundShadows } from '../places/life.js';
import { ledLights } from './office-leds.js';
import { liveScreens } from '../props.js';
import { drain } from '../perf/slice.js';

export const K = 1.18; // people scale in the office and lobby
const WH = 1.45,
  T = 0.16;
export const X0 = -7,
  X1 = 7,
  Z0 = -6.4,
  Z1 = 6.4;
export const CN = 0.2,
  CS = 2.4; // corridor north and south wall lines

function toiletSign(kind) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = kind === 'm' ? '#4f6f9a' : '#9a5a64';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2f2f2';
      g.beginPath();
      g.arc(W / 2, 38, 18, 0, Math.PI * 2);
      g.fill();
      if (kind === 'm') g.fillRect(W / 2 - 20, 62, 40, 70);
      else {
        g.beginPath();
        g.moveTo(W / 2, 60);
        g.lineTo(W / 2 + 34, 132);
        g.lineTo(W / 2 - 34, 132);
        g.fill();
      }
      g.fillRect(W / 2 - 16, 130, 12, 44);
      g.fillRect(W / 2 + 4, 130, 12, 44);
    },
    128,
    190,
  );
  return plane(0.26, 0.38, tex);
}
function nameCard(name, ro) {
  // printed katakana, the English added by hand in blue pen
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#f4f2ec';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#2b3140';
      g.font = '700 80px ' + JP_FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(name, W / 2, H * 0.38);
      g.save();
      g.translate(W / 2 + 6, H * 0.8);
      g.rotate(-0.06);
      g.fillStyle = '#2f4f9a';
      g.font = 'italic 600 54px "Comic Neue", "Segoe Print", cursive, sans-serif';
      g.fillText(ro, 0, 0);
      g.restore();
    },
    320,
    170,
  );
  const g = new THREE.Group();
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.16),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
  );
  p.rotation.x = -0.9;
  p.position.y = 0.07;
  g.add(p);
  const back = rbox(0.3, 0.02, 0.12, '#d8d6d0', { r: 0.005 });
  back.rotation.x = -0.9 + Math.PI / 2;
  back.position.set(0, 0.06, -0.035);
  g.add(back);
  return g;
}
function vending(lit) {
  const g = new THREE.Group();
  g.add(rbox(0.82, 1.3, 0.62, lit ? '#3b4458' : '#2e3139', { r: 0.03 }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.72),
    lit ? emissive('#b9d6ff', '#7fb2ff', 0.9) : mat('#20242b', { roughness: 0.4 }),
  );
  face.position.set(-0.06, 0.8, 0.312);
  g.add(face);
  const cols = ['#e46a5a', '#f0b64a', '#5aa35d', '#4e8fd1', '#c77ab8', '#f2e2b0'];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      g.add(
        rbox(0.09, 0.12, 0.03, cols[(r * 4 + c + (lit ? 0 : 2)) % 6], {
          x: -0.28 + c * 0.145,
          y: 0.5 + r * 0.16,
          z: 0.32,
          r: 0.02,
          cast: false,
        }),
      );
  g.add(rbox(0.12, 0.28, 0.03, '#15181d', { x: 0.3, y: 0.66, z: 0.32, r: 0.01, cast: false }));
  g.add(rbox(0.5, 0.12, 0.03, '#15181d', { x: -0.06, y: 0.14, z: 0.32, r: 0.02, cast: false }));
  return g;
}
function copier() {
  const g = new THREE.Group();
  g.add(rbox(0.72, 0.62, 0.62, '#dadcd8', { r: 0.03 }));
  g.add(rbox(0.72, 0.16, 0.6, '#c4c7c3', { y: 0.62, r: 0.03 }));
  g.add(rbox(0.4, 0.03, 0.32, '#3a3f48', { x: 0.1, y: 0.78, r: 0.01 }));
  g.add(rbox(0.26, 0.06, 0.2, PAL.paper, { x: -0.44, y: 0.5, r: 0.01 }));
  for (let i = 0; i < 3; i++)
    g.add(rbox(0.6, 0.012, 0.01, '#9a9ea5', { y: 0.12 + i * 0.16, z: 0.313, r: 0.004, cast: false }));
  g.add(rbox(0.14, 0.05, 0.08, '#5ec28b', { x: 0.24, y: 0.78, z: 0.2, r: 0.01, cast: false }));
  return g;
}
function kitchen() {
  const g = new THREE.Group();
  // counter along the back wall, cupboards above, sink, microwave, coffee maker; fridge at the end
  g.add(rbox(3.0, 0.5, 0.56, '#9ea4ad', { r: 0.02 }));
  g.add(rbox(3.04, 0.04, 0.6, '#d9dad6', { y: 0.5, r: 0.012 }));
  for (let i = 0; i < 5; i++)
    g.add(rbox(0.54, 0.4, 0.01, '#aab0b8', { x: -1.2 + i * 0.6, y: 0.05, z: 0.283, r: 0.006, cast: false }));
  g.add(rbox(3.0, 0.34, 0.34, '#c9ccd0', { y: 0.92, z: -0.12, r: 0.02 }));
  g.add(rbox(0.5, 0.02, 0.36, '#8d939b', { x: -0.9, y: 0.54, r: 0.01, cast: false }));
  g.add(rbox(0.46, 0.26, 0.34, '#e8e8e4', { x: 0.35, y: 0.54, r: 0.03 }));
  g.add(rbox(0.28, 0.18, 0.02, '#2b2f37', { x: 0.3, y: 0.58, z: 0.172, r: 0.01, cast: false }));
  g.add(rbox(0.22, 0.34, 0.26, '#2c3038', { x: 0.95, y: 0.54, r: 0.03 }));
  g.add(rbox(0.1, 0.1, 0.1, '#3e444e', { x: 0.95, y: 0.6, z: 0.1, r: 0.02 }));
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 0.2, 12),
    mat('#d4d6d8', { roughness: 0.35, metalness: 0.3 }),
  );
  pot.position.set(1.28, 0.64, 0);
  g.add(sh(pot));
  const f = rbox(0.62, 1.1, 0.56, '#dfe0dd', { x: 1.95, r: 0.03 });
  g.add(f);
  g.add(rbox(0.03, 0.3, 0.03, '#a4a8ae', { x: 1.72, y: 0.62, z: 0.29, r: 0.01, cast: false }));
  g.add(rbox(0.6, 0.012, 0.01, '#c3c5c3', { x: 1.95, y: 0.7, z: 0.282, r: 0.004, cast: false }));
  return g;
}
function tableSet() {
  const g = new THREE.Group();
  g.add(rbox(1.5, 0.04, 0.82, '#e3e3df', { y: 0.4, r: 0.012 }));
  for (const [x, z] of [
    [-0.68, -0.34],
    [0.68, -0.34],
    [-0.68, 0.34],
    [0.68, 0.34],
  ])
    g.add(rbox(0.05, 0.4, 0.05, PAL.deskLeg, { x, z, r: 0.01 }));
  for (const [x, z, ry] of [
    [-0.38, -0.66, 0],
    [0.38, -0.66, 0],
    [-0.38, 0.66, Math.PI],
    [0.38, 0.66, Math.PI],
  ]) {
    const c = new THREE.Group();
    c.add(rbox(0.36, 0.05, 0.34, PAL.chair, { y: 0.24, r: 0.02 }));
    c.add(rbox(0.34, 0.3, 0.05, PAL.chair, { y: 0.28, z: -0.16, r: 0.02 }));
    for (const [lx, lz] of [
      [-0.14, -0.13],
      [0.14, -0.13],
      [-0.14, 0.13],
      [0.14, 0.13],
    ])
      c.add(rbox(0.03, 0.24, 0.03, PAL.deskLeg, { x: lx, z: lz, r: 0.008 }));
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    g.add(c);
  }
  const m = mug();
  m.position.set(-0.45, 0.46, 0.1);
  g.add(m);
  g.add(rbox(0.26, 0.015, 0.2, PAL.paper, { x: 0.35, y: 0.42, z: 0.05, r: 0.004 }));
  const pl = plant({ size: 0.45, seed: 8 });
  pl.position.set(0, 0.42, -0.1);
  g.add(pl);
  return g;
}
function sink() {
  const g = new THREE.Group();
  g.add(rbox(0.5, 0.06, 0.36, '#e9eaea', { y: 0.46, r: 0.03 }));
  g.add(rbox(0.12, 0.46, 0.12, '#dcdddd', { r: 0.02 }));
  g.add(rbox(0.04, 0.1, 0.1, '#b9bcc0', { y: 0.52, z: -0.12, r: 0.01 }));
  return g;
}
function toilet() {
  const g = new THREE.Group();
  g.add(rbox(0.3, 0.3, 0.36, '#eeefee', { r: 0.06 }));
  g.add(rbox(0.34, 0.34, 0.14, '#eeefee', { z: -0.2, y: 0.05, r: 0.04 }));
  return g;
}
function mirror() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), mat('#b7c8d4', { roughness: 0.15, metalness: 0.2 }));
  m.receiveShadow = true;
  return m;
}
function ceilingLamp(w = 0.9) {
  const g = new THREE.Group();
  g.visible = false; // Jørgen: don't show the fixtures, keep their light
  g.add(rbox(w + 0.06, 0.07, 0.07, PAL.trim, { r: 0.02, cast: false }));
  g.add(
    rbox(w, 0.04, 0.06, null, { y: 0.015, z: 0.012, r: 0.015, m: emissive('#fff3dc', '#ffe6b8', 2.2), cast: false }),
  );
  return g;
}

// ---------- more office parts ----------
function plate(text, { w = 0.5, h = 0.16, bg = '#e9ebee', fg = '#2b3140', sub = '' } = {}) {
  // Japanese on top, the English under it (signs the player hasn't been taught carry both)
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (!sub) {
        g.font = '700 ' + Math.round(H * 0.62) + 'px ' + JP_FONT;
        g.fillText(text, W / 2, H / 2 + 3);
        return;
      }
      g.font = '700 ' + Math.round(H * 0.42) + 'px ' + JP_FONT;
      g.fillText(text, W / 2, H * 0.34);
      g.globalAlpha = 0.8;
      g.font = '700 ' + Math.round(H * 0.3) + 'px ' + JP_FONT;
      g.fillText(sub, W / 2, H * 0.76);
    },
    400,
    Math.round((400 * h) / w),
  );
  return plane(w, h, tex);
}
function inOutBoard() {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#f3f3f0';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#9aa1ab';
      g.lineWidth = 3;
      for (let r = 0; r <= 6; r++) {
        g.beginPath();
        g.moveTo(10, 30 + r * 36);
        g.lineTo(W - 10, 30 + r * 36);
        g.stroke();
      }
      for (const x of [110, 200, 290, 380]) {
        g.beginPath();
        g.moveTo(x, 30);
        g.lineTo(x, 246);
        g.stroke();
      }
      const cols = ['#d9534f', '#4a74b8', '#5aa05d', '#d9534f', '#4a74b8', '#e2a33d'];
      for (let r = 0; r < 6; r++) {
        g.fillStyle = '#5a616c';
        g.fillRect(20, 40 + r * 36, 70, 14);
        g.fillStyle = cols[r];
        g.beginPath();
        g.arc(135 + (r % 3) * 90, 48 + r * 36, 9, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#2b3140';
      g.font = '700 22px ' + JP_FONT;
      g.fillText('行動予定表', 16, 22);
      g.fillStyle = '#6a7282';
      g.font = '700 18px ' + JP_FONT;
      g.fillText('IN / OUT', 150, 22);
    },
    480,
    260,
  );
  const grp = new THREE.Group();
  grp.add(rbox(1.0, 0.58, 0.03, '#b9bdc3', { r: 0.01, cast: false }));
  const p = plane(0.94, 0.52, tex);
  p.position.set(0, 0.29, 0.017);
  grp.add(p);
  return grp;
}
function whiteboard() {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#f6f6f3';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#e07a3b';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(40, 60);
      g.bezierCurveTo(90, 30, 140, 90, 200, 50);
      g.stroke();
      g.strokeStyle = '#3d6fb0';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(40, 110 + i * 30);
        g.lineTo(160 + (i % 2) * 60, 110 + i * 30);
        g.stroke();
      }
      g.strokeStyle = '#2b3140';
      g.strokeRect(260, 90, 120, 90);
    },
    420,
    260,
  );
  const grp = new THREE.Group();
  grp.add(rbox(0.9, 0.56, 0.03, '#a8adb4', { r: 0.01, cast: false }));
  const p = plane(0.84, 0.5, tex);
  p.position.set(0, 0.28, 0.017);
  grp.add(p);
  grp.add(rbox(0.8, 0.03, 0.06, '#a8adb4', { y: -0.01, z: 0.03, r: 0.008, cast: false }));
  return grp;
}
function calendar() {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#f4f2ec';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#6f93b5';
      g.fillRect(8, 8, W - 16, 90);
      g.fillStyle = '#4f6e53';
      g.beginPath();
      g.moveTo(8, 98);
      g.lineTo(60, 50);
      g.lineTo(110, 98);
      g.fill();
      g.fillStyle = '#b3b7bd';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(14 + c * 17, 110 + r * 17, 11, 10);
    },
    136,
    200,
  );
  return plane(0.22, 0.32, tex);
}
function glassCabinet() {
  const g = new THREE.Group();
  g.add(rbox(0.62, 1.2, 0.4, '#8f959f', { r: 0.02 }));
  for (let i = 0; i < 3; i++) {
    const y = 0.12 + i * 0.36;
    g.add(rbox(0.54, 0.02, 0.34, '#a3a9b2', { y, r: 0.006, cast: false }));
    const cols = ['#4a6490', '#6a7a8c', '#3d4d6b', '#7f8ea3', '#56657e', '#8a6f5a'];
    for (let k = 0; k < 8; k++)
      g.add(
        rbox(0.055, 0.28, 0.22, cols[(k * 3 + i) % 6], {
          x: -0.22 + k * 0.063,
          y: y + 0.02,
          z: 0.02,
          r: 0.008,
          cast: false,
        }),
      );
  }
  const gl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 1.1),
    new THREE.MeshStandardMaterial({
      color: '#cfdde6',
      roughness: 0.1,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  gl.position.set(0, 0.6, 0.205);
  g.add(gl);
  return g;
}
function waterCooler() {
  const g = new THREE.Group();
  g.add(rbox(0.3, 0.72, 0.3, '#e3e4e2', { r: 0.03 }));
  const b = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.34, 14),
    new THREE.MeshStandardMaterial({ color: '#9cc3e0', roughness: 0.15, transparent: true, opacity: 0.8 }),
  );
  b.position.y = 0.9;
  g.add(sh(b));
  return g;
}
function rack() {
  const g = new THREE.Group();
  g.add(
    rbox(0.6, 1.3, 0.7, '#434954', { r: 0.02 }),
    rbox(0.56, 0.02, 0.66, '#5b626d', { y: 1.3, r: 0.01, cast: false }),
  );
  for (let k = 0; k < 3; k++)
    g.add(rbox(0.46, 0.012, 0.05, '#6b7280', { y: 1.315, z: -0.2 + k * 0.2, r: 0.004, cast: false })); // vents on the top
  for (let i = 0; i < 9; i++) {
    g.add(rbox(0.5, 0.09, 0.01, '#4d5461', { y: 0.12 + i * 0.125, z: 0.352, r: 0.004, cast: false }));
    const led = new THREE.Mesh(
      new THREE.PlaneGeometry(0.03, 0.02),
      new THREE.MeshBasicMaterial({ color: i % 3 ? '#5fd38f' : '#ffb95a' }),
    );
    led.position.set(0.18 - (i % 2) * 0.05, 0.16 + i * 0.125, 0.36);
    g.add(led);
  }
  return g;
}
function fridge() {
  const g = new THREE.Group();
  g.add(rbox(0.6, 1.1, 0.56, '#e2e3e0', { r: 0.03 }));
  g.add(rbox(0.58, 0.012, 0.01, '#c3c5c3', { y: 0.72, z: 0.282, r: 0.004, cast: false }));
  g.add(rbox(0.03, 0.26, 0.03, '#a4a8ae', { x: 0.24, y: 0.78, z: 0.29, r: 0.01, cast: false }));
  return g;
}
function counter(len) {
  const g = new THREE.Group();
  g.add(rbox(len, 0.48, 0.56, '#6f7682', { r: 0.02 }));
  g.add(rbox(len + 0.04, 0.04, 0.6, '#c3c6c8', { y: 0.48, r: 0.012 }));
  const n = Math.round(len / 0.55);
  for (let i = 0; i < n; i++)
    g.add(
      rbox(len / n - 0.06, 0.38, 0.01, '#7f8692', {
        x: -len / 2 + ((i + 0.5) * len) / n,
        y: 0.05,
        z: 0.283,
        r: 0.006,
        cast: false,
      }),
    );
  return g;
}
// narrow (0.5 m): the walk-in lift car (places/lift.js) sits right of it, so it runs x -6.75..-6.25
function stairs(w = 0.5) {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++)
    g.add(rbox(w, 0.12 * (i + 1), 0.34, i % 2 ? '#9ca1a8' : '#a6abb2', { z: -i * 0.34, r: 0.01 }));
  g.add(rbox(w, 0.02, 0.3, '#6e747e', { y: -0.001, z: 0.9, r: 0.005, cast: false })); // the landing plate (was five copies in the same spot)
  return g;
}
function table2() {
  const g = new THREE.Group();
  g.add(rbox(0.8, 0.04, 0.6, '#e3e3df', { y: 0.4, r: 0.012 }));
  for (const [x, z] of [
    [-0.35, -0.25],
    [0.35, -0.25],
    [-0.35, 0.25],
    [0.35, 0.25],
  ])
    g.add(rbox(0.04, 0.4, 0.04, PAL.deskLeg, { x, z, r: 0.01 }));
  for (const x of [-0.3, 0.3]) {
    g.add(rbox(0.26, 0.04, 0.26, PAL.chair, { x, y: 0.26, z: 0.55, r: 0.02 }));
    g.add(rbox(0.03, 0.26, 0.03, PAL.deskLeg, { x, z: 0.55, r: 0.01 }));
  }
  const m = mug();
  m.position.set(0.18, 0.46, 0.05);
  g.add(m);
  return g;
}
function coatRack() {
  const g = new THREE.Group();
  g.add(rbox(0.3, 0.03, 0.3, '#3c414b', { r: 0.01 }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), mat('#3c414b'));
  pole.position.y = 0.6;
  g.add(sh(pole));
  g.add(rbox(0.3, 0.55, 0.12, '#8a7d6c', { y: 0.55, z: 0.06, r: 0.05 }));
  return g;
}
// a stand fan (senpuki): round base, telescopic pole, a motor pod, and a head tipped up so the
// high camera sees the face: a wire guard (rings and spokes, front and back) around four pitched pale-blue blades
// with gaps. userData.head yaws (the oscillation), userData.rotor spins about its local z; both are
// noBatch, the base and pole can batch.
function standFan() {
  const g = new THREE.Group();
  const body = '#e4e5e2',
    bodyDark = '#b9bcbf',
    wire = '#d2d5d8',
    blade = '#9fc0d6',
    hubC = '#e9eae7';
  const flat = (c) => mat(c, { flatShading: true });
  // base: a low octagonal dome, a darker foot ring, the switch pod
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.03, 8), flat(bodyDark));
  foot.position.y = 0.015;
  g.add(sh(foot));
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.19, 0.06, 8), flat(body));
  dome.position.y = 0.06;
  g.add(sh(dome));
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.05), flat('#7fa7c3'));
  sw.position.set(0, 0.085, 0.1);
  sw.rotation.x = 0.35;
  g.add(sh(sw));
  // pole: a thick lower tube and a thin chrome-ish upper tube with a collar
  const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.42, 8), flat(body));
  lo.position.y = 0.3;
  g.add(sh(lo));
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 8), flat(bodyDark));
  col.position.y = 0.52;
  g.add(sh(col));
  const up = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.3, 6), flat('#c9ccd0'));
  up.position.y = 0.67;
  g.add(sh(up));

  const HY = 0.84,
    R = 0.2,
    TILT = 0.5;
  const head = new THREE.Group();
  head.position.y = HY;
  g.add(head);
  const tilt = new THREE.Group();
  tilt.rotation.x = -TILT;
  head.add(tilt); // face tipped up toward the camera
  const nb = (m) => {
    m.userData.noBatch = true;
    return sh(m);
  };
  // motor pod behind the guard, a short neck down to the pole
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 8), flat(body));
  pod.rotation.x = Math.PI / 2;
  pod.position.z = -0.12;
  tilt.add(nb(pod));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.075, 0.05, 8), flat(bodyDark));
  cap.rotation.x = Math.PI / 2;
  cap.position.z = -0.215;
  tilt.add(nb(cap));
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), flat(bodyDark));
  neck.position.set(0, -0.06, -0.12);
  tilt.add(nb(neck));
  // guard: front and back rims, an inner ring at the front, spokes to a front badge; one merged mesh
  const parts = [];
  const ring = (r, z, t) => {
    const q = new THREE.TorusGeometry(r, t, 4, 28);
    q.translate(0, 0, z);
    return q;
  };
  parts.push(ring(R, 0.02, 0.009), ring(R * 0.62, 0.05, 0.006), ring(R, -0.06, 0.008));
  const NS = 8;
  for (let i = 0; i < NS; i++) {
    const a = (i / NS) * Math.PI * 2;
    // front spokes all round; at the back only every other one, so the two layers don't tangle from above
    for (const [z0, z1, r0] of i % 2
      ? [[0.06, 0.02, 0.035]]
      : [
          [0.06, 0.02, 0.035],
          [-0.075, -0.06, 0.07],
        ]) {
      // spoke from the badge (or the pod) out to the rim, bowed: two straight pieces
      const pts = [
        [r0, z0],
        [R * 0.62, z0 - 0.01 * Math.sign(z0)],
        [R, z1],
      ];
      for (let k = 0; k < 2; k++) {
        const [ra, za] = pts[k],
          [rb, zb] = pts[k + 1];
        const len = Math.hypot(rb - ra, zb - za);
        const s = new THREE.BoxGeometry(0.008, len, 0.008);
        s.rotateX(Math.atan2(zb - za, rb - ra)); // lean along z
        s.applyMatrix4(new THREE.Matrix4().makeTranslation(0, (ra + rb) / 2, (za + zb) / 2));
        s.applyMatrix4(new THREE.Matrix4().makeRotationZ(a));
        parts.push(s);
      }
    }
    // rim to rim bars around the side
    if (i % 2 === 0) {
      const s = new THREE.BoxGeometry(0.007, 0.007, 0.08);
      s.translate(Math.cos(a) * R, Math.sin(a) * R, -0.02);
      parts.push(s);
    }
  }
  const badge = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 10);
  badge.rotateX(Math.PI / 2);
  badge.translate(0, 0, 0.062);
  const guard = new THREE.Mesh(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p))), flat(wire));
  tilt.add(nb(guard));
  const bm = new THREE.Mesh(badge, flat('#7fa7c3'));
  tilt.add(nb(bm));
  // rotor: hub and four blades with pitch and wide gaps
  const rotor = new THREE.Group();
  rotor.position.z = -0.015;
  tilt.add(rotor);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.05, 8), flat(hubC));
  hub.rotation.x = Math.PI / 2;
  rotor.add(nb(hub));
  const shape = new THREE.Shape();
  // blade outline in the rotor plane: narrow at the hub, a wide rounded paddle at the tip, swept back
  shape.moveTo(0.035, -0.018);
  shape.bezierCurveTo(0.08, -0.05, 0.16, -0.075, 0.18, -0.03);
  shape.bezierCurveTo(0.19, 0.0, 0.17, 0.045, 0.13, 0.05);
  shape.bezierCurveTo(0.09, 0.05, 0.06, 0.03, 0.035, 0.018);
  shape.lineTo(0.035, -0.018);
  const bl = [];
  const NB = 4;
  for (let i = 0; i < NB; i++) {
    const q = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 4 });
    q.translate(0, 0, -0.004);
    q.rotateX(0.45); // pitch about the blade's own radial axis
    q.rotateZ((i / NB) * Math.PI * 2);
    bl.push(q.index ? q.toNonIndexed() : q);
  }
  const blades = new THREE.Mesh(mergeGeometries(bl), flat(blade));
  rotor.add(nb(blades));
  g.userData.head = head;
  g.userData.rotor = rotor;
  return g;
}
function acUnit() {
  const g = new THREE.Group();
  g.add(rbox(0.9, 0.26, 0.2, '#e6e7e4', { r: 0.04 }));
  g.add(rbox(0.8, 0.03, 0.01, '#b9bcc0', { y: 0.05, z: 0.1, r: 0.005, cast: false }));
  return g;
}
function stall(w = 0.9, d = 1.0) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(rbox(0.04, 1.0, d, '#cdd2d5', { x: (sx * w) / 2, r: 0.01 }));
  g.add(rbox(w - 0.06, 1.0, 0.04, '#b9c4cf', { z: d / 2, r: 0.01 }));
  const t = toilet();
  t.position.set(0, 0, -d / 2 + 0.3);
  g.add(t);
  return g;
}

// buildOffice() builds it all at once; officeSteps() is the same as a generator that yields between rooms, so the
// game can build it in slices while another place is played (places/lifecycle.js, js/perf/slice.js)
export const buildOffice = () => drain(officeSteps());
export function* officeSteps() {
  const root = new THREE.Group();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#33373f');
  scene.add(root);

  yield;
  // light: a dim cool floor lit by warm ceiling lamps; one soft key from high above for shadows
  scene.add(new THREE.HemisphereLight('#aab4c6', '#5a5552', 0.95));
  const sun = new THREE.DirectionalLight('#ffe6c4', 1.5);
  sun.position.set(-7, 22, 10);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 5, far: 60 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dde6ff', 0.5);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);
  for (const [x, z, k] of [
    [-2.2, -3.4, 1.5],
    [0.8, -3.4, 1.5],
    [-0.6, -1.0, 1.0],
    [-5.6, -1.6, 1.3],
    [5.2, -3.4, 0.9],
    [-4.4, 1.3, 1.1],
    [0.2, 1.3, 1.1],
    [4.6, 1.3, 1.1],
    [-4.6, 4.2, 1.3],
    [-0.2, 4.2, 1.2],
    [3.1, 4.4, 0.9],
    [5.7, 4.4, 0.9],
    [-5.6, -5.0, 0.8],
  ]) {
    const p = new THREE.PointLight('#ffd6a0', k * 2.1 * (z > CS ? 0.8 : 1), 3.2, 2.0);
    p.position.set(x, 1.3, z);
    scene.add(p);
  }

  yield;
  // ---- floors ----
  // room floors sit at y 0.006, above the base floor's seams (their tops are at 0.004), so each room shows only
  // its own tile grid (at 0.003 the base grid poked through and every room had two grids)
  root.add(tileFloor(X0, X1, Z0, Z1, 0.8, { color: '#979ca4', seam: '#868b93' }));
  root.add(tileFloor(X0, X1, CN, CS, 0.8, { color: '#8f949b', seam: '#80858c', y: 0.006 })); // corridor, older vinyl
  root.add(tileFloor(3.4, X1, Z0, CN, 0.6, { color: '#9da2a8', seam: '#8d9298', y: 0.006 })); // machine room, painted concrete
  root.add(tileFloor(1.8, X1, CS, Z1, 0.4, { color: '#a3a8ae', seam: '#90959b', y: 0.006 })); // toilets
  root.add(tileFloor(-7, -2.2, CS, Z1, 1.0, { color: '#979a9e', seam: '#898c90', y: 0.006 })); // copy room sheet vinyl
  root.add(tileFloor(-2.2, 1.8, CS, Z1, 1.0, { color: '#92969c', seam: '#83878d', y: 0.006 })); // kitchenette

  yield;
  // ---- walls ----
  const W = (...a) => root.add(wall(...a));
  const LO = 0.7,
    MID = 0.95;
  yield;
  // outer
  W('x', X0 - T / 2, X1 + T / 2, Z0 - T / 2, WH, T);
  W('z', Z0, CS, X0 - T / 2, WH, T);
  W('z', CS, Z1, X0 - T / 2, MID, T);
  W('z', Z0, CN, X1 + T / 2, WH, T, { holes: [] });
  W('z', CN, CS, X1 + T / 2, WH, T, { holes: [[0.6, 1.9, 0, 1.3]] });
  W('z', CS, Z1, X1 + T / 2, MID, T);
  W('x', X0 - T / 2, X1 + T / 2, Z1 + T / 2, 0.32, T);
  yield;
  // top row
  W('x', X0, -4.2, -3.4, WH, T, {
    holes: [
      [-6.75, -6.15, 0, 1.25],
      [-5.95, -4.95, 0, 1.25],
    ],
  }); // lift lobby north: stair door, lift
  W('z', Z0, CN, -4.2, WH, T); // lobby / office
  W('z', Z0, CN, 3.4, WH, T); // office / machine room
  W('x', X0, X1, CN, WH, T, {
    holes: [
      [X0, -4.2, 0, WH],
      [-0.8, 0.3, 0, 1.3],
      [4.7, 5.5, 0, 1.25],
      [6.2, 6.8, 0, 0.0001],
    ],
  });
  yield;
  // bottom row
  W('x', X0, X1, CS, LO, T, {
    holes: [
      [-4.4, -3.6, 0, LO],
      [-0.8, 0.1, 0, LO],
      [2.3, 2.9, 0, LO],
      [4.9, 5.5, 0, LO],
    ],
  });
  W('z', CS, Z1, -2.2, MID, T);
  W('z', CS, Z1, 1.8, MID, T);
  W('z', CS, Z1, 4.4, MID, T);

  yield;
  // doors and plates on the corridor's north face (seen from the camera)
  const sd = door(0.6, 1.25, { windows: true });
  sd.position.set(-6.45, 0, -3.4 + T / 2);
  root.add(sd);
  yield;
  // machine-room door: the frame stays in the wall; the leaf hangs on a hinge at its right edge (the handle is on
  // the left) and swings into the machine room (Jørgen: it "slides in a strange way rather than swinging open")
  // the pivot is the hinge line itself: the leaf's right edge, on the room side of the wall, so that edge stays put
  const HINGE = [5.465, CN - T / 2 + 0.035],
    LEAF_W = 0.76;
  const md = new THREE.Group();
  md.position.set(HINGE[0], 0, HINGE[1]);
  md.userData.hinge = HINGE;
  root.add(md);
  {
    const d = door(0.8, 1.25, { windows: false });
    d.remove(d.children[0]);
    // an open frame (two jambs and a header) so the doorway shows through when the leaf swings away
    const fm = mat(PAL.doorFrame);
    for (const x of [4.66, 5.54]) root.add(rbox(0.08, 1.31, 0.06, null, { x, z: CN + T / 2, r: 0.02, m: fm }));
    root.add(rbox(0.96, 0.07, 0.06, null, { x: 5.1, y: 1.24, z: CN + T / 2, r: 0.02, m: fm }));
    // no backing panel in the opening: when the leaf swings in, the room's own floor and light show through, matching
    // where Eric can walk (it used to be an opaque dark panel that he walked through; Codex world review, item 1)
    d.position.set(-LEAF_W / 2, 0, -0.01);
    md.add(d);
  } // the leaf mesh sits at z +0.01 inside door(); this centres it on the hinge line
  const fe = door(0.7, 1.2, { windows: true });
  fe.rotation.y = -Math.PI / 2;
  fe.position.set(X1 - 0.02, 0, 1.25);
  root.add(fe);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), emissive('#6fe39a', '#3fbf6e', 1.2));
  ex.position.set(X1 - 0.09, 1.38, 1.25);
  ex.rotation.y = -Math.PI / 2;
  root.add(ex);
  const addPlate = (t, x, y, z, o) => {
    const p = plate(t, o);
    p.position.set(x, y, z);
    root.add(p);
    return p;
  };
  addPlate('ITサポート', -1.3, 1.0, CN + T / 2 + 0.005, { w: 0.56, h: 0.2, sub: 'IT SUPPORT' });
  addPlate('機械室', 5.95, 1.0, CN + T / 2 + 0.005, { w: 0.56, h: 0.2, sub: 'MACHINE ROOM' });
  addPlate('階段', -6.45, 1.34, -3.4 + T / 2 + 0.005, { w: 0.4, h: 0.18, sub: 'STAIRS' });
  addPlate('B2', -4.55, 1.05, -3.4 + T / 2 + 0.005, { w: 0.3, h: 0.3, bg: '#3b414c', fg: '#e9ecf0' });
  yield;
  // plates for the bottom rooms stand on the low wall tops, tilted up toward the camera
  for (const [t, x, sub] of [
    ['コピー室', -3.1, 'COPY ROOM'],
    ['給湯室', 0.55, 'KITCHEN'],
  ]) {
    const p = plate(t, { w: 0.5, h: 0.18, sub });
    p.position.set(x, LO + 0.1, CS);
    p.rotation.x = -0.5;
    root.add(p);
    root.add(rbox(0.52, 0.1, 0.03, '#8a909a', { x, y: LO, z: CS - 0.02, r: 0.01, cast: false }));
  }
  for (const [k, x] of [
    ['m', 3.25],
    ['f', 5.85],
  ]) {
    const p = toiletSign(k);
    p.scale.setScalar(0.6);
    p.position.set(x, LO + 0.13, CS);
    p.rotation.x = -0.5;
    root.add(p);
  }
  yield;
  // corridor dressing: noticeboard, extinguisher, hydrant, distribution board, notices
  const nb = pinboard(0.9, 0.46);
  nb.position.set(-3.0, 0.72, CN + T / 2 + 0.01);
  root.add(nb);
  root.add(rbox(0.26, 0.4, 0.08, '#9c4a44', { x: 1.5, y: 0.35, z: CN + T / 2 + 0.04, r: 0.02 }));
  const hy = rbox(0.5, 0.62, 0.1, '#9c4a44', { x: 2.6, y: 0.2, z: CN + T / 2 + 0.05, r: 0.02 });
  root.add(hy);
  const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), emissive('#ff8a7a', '#ff4a3a', 2.2));
  lampR.position.set(2.6, 0.95, CN + T / 2 + 0.06);
  root.add(lampR);
  root.add(rbox(0.4, 0.44, 0.06, '#9aa0a8', { x: 3.7, y: 0.8, z: CN + T / 2 + 0.03, r: 0.01 }));
  addPlate('', -1.9, 0.62, CN + T / 2 + 0.006, { w: 0.18, h: 0.24, bg: '#f2f0ea' });
  yield;
  // corridor lamps
  for (const x of [-5.6, -2.6, 0.9, 4.0]) {
    const l = ceilingLamp(0.7);
    l.position.set(x, 1.3, CN + T / 2 + 0.02);
    root.add(l);
    yield;
  }
  const trolley = new THREE.Group();
  trolley.add(
    rbox(0.5, 0.04, 0.34, '#4c6696', { y: 0.08, r: 0.01 }),
    rbox(0.04, 0.6, 0.04, '#4c6696', { x: -0.23, y: 0.08, z: -0.13, r: 0.01 }),
    rbox(0.04, 0.6, 0.04, '#4c6696', { x: -0.23, y: 0.08, z: 0.13, r: 0.01 }),
  );
  trolley.position.set(6.3, 0, 2.05);
  root.add(trolley);
  yield;
  // corridor dressing: plants off the doors, a folded 清掃中 sign, bins
  {
    const p = plant({ size: 0.95, seed: 14 });
    p.position.set(-4.85, 0, 2.05);
    root.add(p);
  }
  {
    const p = plant({ size: 0.95, seed: 15 });
    p.position.set(3.4, 0, 2.05);
    root.add(p);
  }
  {
    const s = new THREE.Group();
    s.add(rbox(0.3, 0.5, 0.04, '#e0b83a', { r: 0.02 }));
    s.rotation.x = -0.25;
    s.position.set(1.6, 0, 1.95);
    root.add(s);
  }
  for (const [x, c] of [
    [0.7, '#4f6f9a'],
    [0.98, '#6a8f5c'],
  ])
    root.add(rbox(0.22, 0.34, 0.22, c, { x, z: 2.1, r: 0.03 }));
  for (let i = 0; i < 3; i++)
    root.add(rbox(0.4, 0.05, 0.36, '#6d747e', { x: -2.4, y: 0.02 + i * 0.05, z: 2.05, r: 0.01 }));

  yield;
  // ---- lift lobby ----
  const liftDoor = new THREE.Group();
  const leaves = [];
  for (const s of [-1, 1]) {
    const l = rbox(0.5, 1.22, 0.05, null, {
      x: s * 0.255,
      z: 0.02,
      r: 0.01,
      m: mat('#a2a8b0', { roughness: 0.5, metalness: 0.2 }),
    });
    l.add(rbox(0.012, 1.16, 0.052, '#5d636d', { x: -s * 0.245, y: -0.58, r: 0.003, cast: false }));
    liftDoor.add(l);
    leaves.push(l);
    yield;
  }
  liftDoor.position.set(-5.45, 0, -3.42);
  root.add(liftDoor); // leaves in the wall's thickness: they slide into the wall, not across the jambs
  root.add(rbox(0.36, 0.12, 0.03, '#1d2027', { x: -5.45, y: 1.31, z: -3.4 + T / 2 + 0.02, r: 0.01, cast: false }));
  root.add(rbox(0.07, 0.13, 0.03, '#b9bec6', { x: -4.8, y: 0.62, z: -3.4 + T / 2 + 0.02, r: 0.01 }));
  const vm = vending(true);
  vm.scale.setScalar(0.82);
  vm.position.set(-4.62, 0, -2.3);
  root.add(vm); // facing the room, clear of the lift jamb
  root.add(rbox(0.2, 0.3, 0.2, '#6d7684', { x: -4.45, z: -1.55, r: 0.02 }));
  const bn = bench(1.6);
  bn.rotation.y = Math.PI / 2;
  bn.position.set(-6.72, 0, -1.4);
  root.add(bn);
  {
    const p = plant({ size: 1.0, seed: 6 });
    p.position.set(-6.65, 0, -0.05);
    root.add(p);
  }
  {
    const l = ceilingLamp(0.6);
    l.position.set(-6.6, 1.3, -3.4 + T / 2 + 0.02);
    root.add(l);
  }
  yield;
  // stairwell behind the lobby
  const stw = stairs();
  stw.position.set(-6.5, 0, -4.0);
  root.add(stw);
  yield;
  // the lift car behind the doors is places/lift.js's walk-in car
  {
    // the doorway in the wall face: jambs, a header, a sill, the floor indicator and a lit call button
    {
      const fm = mat('#4c515b');
      for (const sx of [-1, 1])
        root.add(rbox(0.09, 1.3, 0.08, null, { x: -5.45 + sx * 0.55, z: -3.4 + T / 2 + 0.03, r: 0.015, m: fm }));
      root.add(rbox(1.2, 0.07, 0.08, null, { x: -5.45, y: 1.21, z: -3.4 + T / 2 + 0.03, r: 0.015, m: fm }));
      root.add(rbox(1.0, 0.012, 0.2, '#6d737d', { x: -5.45, y: 0.001, z: -3.4 + T / 2 + 0.06, r: 0.003, cast: false }));
      root.add(lightPool(-5.45, -3.0, 0.6, { k: 0.3, sx: 1.2, sz: 0.9, color: '#ffe2b8', y: 0.014 }));
      const cb = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), emissive('#ffe2b8', '#ffc680', 1.4));
      cb.position.set(-4.8, 0.66, -3.4 + T / 2 + 0.036);
      root.add(cb);
    }
    const cl = new THREE.PointLight('#ffe2b8', 0.9, 1.6, 1.8);
    cl.position.set(-5.45, 1.1, -3.95);
    scene.add(cl);
  }
  yield;
  // the floor behind the lift lobby wall, under the stairwell only (it used to run on under the lift car and poke up through its floor)
  root.add(rbox(0.66, 0.05, 1.0, '#b2b5b8', { x: -6.57, y: -0.02, z: -4.1, r: 0.01, cast: false }));

  yield;
  // ---- main office ----
  const iob = inOutBoard();
  iob.position.set(-1.6, 0.62, Z0 + T / 2 + 0.01);
  root.add(iob);
  const ck = clock();
  ck.position.set(-1.6, 1.3, Z0 + T / 2 + 0.02);
  root.add(ck);
  const secHand = new THREE.Group();
  secHand.position.set(-1.6, 1.3, Z0 + T / 2 + 0.03);
  root.add(secHand);
  {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.13), new THREE.MeshBasicMaterial({ color: '#c9473f' }));
    h.position.y = 0.055;
    secHand.add(h);
  }
  const cal = calendar();
  cal.position.set(-0.6, 0.86, Z0 + T / 2 + 0.01);
  root.add(cal);
  const wb = whiteboard();
  wb.position.set(0.55, 0.6, Z0 + T / 2 + 0.01);
  root.add(wb);
  const cb = pinboard(0.6, 0.36);
  cb.position.set(-2.95, 0.84, Z0 + T / 2 + 0.01);
  root.add(cb);
  root.add(rbox(0.4, 0.14, 0.04, '#9aa0a8', { x: 1.9, y: 1.18, z: Z0 + T / 2 + 0.02, r: 0.01, cast: false }));
  for (const x of [-3.8, -3.15]) {
    const gc = glassCabinet();
    gc.position.set(x, 0, Z0 + T / 2 + 0.22);
    root.add(gc);
    yield;
  }
  const wc = waterCooler();
  wc.position.set(-3.85, 0, -4.9);
  root.add(wc);
  const tc = filingCabinet(3, '#8a909a');
  tc.position.set(2.1, 0, Z0 + T / 2 + 0.25);
  root.add(tc);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.18, 12),
    mat('#d4d6d8', { roughness: 0.35, metalness: 0.3 }),
  );
  pot.position.set(2.0, 0.78, Z0 + 0.4);
  root.add(sh(pot));
  root.add(
    mug('#7aa0c8')
      .translateX(2.2)
      .translateY(0.73)
      .translateZ(Z0 + 0.4),
  );
  {
    const p = plant({ size: 1.2, seed: 1, tall: 1.4 });
    p.position.set(2.95, 0, Z0 + 0.45);
    root.add(p);
  }
  {
    const p = plant({ size: 1.0, seed: 3 });
    p.position.set(-3.85, 0, -0.35);
    root.add(p);
  }
  root.add(rbox(0.34, 0.27, 0.34, PAL.box, { x: 2.3, z: -0.35, r: 0.02 }));
  yield;
  // filing row and plant along the office's left wall
  for (let i = 0; i < 3; i++) {
    const f = filingCabinet(3, '#858b95');
    f.rotation.y = Math.PI / 2;
    f.position.set(-3.95, 0, -1.9 - i * 0.48 + 0.0);
    root.add(f);
    yield;
  }
  yield;
  // a bench in the corridor, by the office door
  {
    const bc = bench(1.4, { seats: 2 });
    bc.position.set(-1.9, 0, 0.62);
    root.add(bc);
  }

  yield;
  // a small meeting table below the island, for the morning huddle
  {
    const mt = new THREE.Group();
    mt.add(rbox(0.9, 0.04, 0.6, '#d5d6d3', { y: 0.4, r: 0.01 }), rbox(0.08, 0.4, 0.08, PAL.deskLeg, { r: 0.01 }));
    for (const x of [-0.3, 0.3])
      mt.add(
        rbox(0.3, 0.05, 0.28, PAL.chair, { x, y: 0.24, z: 0.45, r: 0.02 }),
        rbox(0.03, 0.24, 0.03, PAL.deskLeg, { x, z: 0.45, r: 0.01 }),
      );
    mt.add(rbox(0.3, 0.02, 0.22, PAL.paper, { x: 0.15, y: 0.44, r: 0.005 }));
    mt.position.set(-2.4, 0, -1.15);
    root.add(mt);
  }
  const fan = standFan();
  fan.position.set(-3.3, 0, -2.2);
  root.add(fan);
  root.add(rbox(0.36, 0.36, 0.3, '#6a7b93', { x: -3.85, z: -3.0, r: 0.02 }));

  const dN = (i) => desks.find((d) => d.row === 'n' && d.i === i),
    dS = (i) => desks.find((d) => d.row === 's' && d.i === i);
  yield;
  // desk island: two rows of three, back to back; the section chief's desk across the head
  const DX = [-2.0, -0.8, 0.4],
    ZN = -3.72,
    ZS = -3.0;
  const desks = [];
  for (const [row, z, face] of [
    ['n', ZN, -1],
    ['s', ZS, 1],
  ])
    for (let i = 0; i < 3; i++) {
      const d = desk({ w: 1.12, d: 0.7, seed: i + (row === 'n' ? 3 : 0), clutter: 1 });
      d.position.set(DX[i], 0, z);
      if (face < 0) d.rotation.y = Math.PI;
      root.add(d);
      const c = officeChair();
      c.position.set(DX[i], 0, z + face * 0.5);
      c.rotation.y = face > 0 ? Math.PI : 0;
      if (!(row === 's' && i === 1)) root.add(c);
      desks.push({ x: DX[i], z, face, chair: c, seat: [DX[i], z + face * 0.5], row, i });
      yield;
    }
  yield;
  // the section chief's desk at the head of the island, facing along it
  const chief = desk({ w: 1.2, d: 0.72, seed: 7 });
  chief.rotation.y = -Math.PI / 2;
  chief.position.set(1.55, 0, -3.36);
  root.add(chief);
  const chiefChair = officeChair('#2a2f3e');
  chiefChair.rotation.y = -Math.PI / 2;
  chiefChair.position.set(2.2, 0, -3.36);
  root.add(chiefChair);
  yield;
  // the empty desk in the north row carries boxes and a dead monitor
  root.add(rbox(0.4, 0.3, 0.34, PAL.box, { x: DX[2] + 0.25, y: 0.42, z: ZN - 0.05, r: 0.02 }));
  yield;
  // the team has shrunk: three desks have their monitors under a cloth
  const cloth = (d) => {
    // a pale dust sheet thrown over the monitor: the screen's shape under it, the hem spread on the desk
    const g = new THREE.Group();
    const cm2 = mat('#c3bfb4', { roughness: 0.95 });
    g.add(
      rbox(0.5, 0.32, 0.1, null, { y: 0.1, r: 0.06, seg: 3, m: cm2 }),
      rbox(0.62, 0.03, 0.34, null, { r: 0.03, seg: 3, m: cm2 }),
      rbox(0.3, 0.1, 0.16, null, { y: 0.02, r: 0.04, m: cm2 }),
    );
    g.position.set(d.x, 0.42, d.z - d.face * 0.2);
    if (d.face < 0) g.rotation.y = Math.PI;
    root.add(g);
    return g;
  };
  const covers = [cloth(dN(1)), cloth(dN(2)), cloth(dS(2))];
  yield;
  // the 2019 party box on the cabinets, a tray of seven cups in the kitchenette, a nameplate face down on the chief's desk
  root.add(rbox(0.42, 0.22, 0.3, PAL.box, { x: -3.5, y: 1.2, z: Z0 + 0.3, r: 0.02 }));
  const tray = new THREE.Group();
  tray.userData.noBatch = true; // Preserve overlapping cup/tray surfaces in their original draw order.
  tray.add(rbox(0.46, 0.02, 0.26, '#6d5a4a', { r: 0.006 }));
  for (let i = 0; i < 7; i++) {
    const cu = mug(['#e9e6df', '#c96a5a', '#7aa0c8', '#e9e6df', '#9cc39a', '#e2c26a', '#e9e6df'][i]);
    cu.position.set(-0.17 + (i % 4) * 0.11, 0.05, i < 4 ? -0.06 : 0.06);
    cu.scale.setScalar(0.8);
    tray.add(cu);
    yield;
  }
  tray.position.set(0.4, 0.5, CS + T / 2 + 0.34);
  root.add(tray);
  root.add(rbox(0.26, 0.02, 0.08, '#3a3f48', { x: 1.55, y: 0.42, z: -3.1, r: 0.005 }));
  const card = nameCard('エリック', 'ERIC');
  card.position.set(DX[1] + 0.32, 0.42, ZS + 0.2);
  root.add(card);

  const myChair = officeChair();
  myChair.position.set(5.5, 0, -1.3);
  myChair.rotation.y = -0.5;
  root.add(myChair);
  const tama = cat();
  tama.scale.setScalar(1.15 * K * 0.9);
  tama.position.set(0, 0.24, 0.02);
  tama.rotation.y = 0.4;
  myChair.add(tama);
  tama.userData.head.rotation.x = 0.35;

  yield;
  // ---- machine room ----
  for (let i = 0; i < 4; i++) {
    const r = rack();
    r.position.set(4.1 + i * 0.72, 0, Z0 + 0.5);
    root.add(r);
    yield;
  }
  for (let i = 0; i < 3; i++) {
    const r = rack();
    r.position.set(4.4 + i * 0.72, 0, -3.3);
    root.add(r);
    yield;
  }
  const ac = acUnit();
  ac.position.set(5.9, 1.05, Z0 + T / 2 + 0.1);
  root.add(ac);
  const fan2 = new THREE.Group();
  fan2.add(new THREE.Group(), new THREE.Group(), new THREE.Group()); // the floor fan is gone; the updater still spins a dummy
  const cart = new THREE.Group();
  cart.add(rbox(0.5, 0.5, 0.4, '#6e747e', { r: 0.02 }));
  const cm = monitor({ kind: 'term' });
  cm.position.set(0, 0.5, 0);
  cart.add(cm);
  cart.position.set(4.2, 0, -1.3);
  root.add(cart);
  for (const [x0, z0, x1, z1] of [
    [3.7, -2.5, 6.8, -2.45],
    [3.7, -2.35, 6.8, -2.3],
  ])
    root.add(
      rbox(x1 - x0, 0.04, 0.08, '#5a5f68', { x: (x0 + x1) / 2, y: 0.01, z: (z0 + z1) / 2, r: 0.015, cast: false }),
    );

  yield;
  // ---- copy room ----
  const cp = copier();
  cp.position.set(-2.95, 0, CS + T / 2 + 0.36);
  root.add(cp);
  const fax = new THREE.Group();
  fax.add(rbox(0.8, 0.44, 0.5, '#9ea4ad', { r: 0.02 }));
  fax.add(rbox(0.46, 0.14, 0.36, '#dadcd8', { x: -0.1, y: 0.44, r: 0.02 }));
  fax.add(rbox(0.2, 0.08, 0.14, PAL.paper, { x: 0.25, y: 0.44, r: 0.01 }));
  fax.position.set(-5.4, 0, CS + T / 2 + 0.3);
  root.add(fax);
  const sh1 = shelf(0.95, 1.1, 0.4, { fill: 'paper', seed: 3 });
  sh1.rotation.y = Math.PI / 2;
  sh1.position.set(X0 + 0.28, 0, 3.6);
  root.add(sh1);
  const sh3 = shelf(0.95, 1.1, 0.4, { fill: 'box', seed: 5 });
  sh3.rotation.y = Math.PI / 2;
  sh3.position.set(X0 + 0.28, 0, 4.8);
  root.add(sh3);
  const work = new THREE.Group();
  work.add(rbox(1.5, 0.04, 0.8, '#d5d6d3', { y: 0.42, r: 0.01 }));
  for (const [x, z] of [
    [-0.68, -0.34],
    [0.68, -0.34],
    [-0.68, 0.34],
    [0.68, 0.34],
  ])
    work.add(rbox(0.05, 0.42, 0.05, PAL.deskLeg, { x, z, r: 0.01 }));
  for (let i = 0; i < 4; i++)
    work.add(rbox(0.22, 0.03 + (i % 2) * 0.04, 0.3, PAL.paper, { x: -0.5 + i * 0.32, y: 0.46, r: 0.005 }));
  work.position.set(-4.4, 0, 4.7);
  root.add(work);
  for (const [x, z, s] of [
    [-2.7, 5.9, 0.4],
    [-3.15, 5.95, 0.34],
    [-6.5, 5.9, 0.36],
  ])
    root.add(rbox(s, s * 0.8, s, PAL.box, { x, z, r: 0.02 }));
  root.add(
    rbox(0.26, 0.32, 0.26, '#b8453e', { x: -2.55, z: 4.6, r: 0.03 }),
    rbox(0.26, 0.3, 0.26, '#4f8a55', { x: -2.55, z: 5.0, r: 0.03 }),
  );
  {
    const sd = new THREE.Group();
    sd.add(
      rbox(0.7, 0.04, 0.45, '#d5d6d3', { y: 0.4, r: 0.01 }),
      rbox(0.05, 0.4, 0.4, PAL.deskLeg, { x: -0.3, r: 0.01 }),
      rbox(0.05, 0.4, 0.4, PAL.deskLeg, { x: 0.3, r: 0.01 }),
      rbox(0.12, 0.05, 0.05, '#3a3f48', { x: -0.15, y: 0.44, r: 0.01 }),
      rbox(0.2, 0.05, 0.28, PAL.paper, { x: 0.15, y: 0.44, r: 0.004 }),
    );
    sd.position.set(-6.2, 0, 5.9);
    root.add(sd);
  }

  {
    const s4 = shelf(1.2, 1.0, 0.36, { fill: 'binders', seed: 9 });
    s4.rotation.y = -Math.PI / 2;
    s4.position.set(-2.45, 0, 5.4);
    root.add(s4);
  }
  yield;
  // ---- kitchenette (給湯室) ----
  const ct = counter(1.5);
  ct.userData.noBatch = true; // Its top overlaps the tray and sink plate.
  ct.position.set(0.95, 0, CS + T / 2 + 0.3);
  root.add(ct);
  const sinkPlate = rbox(0.36, 0.02, 0.3, '#8d939b', { x: 0.55, y: 0.5, z: CS + 0.36, r: 0.01, cast: false });
  sinkPlate.userData.noBatch = true;
  root.add(sinkPlate);
  root.add(
    rbox(0.22, 0.32, 0.24, '#2c3038', { x: 1.1, y: 0.5, z: CS + 0.36, r: 0.03 }),
    rbox(0.1, 0.1, 0.1, '#3e444e', { x: 1.1, y: 0.56, z: CS + 0.46, r: 0.02 }),
  );
  const kpot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 0.2, 12),
    mat('#d4d6d8', { roughness: 0.35, metalness: 0.3 }),
  );
  kpot.position.set(1.45, 0.6, CS + 0.36);
  root.add(sh(kpot));
  const mw = new THREE.Group();
  mw.add(rbox(0.46, 0.26, 0.34, '#e8e8e4', { r: 0.03 }));
  mw.add(rbox(0.28, 0.18, 0.02, '#2b2f37', { x: -0.04, y: 0.04, z: 0.172, r: 0.01, cast: false }));
  mw.position.set(1.5, 0, 4.3);
  mw.rotation.y = -Math.PI / 2;
  const side = counter(1.3);
  side.rotation.y = -Math.PI / 2;
  side.position.set(1.5, 0, 4.3);
  root.add(side);
  mw.position.y = 0.5;
  mw.position.x = 1.45;
  root.add(mw);
  const fr = fridge();
  fr.position.set(-1.8, 0, CS + T / 2 + 0.32);
  root.add(fr);
  const t2 = table2();
  t2.position.set(-0.8, 0, 4.6);
  root.add(t2);
  root.add(rbox(0.22, 0.3, 0.22, '#5c6b86', { x: -1.9, z: 6.0, r: 0.02 }));
  {
    const wc = waterCooler();
    wc.position.set(-1.9, 0, 3.6);
    root.add(wc);
  }
  {
    const cb = counter(1.0);
    cb.rotation.y = Math.PI / 2;
    cb.position.set(-1.85, 0, 4.9);
    root.add(cb);
    const kt2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.16, 12),
      mat('#c9ccd0', { roughness: 0.35, metalness: 0.3 }),
    );
    kt2.position.set(-1.85, 0.56, 4.7);
    root.add(sh(kt2));
    root.add(rbox(0.3, 0.12, 0.2, '#e8e4da', { x: -1.85, y: 0.5, z: 5.1, r: 0.01 }));
  }
  yield;
  // a low sideboard against the front wall with the team's cups and a tea tin
  {
    const sb = new THREE.Group();
    sb.add(rbox(1.0, 0.3, 0.3, '#8a909a', { r: 0.015 }), rbox(1.04, 0.03, 0.34, '#c9ccd0', { y: 0.3, r: 0.01 }));
    for (let i = 0; i < 4; i++) {
      const cu = mug(['#e9e6df', '#7aa0c8', '#c96a5a', '#9cc39a'][i]);
      cu.scale.setScalar(0.85);
      cu.position.set(-0.36 + i * 0.13, 0.33, 0.02);
      sb.add(cu);
    }
    const tin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12),
      mat('#4f7a64', { roughness: 0.4, metalness: 0.3 }),
    );
    tin.position.set(0.3, 0.39, 0);
    sb.add(sh(tin));
    sb.position.set(0.2, 0, 6.12);
    root.add(sb);
  }
  {
    const p = plant({ size: 0.9, seed: 8 });
    p.position.set(1.4, 0, 6.0);
    root.add(p);
  }

  yield;
  // ---- toilets: men's and women's ----
  for (const x0 of [1.8, 4.4]) {
    for (let i = 0; i < 2; i++) {
      const s = stall(0.9, 1.0);
      s.rotation.y = Math.PI;
      s.position.set(x0 + 0.62 + i * 0.95, 0, 5.85);
      root.add(s);
    }
    // (the urinals and the changing shelf stood in the doorways and read as blobs: removed, Jørgen 2026-09-28)
  }

  yield;
  // ---- people ----
  const scaleUp = (r) => {
    r.root.scale.multiplyScalar(K);
    return r;
  };
  const seatAt = (r, d, ry) => {
    sit(r);
    r.root.position.x = d.seat[0];
    r.root.position.z = d.seat[1] - d.face * 0.02;
    r.root.position.y += 0.03 * K;
    r.root.rotation.y = ry;
    armsHold(r, -1.2, 0.35);
    r.seated = true;
  };

  const kenji = scaleUp(PEOPLE.kenji());
  seatAt(kenji, dN(0), 0);
  root.add(kenji.root);
  yield;
  const nao = scaleUp(PEOPLE.worker(1));
  seatAt(nao, dN(1), 0);
  root.add(nao.root);
  yield;
  const hiro = scaleUp(PEOPLE.worker(2));
  seatAt(hiro, dS(2), Math.PI);
  root.add(hiro.root);
  yield;
  const mori = scaleUp(PEOPLE.mori());
  sit(mori);
  mori.root.position.set(2.16, mori.root.position.y + 0.03 * K, -3.36);
  mori.root.rotation.y = -Math.PI / 2;
  armsHold(mori, -1.2, 0.35);
  mori.seated = true;
  root.add(mori.root);
  yield;
  const emi = scaleUp(PEOPLE.emi());
  emi.root.position.set(-5.3, 0, -1.35);
  emi.root.rotation.y = Math.PI;
  root.add(emi.root);
  yield;
  const emiBlob = blob(0.55, 0.38);
  emiBlob.position.set(-5.3, 0.004, -1.35);
  root.add(emiBlob);
  const yui = scaleUp(PEOPLE.yui());
  yui.root.position.set(-2.95, 0, 3.55);
  yui.root.rotation.y = Math.PI;
  root.add(yui.root);
  yield;
  const sota = scaleUp(PEOPLE.sota());
  sota.root.position.set(1.05, 0, 3.5);
  sota.root.rotation.y = Math.PI;
  root.add(sota.root);
  yield;
  const sm2 = mug('#c96a5a');
  sm2.position.set(0, -0.26, 0.02);
  sota.arms[1].add(sm2);
  sota.arms[1].rotation.x = -0.9;
  for (const [x, z] of [dN(0).seat]) {
    const b = blob(0.6, 0.3);
    b.position.set(x, 0.004, z);
    root.add(b);
    yield;
  }

  yield;
  // ================= dressing and life (world agent, production pass) =================
  const life = { steam: [], dust: [], pools: new THREE.Group() };
  root.add(life.pools);
  const pool = (x, z, r, o) => life.pools.add(lightPool(x, z, r, { y: 0.02, ...o }));
  yield;
  // warm pools under every hidden ceiling lamp, and long soft streaks where the fittings shine in the floor
  for (const [x, z, k] of [
    [-2.2, -3.4, 1.5],
    [0.8, -3.4, 1.5],
    [-0.6, -1.0, 1.0],
    [-5.6, -1.6, 1.3],
    [5.2, -3.4, 0.9],
    [-4.4, 1.3, 1.1],
    [0.2, 1.3, 1.1],
    [4.6, 1.3, 1.1],
    [-4.6, 4.2, 1.3],
    [-0.2, 4.2, 1.2],
    [3.1, 4.4, 0.9],
    [5.7, 4.4, 0.9],
    [-5.6, -5.0, 0.8],
  ]) {
    pool(x, z, 1.2, { k: (0.2 + 0.12 * k) * (z > CS ? 0.8 : 1) });
    pool(x, z + 0.3, 0.42, { k: (0.14 + 0.08 * k) * (z > CS ? 0.5 : 1), sx: 0.55, sz: 2.4, color: '#fff0d8' });
  }
  for (const x of [-5.6, -2.6, 0.9, 4.0]) {
    pool(x, 1.2, 0.95, { k: 0.3, sx: 1.6, sz: 0.9 });
    pool(x, 1.35, 0.35, { k: 0.2, sx: 0.6, sz: 2.2, color: '#fff0d8' });
    yield;
  }
  pool(-4.62, -1.8, 0.6, { k: 0.2, color: '#8fb8ff' }); // vending glow on the floor
  pool(X1 - 0.35, 1.25, 0.55, { k: 0.18, color: '#7fe0a4' }); // the exit sign

  yield;
  // ---- main office ----
  // carpet tiles under the island, two greys in a checker, so the work area reads as its own zone
  {
    const cg = new THREE.Group();
    const x0 = -3.9,
      x1 = 3.1,
      z0 = -5.75,
      z1 = -1.95,
      t = 0.5;
    cg.add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.01, z1 - z0), mat('#7c8390', { roughness: 0.95 })));
    const alt = mat('#737a87', { roughness: 0.95 });
    for (let x = x0; x < x1 - 0.01; x += t)
      for (let z = z0; z < z1 - 0.01; z += t)
        if ((Math.round((x - x0) / t) + Math.round((z - z0) / t)) % 2) {
          const q = new THREE.Mesh(new THREE.BoxGeometry(t - 0.01, 0.012, t - 0.01), alt);
          q.position.set(x + t / 2 - (x0 + x1) / 2, 0.001, z + t / 2 - (z0 + z1) / 2);
          cg.add(q);
        }
    cg.children.forEach((m) => {
      m.receiveShadow = true;
    });
    cg.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2);
    root.add(cg);
  }
  yield;
  // under the desks: bins, a bag, cable boxes
  for (const d of desks) {
    const b = rbox(0.16, 0.2, 0.16, '#5b6474', { x: d.x + 0.36, z: d.z - d.face * 0.05, r: 0.02 });
    root.add(b);
    yield;
  }
  root.add(rbox(0.26, 0.2, 0.12, '#3d4556', { x: DX[0] - 0.3, z: ZN + 0.55, r: 0.04 }));
  yield;
  // printer on a stand against the machine-room wall, with a tray of printouts
  {
    const pr = new THREE.Group();
    pr.add(
      rbox(0.56, 0.4, 0.46, '#8a909a', { r: 0.02 }),
      rbox(0.52, 0.26, 0.44, '#d7d8d4', { y: 0.4, r: 0.03 }),
      rbox(0.3, 0.03, 0.2, PAL.paper, { y: 0.66, z: 0.06, r: 0.005 }),
      rbox(0.1, 0.03, 0.06, '#5ec28b', { x: 0.18, y: 0.66, z: -0.12, r: 0.01, cast: false }),
    );
    pr.rotation.y = -Math.PI / 2;
    pr.position.set(3.0, 0, -2.4);
    root.add(pr);
  }
  {
    const p = plant({ size: 0.85, seed: 12 });
    p.position.set(3.05, 0, -1.95);
    root.add(p);
  }
  yield;
  // desk lamps on the chief's desk and a stack of trays
  root.add(
    rbox(0.28, 0.12, 0.2, '#5b6474', { x: 1.5, y: 0.42, z: -3.85, r: 0.01 }),
    rbox(0.26, 0.02, 0.18, PAL.paper, { x: 1.5, y: 0.54, z: -3.85, r: 0.004 }),
  );
  yield;
  // the wall clock gets real hands (8:55 when the day starts here, moving with the game clock)
  const officeHands = clockHands(0.15);
  officeHands.position.set(-1.6, 1.3, Z0 + T / 2 + 0.03);
  root.add(officeHands);
  secHand.visible = false;
  yield;
  // cable tray along the island's spine
  root.add(rbox(3.5, 0.03, 0.08, '#5a606b', { x: -0.8, y: 0.01, z: (ZN + ZS) / 2, r: 0.01, cast: false }));

  yield;
  // ---- lift lobby ----
  {
    const it = textTexture(
      (c, W, H) => {
        c.fillStyle = '#1d2027';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#ffb566';
        c.font = '700 44px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('B2', W / 2, H / 2 + 2);
      },
      128,
      56,
    );
    const ind = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.1), new THREE.MeshBasicMaterial({ map: it }));
    ind.position.set(-5.45, 1.37, -3.4 + T / 2 + 0.036);
    root.add(ind);
  }
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.012, 0.8), mat('#4a5263', { roughness: 0.95 }));
    m.position.set(-5.45, 0.006, -2.75);
    m.receiveShadow = true;
    root.add(m);
  }
  {
    const bin2 = rbox(0.3, 0.46, 0.26, '#5c6b86', { x: -6.72, z: -2.55, r: 0.03 });
    root.add(bin2);
  }

  yield;
  // ---- corridor ----
  // a muted guide line down the corridor floor and a runner mat at the office door
  root.add(rbox(X1 - X0 - 0.4, 0.004, 0.06, '#7d858f', { x: 0, y: 0.004, z: 1.72, r: 0.002, cast: false }));
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.012, 0.7), mat('#4a5263', { roughness: 0.95 }));
    m.position.set(-0.25, 0.006, 0.62);
    m.receiveShadow = true;
    root.add(m);
  }
  yield;
  // AED box (green light), a drinking fountain, a tall plant by the fire exit
  {
    const a = new THREE.Group();
    a.add(
      rbox(0.3, 0.36, 0.1, '#e9ecef', { r: 0.02 }),
      rbox(0.2, 0.08, 0.02, null, { y: 0.24, z: 0.05, r: 0.01, m: emissive('#7fe0a4', '#3fbf6e', 1.4), cast: false }),
      rbox(0.14, 0.14, 0.02, '#3fbf6e', { y: 0.06, z: 0.05, r: 0.01, cast: false }),
    );
    a.position.set(4.3, 0.55, CN + T / 2 + 0.05);
    root.add(a);
  }
  {
    const f = new THREE.Group();
    f.add(rbox(0.32, 0.62, 0.26, '#c9ccd0', { r: 0.03 }), rbox(0.3, 0.05, 0.24, '#9aa0a8', { y: 0.62, r: 0.02 }));
    f.position.set(6.55, 0, CN + T / 2 + 0.15);
    root.add(f);
  }
  {
    const p = plant({ size: 1.05, seed: 17, tall: 1.3 });
    p.position.set(6.6, 0, 2.05);
    root.add(p);
  }
  {
    const p = plant({ size: 0.95, seed: 19 });
    p.position.set(-6.65, 0, 2.05);
    root.add(p);
  }
  yield;
  // recycling row by the kitchenette door: burnable, cans, paper (colour only)
  for (const [x, c] of [
    [-1.55, '#4f6f9a'],
    [-1.28, '#6a8f5c'],
    [-1.01, '#b58c46'],
  ]) {
    root.add(
      rbox(0.24, 0.42, 0.24, c, { x, z: 2.1, r: 0.03 }),
      rbox(0.2, 0.02, 0.2, '#2c3038', { x, y: 0.42, z: 2.1, r: 0.01, cast: false }),
    );
  }

  yield;
  // ---- copy room ----
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.5), mat('#454c5a', { roughness: 0.95 }));
    m.position.set(-2.95, 0.006, 3.45);
    m.receiveShadow = true;
    root.add(m);
  }
  yield;
  // shredder, a pallet of paper reams, a paper box stack by the copier, a cutter and stapler on the table
  {
    const s2 = new THREE.Group();
    s2.add(
      rbox(0.36, 0.5, 0.3, '#3a3f48', { r: 0.02 }),
      rbox(0.3, 0.03, 0.08, '#15181d', { y: 0.5, r: 0.005, cast: false }),
    );
    s2.position.set(-6.45, 0, 2.85);
    root.add(s2);
  }
  {
    const pl = new THREE.Group();
    pl.add(rbox(0.8, 0.1, 0.6, '#8a7a64', { r: 0.01 }));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        pl.add(
          rbox(0.36, 0.14, 0.26, i % 2 ? '#e7e3d8' : '#dcd8cc', {
            x: -0.19 + j * 0.38,
            y: 0.1 + i * 0.145,
            z: 0,
            r: 0.01,
          }),
        );
        pl.add(
          rbox(0.365, 0.03, 0.265, '#4a74b8', {
            x: -0.19 + j * 0.38,
            y: 0.155 + i * 0.145,
            z: 0,
            r: 0.004,
            cast: false,
          }),
        );
      }
    pl.position.set(-4.7, 0, 5.95);
    root.add(pl);
  }
  for (let i = 0; i < 3; i++)
    root.add(
      rbox(0.34, 0.14, 0.26, i % 2 ? '#e7e3d8' : '#dcd8cc', { x: -2.45, y: i * 0.145, z: 3.3, r: 0.01 }),
      rbox(0.345, 0.03, 0.265, '#c9473f', { x: -2.45, y: i * 0.145 + 0.055, z: 3.3, r: 0.004, cast: false }),
    );
  root.add(
    rbox(0.36, 0.04, 0.26, '#6d747e', { x: -4.0, y: 0.46, z: 4.55, r: 0.01 }),
    rbox(0.12, 0.05, 0.04, '#3a3f48', { x: -4.75, y: 0.46, z: 4.9, r: 0.01 }),
  );
  {
    const p = plant({ size: 0.8, seed: 21 });
    p.position.set(-2.6, 0, 6.05);
    root.add(p);
  }
  yield;
  // a paper trolley parked by the shelves
  {
    const tr = new THREE.Group();
    tr.add(rbox(0.6, 0.04, 0.4, '#6d747e', { y: 0.1, r: 0.01 }), rbox(0.6, 0.04, 0.4, '#6d747e', { y: 0.5, r: 0.01 }));
    for (const [dx, dz] of [
      [-0.28, -0.18],
      [0.28, -0.18],
      [-0.28, 0.18],
      [0.28, 0.18],
    ])
      tr.add(rbox(0.03, 0.5, 0.03, '#9aa0a8', { x: dx, y: 0.04, z: dz, r: 0.01 }));
    for (let i = 0; i < 2; i++)
      tr.add(
        rbox(0.34, 0.14, 0.26, '#e7e3d8', { x: -0.12 + i * 0.26, y: 0.54, r: 0.01 }),
        rbox(0.34, 0.12, 0.26, '#dcd8cc', { x: -0.12 + i * 0.26, y: 0.14, r: 0.01 }),
      );
    tr.rotation.y = Math.PI / 2;
    tr.position.set(-6.25, 0, 4.2);
    root.add(tr);
  }
  yield;
  // ---- kitchenette ----
  {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 1.6), mat('#56607a', { roughness: 0.95 }));
    rug.position.set(-0.8, 0.006, 4.75);
    rug.receiveShadow = true;
    root.add(rug);
  }
  for (const x of [-0.3 - 0.8, 0.3 - 0.8]) {
    root.add(
      rbox(0.26, 0.04, 0.26, PAL.chair, { x, y: 0.26, z: 4.05, r: 0.02 }),
      rbox(0.03, 0.26, 0.03, PAL.deskLeg, { x, z: 4.05, r: 0.01 }),
    );
    yield;
  }
  {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 10), mat('#e9e6df'));
    k.position.set(-1.0, 0.44, 4.5);
    root.add(k);
  }
  yield;
  // kettle and coffee machine steam; a cleaning rota on the partition
  {
    const s1 = steam({ n: 6, rise: 0.5, size: 0.11, opacity: 0.3 });
    s1.position.set(1.45, 0.72, CS + 0.36);
    root.add(s1);
    life.steam.push(s1);
  }
  {
    const s2 = steam({ n: 5, rise: 0.35, size: 0.08, opacity: 0.22, period: 3.3 });
    s2.position.set(1.1, 0.84, CS + 0.36);
    root.add(s2);
    life.steam.push(s2);
  }
  {
    const s3 = steam({ n: 4, rise: 0.3, size: 0.07, opacity: 0.2, period: 3.0 });
    s3.position.set(-1.0, 0.47, 4.5);
    root.add(s3);
    life.steam.push(s3);
  }
  {
    const rota = new THREE.Group();
    rota.add(rbox(0.5, 0.36, 0.02, '#e9ebee', { r: 0.01, cast: false }));
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 5; j++)
        rota.add(
          rbox(0.07, 0.05, 0.004, (i + j) % 3 ? '#c9ced6' : '#8fb0c9', {
            x: -0.18 + j * 0.09,
            y: 0.06 + i * 0.07,
            z: 0.012,
            r: 0.005,
            cast: false,
          }),
        );
    rota.rotation.y = Math.PI / 2;
    rota.position.set(-2.2 + T / 2 + 0.01, 0.45, 5.7);
    root.add(rota);
  }
  {
    const d = dust([-1.6, 0.0, 0.3, 1.3, 4.0, 5.3], 26, { opacity: 0.4 });
    root.add(d);
    life.dust.push(d);
  }
  yield;
  // ---- toilets ----
  for (const x0 of [1.8, 4.4]) {
    // hand dryer and paper towels over the sink, a mat, a small plant on the sink shelf
    {
      const p = plant({ size: 0.4, seed: 23 + x0 });
      p.position.set(x0 + 2.33, 0.48, 3.55);
      root.add(p);
    }
    yield;
  }
  {
    const mb = new THREE.Group();
    mb.add(rbox(0.32, 0.26, 0.32, '#e0b83a', { r: 0.04 }));
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), mat('#9aa0a8'));
    h.position.set(0.05, 0.6, 0);
    h.rotation.z = 0.25;
    mb.add(sh(h));
    mb.position.set(4.8, 0, 4.85);
    root.add(mb);
  }
  yield;
  // ---- machine room ----
  // an UPS, cable bundles, a step ladder
  root.add(rbox(0.5, 0.7, 0.6, '#4a505b', { x: 6.55, z: -3.3, r: 0.02 }));
  for (let i = 0; i < 4; i++)
    root.add(rbox(0.4, 0.02, 0.01, '#6b7280', { x: 6.55, y: 0.12 + i * 0.1, z: -2.995, r: 0.003, cast: false }));
  {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.03), new THREE.MeshBasicMaterial({ color: '#5fd38f' }));
    l.position.set(6.55, 0.6, -2.995);
    root.add(l);
  }
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6),
      mat(['#3f5f8a', '#5a606b', '#8a6a3a'][i]),
    );
    c.rotation.z = Math.PI / 2;
    c.position.set(5.3, 0.03, -2.2 + i * 0.05);
    root.add(sh(c));
    yield;
  }
  {
    const lad = new THREE.Group();
    for (const s of [-1, 1]) {
      const r = rbox(0.04, 0.9, 0.04, '#b9bdc3', { x: s * 0.18, r: 0.01 });
      r.rotation.x = 0.12;
      lad.add(r);
    }
    for (let i = 0; i < 3; i++)
      lad.add(rbox(0.36, 0.03, 0.12, '#9aa0a8', { y: 0.2 + i * 0.25, z: -0.02 * i, r: 0.01 }));
    lad.position.set(6.6, 0, -0.4);
    root.add(lad);
  }

  yield;
  // ---- P2: fuller toilets, office lower third, machine room light, corridor sconces, contact shadows ----
  for (const x0 of [1.8, 4.4]) {
    // a vanity with two basins and a mirror strip along the right wall (replaces the lone sink visually)
    const v = new THREE.Group();
    v.add(rbox(0.46, 0.44, 1.3, '#8f959f', { r: 0.02 }), rbox(0.5, 0.04, 1.34, '#e3e4e2', { y: 0.44, r: 0.01 }));
    for (const dz of [-0.33, 0.33]) {
      v.add(rbox(0.3, 0.02, 0.3, '#f4f5f5', { x: -0.02, y: 0.48, z: dz, r: 0.04, cast: false }));
      v.add(rbox(0.04, 0.12, 0.04, '#b9bcc0', { x: 0.15, y: 0.48, z: dz, r: 0.01 }));
    }
    v.position.set(x0 + 2.3, 0, 3.55);
    root.add(v);
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.36), mat('#b7c8d4', { roughness: 0.12, metalness: 0.25 }));
    ms.rotation.y = -Math.PI / 2;
    ms.position.set(x0 + 2.53, 0.78, 3.55);
    root.add(ms);
    {
      const pb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.1, 0.3, 14),
        mat('#6d747e', { roughness: 0.5, metalness: 0.3 }),
      );
      pb.position.set(x0 + 2.3, 0.15, 4.5);
      root.add(sh(pb));
    } // pedal bin
    yield;
  }
  {
    const ws = new THREE.Group();
    ws.add(rbox(0.3, 0.44, 0.03, '#e0b83a', { r: 0.02 }));
    ws.rotation.x = -0.28;
    ws.position.set(3.0, 0, 4.9);
    root.add(ws);
  } // wet-floor sign
  yield;
  // office: low binder cabinets along the corridor wall, a whiteboard on a stand, mugs on the desks
  for (const d of desks) {
    const m2 = mug(
      ['#e9e6df', '#7aa0c8', '#c96a5a', '#9cc39a', '#e2c26a', '#e9e6df'][(d.i + (d.row === 'n' ? 3 : 0)) % 6],
    );
    m2.position.set(d.x - 0.3, 0.42, d.z + d.face * 0.12);
    root.add(m2);
    yield;
  }
  yield;
  // machine room: cool fill, a raised-floor grid, lit rack fronts, LEDs that blink
  {
    const cf = new THREE.PointLight('#9fc4ff', 1.6, 4.5, 1.6);
    cf.position.set(5.2, 1.3, -3.6);
    scene.add(cf);
  }
  pool(5.2, -3.6, 1.6, { k: 0.12, color: '#9fc4ff' });
  pool(5.3, -1.4, 1.1, { k: 0.1, color: '#9fc4ff' });
  life.leds = ledLights(root);

  yield;
  // a waist-high divider shelf behind the island's south row: binders facing the island, plants and trays on top
  {
    const dv = shelf(1.4, 0.56, 0.34, { fill: 'binders', seed: 13 });
    dv.position.set(-1.28, 0, -1.35);
    root.add(dv);
    root.add(rbox(1.44, 0.03, 0.38, '#c9ccd0', { x: -1.28, y: 0.56, z: -1.35, r: 0.01 }));
    for (const [x, sd] of [
      [-1.8, 33],
      [-0.75, 35],
    ]) {
      const p = plant({ size: 0.5, seed: sd });
      p.position.set(x, 0.58, -1.35);
      root.add(p);
    }
    root.add(
      rbox(0.3, 0.06, 0.24, PAL.dark, { x: -1.28, y: 0.58, z: -1.35, r: 0.01 }),
      rbox(0.28, 0.03, 0.22, PAL.paper, { x: -1.28, y: 0.64, z: -1.35, r: 0.004 }),
    );
  }
  yield;
  // tall steel storage by the machine-room wall instead of loose boxes, with the boxes on top
  for (const z of [-1.55, -0.95]) {
    const sc = new THREE.Group();
    sc.add(
      rbox(0.5, 1.1, 0.45, '#8a909a', { r: 0.015 }),
      rbox(0.012, 1.0, 0.01, '#6d737d', { y: 0.05, z: 0.228, r: 0.003, cast: false }),
      rbox(0.03, 0.14, 0.03, '#c9cdd2', { x: 0.05, y: 0.55, z: 0.24, r: 0.008, cast: false }),
    );
    sc.rotation.y = -Math.PI / 2;
    sc.position.set(3.05, 0, z);
    root.add(sc);
    yield;
  }
  root.add(rbox(0.4, 0.26, 0.34, PAL.box, { x: 3.05, y: 1.1, z: -1.5, r: 0.02 }));
  yield;
  // the office doorway gets a frame so it reads as a door, not a hole
  {
    const fm = mat(PAL.doorFrame);
    for (const x of [-0.8, 0.3]) root.add(rbox(0.08, 1.3, T + 0.04, null, { x, z: CN, m: fm, r: 0.01 }));
    root.add(rbox(1.18, 0.08, T + 0.04, null, { x: -0.25, y: 1.26, z: CN, m: fm, r: 0.01 }));
  }
  yield;
  // machine room: a tape shelf where the floor fan was, LED glow on the floor in front of the racks
  {
    const ts = shelf(0.9, 1.0, 0.36, { fill: 'binders', seed: 41 });
    ts.rotation.y = -Math.PI / 2;
    ts.position.set(6.7, 0, -1.3);
    root.add(ts);
  }
  for (let i = 0; i < 4; i++) pool(4.1 + i * 0.72, Z0 + 0.98, 0.34, { k: 0.22, color: '#6fe0b0', sx: 0.9, sz: 0.6 });
  for (let i = 0; i < 3; i++) pool(4.4 + i * 0.72, -2.83, 0.34, { k: 0.22, color: '#6fe0b0', sx: 0.9, sz: 0.6 });
  root.add(rbox(3.0, 0.03, 0.12, '#5a606b', { x: 5.2, y: 1.34, z: -4.4, r: 0.01, cast: false })); // cable ladder between the rack rows
  yield;
  // corridor, right half: a second bench under a noticeboard, and warm pools
  {
    const bc2 = bench(1.2, { seats: 2 });
    bc2.position.set(3.45, 0, 0.62);
    root.add(bc2);
  }

  yield;
  // copy room, lower half: supply cabinets along the front wall, a pinboard on the partition, taped cartons
  for (const x of [-3.9, -3.3]) {
    const sc = new THREE.Group();
    sc.add(
      rbox(0.56, 0.72, 0.4, '#8a909a', { r: 0.015 }),
      rbox(0.012, 0.66, 0.41, '#6d737d', { y: 0.03, r: 0.003, cast: false }),
      rbox(0.54, 0.02, 0.38, '#a3a9b2', { y: 0.72, r: 0.006 }),
    );
    sc.add(rbox(0.3, 0.1, 0.24, '#e7e3d8', { x: -0.1, y: 0.74, r: 0.01 }));
    sc.position.set(x, 0, 6.1);
    root.add(sc);
    yield;
  }
  {
    const pb = pinboard(0.7, 0.36);
    pb.rotation.y = -Math.PI / 2;
    pb.position.set(-2.2 - T / 2 - 0.01, 0.46, 3.9);
    root.add(pb);
  }
  for (const [x, z, s2] of [
    [-2.7, 5.9, 0.4],
    [-3.15, 5.95, 0.34],
    [-6.5, 5.9, 0.36],
    [2.3, -0.35, 0.34],
  ])
    root.add(rbox(s2 + 0.005, 0.02, 0.08, '#c9b089', { x, y: s2 * 0.8 - 0.005, z, r: 0.004, cast: false }));
  pool(-3.0, 3.5, 0.8, { k: 0.26 });
  pool(-4.4, 4.7, 1.0, { k: 0.26 });
  pool(-0.8, 4.7, 0.9, { k: 0.26 });
  pool(4.1, 3.55, 0.7, { k: 0.2, sx: 0.8, sz: 1.5 });
  pool(6.7, 3.55, 0.7, { k: 0.2, sx: 0.8, sz: 1.5 });
  yield;
  // corridor: warm sconces washing the north wall, and a pictogram safety poster
  for (const x of [-3.75, 0.8, 3.2]) {
    const l = wallLamp(0.36, 0.1);
    l.position.set(x, 0.9, CN + T / 2 + 0.01);
    root.add(l);
    pool(x, CN + 0.55, 0.7, { k: 0.26, sx: 1.1, sz: 0.8 });
    yield;
  }
  {
    const pt = textTexture(
      (g, W, H) => {
        g.fillStyle = '#f1efe9';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#3f6fae';
        g.fillRect(0, 0, W, 34);
        g.fillStyle = '#2b3140';
        g.beginPath();
        g.arc(W / 2, 110, 36, 0, Math.PI * 2);
        g.fill();
        g.fillRect(W / 2 - 28, 150, 56, 90);
        g.fillStyle = '#e0b83a';
        g.beginPath();
        g.moveTo(40, 300);
        g.lineTo(W - 40, 300);
        g.lineTo(W / 2, 250);
        g.fill();
      },
      200,
      320,
    );
    const pp = new THREE.Group();
    pp.add(rbox(0.32, 0.48, 0.02, '#8a909a', { r: 0.01, cast: false }));
    const pl2 = plane(0.28, 0.44, pt);
    pl2.position.set(0, 0.24, 0.012);
    pp.add(pl2);
    pp.position.set(2.05, 0.55, CN + T / 2 + 0.01);
    root.add(pp);
  }
  life.hands = officeHands;

  yield;
  groundShadows(root, {
    skip: new Set([kenji.root, nao.root, hiro.root, mori.root, emi.root, yui.root, sota.root, life.pools]),
  });

  yield;
  // ---- walk grid ----
  const nav = new Nav(X0, X1, Z0, Z1, 0.1);
  const B = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  const t2w = T / 2 + 0.02;
  const wallsX = [
    [X0, -6.75, -3.4],
    [-6.15, -5.95, -3.4],
    [-4.95, -4.2, -3.4],
    [-4.2, -0.8, CN],
    [0.3, 4.7, CN],
    [5.5, X1, CN],
    [X0, -4.4, CS],
    [-3.6, -0.8, CS],
    [0.1, 2.3, CS],
    [2.9, 4.9, CS],
    [5.5, X1, CS],
    [X0, X1, Z1 + 0.05],
    [X0, X1, Z0 - 0.05],
  ];
  for (const [a, b, z] of wallsX) B(a, b, z - t2w, z + t2w);
  const wallsZ = [
    [Z0, CN, -4.2],
    [Z0, CN, 3.4],
    [CS, Z1, -2.2],
    [CS, Z1, 1.8],
    [CS, Z1, 4.4],
  ];
  for (const [a, b, x] of wallsZ) B(x - t2w, x + t2w, a, b);
  B(-5.95, -4.95, -3.4, -3.3); // lift (you don't walk into it)
  B(-4.98, -4.26, -2.6, -2.0);
  B(-4.6, -4.3, -1.7, -1.4); // vending, bin
  B(X0, -6.4, -2.25, -0.55);
  B(-6.9, -6.4, -0.3, 0.2); // bench, plant
  B(X0, -4.2, Z0, -3.45); // stairwell (not walkable today)
  B(-4.15, -2.8, Z0, Z0 + 0.5);
  B(-4.1, -3.6, -5.15, -4.65);
  B(1.8, 3.35, Z0, Z0 + 0.62);
  B(-4.1, -3.6, -0.6, -0.1);
  B(2.05, 3.2, -1.8, -0.15);
  B(-3.5, -3.1, -2.4, -2.0);
  B(-2.9, -1.9, -1.5, -0.55);
  B(-4.1, -3.6, -3.2, -2.8);
  B(-2.62, 1.0, ZN - 0.36, ZS + 0.36); // island
  for (const d of desks)
    B(
      d.seat[0] - 0.24,
      d.seat[0] + 0.24,
      Math.min(d.seat[1], d.seat[1] + d.face * 0.25) - 0.02,
      Math.max(d.seat[1], d.seat[1] + d.face * 0.25) + 0.02,
    );
  B(1.15, 1.95, -4.0, -2.75);
  B(1.95, 2.45, -3.6, -3.1); // chief's desk and chair
  yield;
  // machine room: racks, fan, cart; the door keeps it shut until it opens
  B(3.7, 6.9, Z0, Z0 + 0.9);
  B(4.0, 6.5, -3.7, -2.9);
  B(3.9, 4.5, -1.55, -1.05);
  nav.blockTagged('chair', 5.2, 5.8, -1.6, -1.0);
  B(6.45, 6.95, -1.8, -0.8);
  nav.blockTagged('mdoor', 4.7, 5.5, CN - 0.2, CN + 0.12); // shut; when it opens the leaf stands along the room's side of the jamb (see places/office.js)
  B(6.0, 6.6, 1.85, 2.25); // trolley
  B(-3.35, -2.55, CS, CS + 0.75);
  B(-5.8, -5.0, CS, CS + 0.58);
  B(X0, X0 + 0.5, 3.1, 5.3);
  B(-5.2, -3.6, 4.25, 5.15);
  B(-4.25, -2.35, 5.6, Z1);
  B(-6.75, -6.25, 5.65, Z1);
  B(-2.75, -2.35, 4.4, 5.2);
  B(0.15, 1.75, CS, CS + 0.62);
  B(1.15, 1.8, 3.6, 5.0);
  B(-2.15, -1.45, CS, CS + 0.62);
  B(-1.25, -0.35, 4.25, 5.3);
  B(-2.05, -1.75, 5.85, Z1);
  B(1.2, 1.6, 5.8, Z1);
  for (const x0 of [1.8, 4.4]) {
    B(x0 + 0.1, x0 + 2.55, 5.3, Z1);
    B(x0 + 2.15, x0 + 2.55, 3.15, 3.65);
    B(x0 + 2.2, x0 + 2.5, 3.85, 4.15);
    yield;
  }
  B(-5.1, -4.6, 1.85, CS);
  B(3.15, 3.65, 1.85, CS);
  B(1.45, 1.75, 1.85, 2.1);
  B(0.55, 1.12, 1.95, CS);
  B(-2.65, -2.15, 1.85, CS);
  B(-6.6, -5.8, 5.6, Z1);
  B(-3.95, -3.35, 2.9, 3.5);
  B(-2.1, -1.7, 3.4, 3.8);
  B(-2.15, -1.55, 4.35, 5.45);
  B(-2.7, -2.25, 4.8, 6.0);
  B(-4.2, -3.7, -3.1, -1.6);
  B(-2.7, -1.1, 0.35, 0.9);
  nav.blockTagged('emi', -5.5, -5.1, -1.55, -1.15);
  yield;
  // production dressing
  B(2.7, 3.3, -2.7, -2.1);
  B(2.85, 3.25, -2.15, -1.75); // printer, plant
  B(-6.9, -6.55, -2.75, -2.35); // lobby bin
  B(4.15, 4.45, CN, CN + 0.2);
  B(6.35, 6.75, CN, CN + 0.35);
  B(6.4, 6.8, 1.85, 2.25);
  B(-6.85, -6.45, 1.85, 2.25);
  B(-1.7, -0.85, 1.95, CS); // recycling row
  B(-6.65, -6.25, CS, 3.05);
  B(-5.1, -4.3, 5.65, Z1);
  B(-2.65, -2.25, CS, 3.45);
  B(-2.8, -2.4, 5.85, 6.25);
  B(-1.25, -0.35, 3.9, 4.25);
  B(-6.5, -6.0, 3.85, 4.55); // kitchen stools, paper trolley
  B(4.6, 5.0, 4.65, 5.05);
  B(6.3, 6.8, -3.6, -2.95);
  B(6.4, 6.8, -0.6, -0.2); // mop bucket, UPS, ladder
  for (const x0 of [1.8, 4.4]) {
    B(x0 + 2.05, x0 + 2.55, 2.85, 4.25);
    B(x0 + 2.15, x0 + 2.45, 4.35, 4.65);
    yield;
  }
  B(2.85, 3.15, 4.8, 5.0);
  B(2.8, 4.1, 0.35, 0.9);
  B(2.8, 3.3, -1.8, -0.7);
  B(-2.0, -0.55, -1.55, -1.15);

  for (const r of [nao, hiro, yui, sota]) r.root.visible = false;
  const world = {
    root,
    scene,
    sun,
    nav,
    desks,
    dN,
    dS,
    kenji,
    nao,
    hiro,
    mori,
    emi,
    emiBlob,
    yui,
    sota,
    tama,
    covers,
    leaves,
    card,
    X0,
    X1,
    Z0,
    Z1,
    secHand,
    fanHead: fan.userData.head,
    fanRotor: fan.userData.rotor,
    fan2Head: fan2.children[2],
    copier: cp,
    myChair,
    machineDoor: md,
    vendingPos: [-4.62, -1.75],
    coffeePos: [1.1, CS + 0.36],
  };
  world.life = life;
  world.update = (t) => {
    for (const s2 of life.steam) s2.userData.update(t);
    for (const d of life.dust) d.userData.update(t);
    liveScreens.update(t);
    for (let i = 0; i < life.leds.length; i++) life.leds.set(i, Math.sin(t * (3 + (i % 5)) + i * 1.7) > -0.6);
    for (const r of [kenji, nao, hiro, mori, yui, sota]) idle(r, t);
    if (!emi._walk) idle(emi, t);
    if (!kenji.gesturing) kenji.arms[1].rotation.x = -1.2 + Math.max(0, Math.sin(t * 6)) * 0.06;
    nao.arms[0].rotation.x = -1.2 + Math.max(0, Math.sin(t * 5 + 1)) * 0.06;
    mori.head.rotation.x = -0.1 + Math.sin(t * 0.4) * 0.03;
    yui.arms[0].rotation.x = -0.8 + Math.sin(t * 1.3) * 0.2;
    sota.arms[1].rotation.x = -0.9 + Math.max(0, Math.sin(t * 0.5)) * -0.4;
  };
  world.openLift = (k) => {
    leaves[0].position.x = -0.255 - k * 0.47;
    leaves[1].position.x = 0.255 + k * 0.47;
  };
  world.lift = [-5.45, -3.4];
  return world;
}
