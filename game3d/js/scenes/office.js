// Place 3: the office floor seen from above with cutaway walls (game3d/ref/3-office.png), in the muted
// palette of the lobby. Local space: floor y = 0, the lift at the bottom centre (+z, near the camera).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, mat, emissive, rbox, plant, wall, tileFloor, door, desk, officeChair, filingCabinet, shelf, pinboard, clock, textTexture, plane, JP_FONT, sh, monitor, bench } from '../props.js';
import { PEOPLE, sit, armsHold, idle, mug } from '../cast.js';
import { cat } from '../train/people.js';
import { blob, Nav } from '../engine.js';

export const K = 1.18;              // people scale in the office and lobby
const WH = 1.45, T = 0.16;
export const X0 = -7, X1 = 7, Z0 = -6.4, Z1 = 6.4;
export const CN = 0.2, CS = 2.4; // corridor north and south wall lines

function toiletSign(kind) {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = kind === 'm' ? '#4f6f9a' : '#9a5a64'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2f2f2';
    g.beginPath(); g.arc(W / 2, 38, 18, 0, Math.PI * 2); g.fill();
    if (kind === 'm') g.fillRect(W / 2 - 20, 62, 40, 70); else { g.beginPath(); g.moveTo(W / 2, 60); g.lineTo(W / 2 + 34, 132); g.lineTo(W / 2 - 34, 132); g.fill(); }
    g.fillRect(W / 2 - 16, 130, 12, 44); g.fillRect(W / 2 + 4, 130, 12, 44);
  }, 128, 190);
  return plane(0.26, 0.38, tex);
}
function nameCard(name, ro) {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b3140'; g.font = '700 86px ' + JP_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, W / 2, H * 0.42);
    g.fillStyle = '#6a7282'; g.font = '600 40px ' + JP_FONT; g.fillText(ro, W / 2, H * 0.82);
  }, 320, 170);
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  p.rotation.x = -0.9; p.position.y = 0.07; g.add(p);
  const back = rbox(0.3, 0.02, 0.12, '#d8d6d0', { r: 0.005 }); back.rotation.x = -0.9 + Math.PI / 2; back.position.set(0, 0.06, -0.035); g.add(back);
  return g;
}
function vending(lit) {
  const g = new THREE.Group();
  g.add(rbox(0.82, 1.3, 0.62, lit ? '#2d3b63' : '#2e3139', { r: 0.03 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.72), lit ? emissive('#b9d6ff', '#7fb2ff', 0.9) : mat('#20242b', { roughness: 0.4 }));
  face.position.set(-0.06, 0.8, 0.312); g.add(face);
  const cols = ['#e46a5a', '#f0b64a', '#5aa35d', '#4e8fd1', '#c77ab8', '#f2e2b0'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.add(rbox(0.09, 0.12, 0.03, cols[(r * 4 + c + (lit ? 0 : 2)) % 6], { x: -0.28 + c * 0.145, y: 0.5 + r * 0.16, z: 0.32, r: 0.02, cast: false }));
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
  for (let i = 0; i < 3; i++) g.add(rbox(0.6, 0.012, 0.01, '#9a9ea5', { y: 0.12 + i * 0.16, z: 0.313, r: 0.004, cast: false }));
  g.add(rbox(0.14, 0.05, 0.08, '#5ec28b', { x: 0.24, y: 0.78, z: 0.2, r: 0.01, cast: false }));
  return g;
}
function kitchen() {
  const g = new THREE.Group();
  // counter along the back wall, cupboards above, sink, microwave, coffee maker; fridge at the end
  g.add(rbox(3.0, 0.5, 0.56, '#9ea4ad', { r: 0.02 }));
  g.add(rbox(3.04, 0.04, 0.6, '#d9dad6', { y: 0.5, r: 0.012 }));
  for (let i = 0; i < 5; i++) g.add(rbox(0.54, 0.4, 0.01, '#aab0b8', { x: -1.2 + i * 0.6, y: 0.05, z: 0.283, r: 0.006, cast: false }));
  g.add(rbox(3.0, 0.34, 0.34, '#c9ccd0', { y: 0.92, z: -0.12, r: 0.02 }));
  g.add(rbox(0.5, 0.02, 0.36, '#8d939b', { x: -0.9, y: 0.54, r: 0.01, cast: false }));
  g.add(rbox(0.46, 0.26, 0.34, '#e8e8e4', { x: 0.35, y: 0.54, r: 0.03 }));
  g.add(rbox(0.28, 0.18, 0.02, '#2b2f37', { x: 0.3, y: 0.58, z: 0.172, r: 0.01, cast: false }));
  g.add(rbox(0.22, 0.34, 0.26, '#2c3038', { x: 0.95, y: 0.54, r: 0.03 }));
  g.add(rbox(0.1, 0.1, 0.1, '#3e444e', { x: 0.95, y: 0.6, z: 0.1, r: 0.02 }));
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 12), mat('#d4d6d8', { roughness: 0.35, metalness: 0.3 })); pot.position.set(1.28, 0.64, 0); g.add(sh(pot));
  const f = rbox(0.62, 1.1, 0.56, '#dfe0dd', { x: 1.95, r: 0.03 }); g.add(f);
  g.add(rbox(0.03, 0.3, 0.03, '#a4a8ae', { x: 1.72, y: 0.62, z: 0.29, r: 0.01, cast: false }));
  g.add(rbox(0.6, 0.012, 0.01, '#c3c5c3', { x: 1.95, y: 0.7, z: 0.282, r: 0.004, cast: false }));
  return g;
}
function tableSet() {
  const g = new THREE.Group();
  g.add(rbox(1.5, 0.04, 0.82, '#e3e3df', { y: 0.4, r: 0.012 }));
  for (const [x, z] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) g.add(rbox(0.05, 0.4, 0.05, PAL.deskLeg, { x, z, r: 0.01 }));
  for (const [x, z, ry] of [[-0.38, -0.66, 0], [0.38, -0.66, 0], [-0.38, 0.66, Math.PI], [0.38, 0.66, Math.PI]]) {
    const c = new THREE.Group();
    c.add(rbox(0.36, 0.05, 0.34, PAL.chair, { y: 0.24, r: 0.02 }));
    c.add(rbox(0.34, 0.3, 0.05, PAL.chair, { y: 0.28, z: -0.16, r: 0.02 }));
    for (const [lx, lz] of [[-0.14, -0.13], [0.14, -0.13], [-0.14, 0.13], [0.14, 0.13]]) c.add(rbox(0.03, 0.24, 0.03, PAL.deskLeg, { x: lx, z: lz, r: 0.008 }));
    c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  }
  const m = mug(); m.position.set(-0.45, 0.46, 0.1); g.add(m);
  g.add(rbox(0.26, 0.015, 0.2, PAL.paper, { x: 0.35, y: 0.42, z: 0.05, r: 0.004 }));
  const pl = plant({ size: 0.45, seed: 8 }); pl.position.set(0, 0.42, -0.1); g.add(pl);
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
function mirror() { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), mat('#b7c8d4', { roughness: 0.15, metalness: 0.2 })); m.receiveShadow = true; return m; }
function ceilingLamp(w = 0.9) {
  const g = new THREE.Group(); g.visible = false; // Jørgen: don't show the fixtures, keep their light
  g.add(rbox(w + 0.06, 0.07, 0.07, PAL.trim, { r: 0.02, cast: false }));
  g.add(rbox(w, 0.04, 0.06, null, { y: 0.015, z: 0.012, r: 0.015, m: emissive('#fff3dc', '#ffe6b8', 2.2), cast: false }));
  return g;
}

// ---------- more office parts ----------
function plate(text, { w = 0.5, h = 0.16, bg = '#e9ebee', fg = '#2b3140' } = {}) {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = fg; g.font = '700 ' + Math.round(H * 0.62) + 'px ' + JP_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 3);
  }, 400, Math.round(400 * h / w));
  return plane(w, h, tex);
}
function inOutBoard() {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = '#f3f3f0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#9aa1ab'; g.lineWidth = 3;
    for (let r = 0; r <= 6; r++) { g.beginPath(); g.moveTo(10, 30 + r * 36); g.lineTo(W - 10, 30 + r * 36); g.stroke(); }
    for (const x of [110, 200, 290, 380]) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 246); g.stroke(); }
    const cols = ['#d9534f', '#4a74b8', '#5aa05d', '#d9534f', '#4a74b8', '#e2a33d'];
    for (let r = 0; r < 6; r++) { g.fillStyle = '#5a616c'; g.fillRect(20, 40 + r * 36, 70, 14); g.fillStyle = cols[r]; g.beginPath(); g.arc(135 + (r % 3) * 90, 48 + r * 36, 9, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#2b3140'; g.font = '700 22px ' + JP_FONT; g.fillText('行動予定表', 16, 22);
  }, 480, 260);
  const grp = new THREE.Group();
  grp.add(rbox(1.0, 0.58, 0.03, '#b9bdc3', { r: 0.01, cast: false }));
  const p = plane(0.94, 0.52, tex); p.position.set(0, 0.29, 0.017); grp.add(p);
  return grp;
}
function whiteboard() {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = '#f6f6f3'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e07a3b'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 60); g.bezierCurveTo(90, 30, 140, 90, 200, 50); g.stroke();
    g.strokeStyle = '#3d6fb0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40, 110 + i * 30); g.lineTo(160 + (i % 2) * 60, 110 + i * 30); g.stroke(); }
    g.strokeStyle = '#2b3140'; g.strokeRect(260, 90, 120, 90);
  }, 420, 260);
  const grp = new THREE.Group();
  grp.add(rbox(0.9, 0.56, 0.03, '#a8adb4', { r: 0.01, cast: false }));
  const p = plane(0.84, 0.5, tex); p.position.set(0, 0.28, 0.017); grp.add(p);
  grp.add(rbox(0.8, 0.03, 0.06, '#a8adb4', { y: -0.01, z: 0.03, r: 0.008, cast: false }));
  return grp;
}
function calendar() {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6f93b5'; g.fillRect(8, 8, W - 16, 90);
    g.fillStyle = '#4f6e53'; g.beginPath(); g.moveTo(8, 98); g.lineTo(60, 50); g.lineTo(110, 98); g.fill();
    g.fillStyle = '#b3b7bd'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(14 + c * 17, 110 + r * 17, 11, 10);
  }, 136, 200);
  return plane(0.22, 0.32, tex);
}
function glassCabinet() {
  const g = new THREE.Group();
  g.add(rbox(0.62, 1.2, 0.4, '#8f959f', { r: 0.02 }));
  for (let i = 0; i < 3; i++) {
    const y = 0.12 + i * 0.36;
    g.add(rbox(0.54, 0.02, 0.34, '#a3a9b2', { y, r: 0.006, cast: false }));
    const cols = ['#4a6490', '#6a7a8c', '#3d4d6b', '#7f8ea3', '#56657e', '#8a6f5a'];
    for (let k = 0; k < 8; k++) g.add(rbox(0.055, 0.28, 0.22, cols[(k * 3 + i) % 6], { x: -0.22 + k * 0.063, y: y + 0.02, z: 0.02, r: 0.008, cast: false }));
  }
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.1), new THREE.MeshStandardMaterial({ color: '#cfdde6', roughness: 0.1, transparent: true, opacity: 0.25, depthWrite: false }));
  gl.position.set(0, 0.6, 0.205); g.add(gl);
  return g;
}
function waterCooler() {
  const g = new THREE.Group();
  g.add(rbox(0.3, 0.72, 0.3, '#e3e4e2', { r: 0.03 }));
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 14), new THREE.MeshStandardMaterial({ color: '#9cc3e0', roughness: 0.15, transparent: true, opacity: 0.8 }));
  b.position.y = 0.9; g.add(sh(b));
  return g;
}
function rack() {
  const g = new THREE.Group();
  g.add(rbox(0.6, 1.3, 0.7, '#2c3038', { r: 0.02 }));
  for (let i = 0; i < 9; i++) {
    g.add(rbox(0.5, 0.09, 0.01, '#3c424c', { y: 0.12 + i * 0.125, z: 0.352, r: 0.004, cast: false }));
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02), new THREE.MeshBasicMaterial({ color: i % 3 ? '#5fd38f' : '#ffb95a' }));
    led.position.set(0.18 - (i % 2) * 0.05, 0.16 + i * 0.125, 0.36); g.add(led);
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
  g.add(rbox(len, 0.48, 0.56, '#9ea4ad', { r: 0.02 }));
  g.add(rbox(len + 0.04, 0.04, 0.6, '#d9dad6', { y: 0.48, r: 0.012 }));
  const n = Math.round(len / 0.55);
  for (let i = 0; i < n; i++) g.add(rbox(len / n - 0.06, 0.38, 0.01, '#aab0b8', { x: -len / 2 + (i + 0.5) * len / n, y: 0.05, z: 0.283, r: 0.006, cast: false }));
  return g;
}
function stairs() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) g.add(rbox(1.1, 0.12 * (i + 1), 0.34, i % 2 ? '#9ca1a8' : '#a6abb2', { z: -i * 0.34, r: 0.01 }));
  for (let i = 0; i < 5; i++) g.add(rbox(1.1, 0.02, 0.3, '#6e747e', { y: -0.001, z: 0.9 + i * 0.0, r: 0.005, cast: false }));
  g.add(rbox(0.05, 0.05, 2.4, '#c9ccd0', { x: 0.58, y: 0.95, z: -1.0, r: 0.02 }));
  return g;
}
function table2() {
  const g = new THREE.Group();
  g.add(rbox(0.8, 0.04, 0.6, '#e3e3df', { y: 0.4, r: 0.012 }));
  for (const [x, z] of [[-0.35, -0.25], [0.35, -0.25], [-0.35, 0.25], [0.35, 0.25]]) g.add(rbox(0.04, 0.4, 0.04, PAL.deskLeg, { x, z, r: 0.01 }));
  for (const x of [-0.3, 0.3]) { g.add(rbox(0.26, 0.04, 0.26, PAL.chair, { x, y: 0.26, z: 0.55, r: 0.02 })); g.add(rbox(0.03, 0.26, 0.03, PAL.deskLeg, { x, z: 0.55, r: 0.01 })); }
  const m = mug(); m.position.set(0.18, 0.46, 0.05); g.add(m);
  return g;
}
function coatRack() {
  const g = new THREE.Group();
  g.add(rbox(0.3, 0.03, 0.3, '#3c414b', { r: 0.01 }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), mat('#3c414b')); pole.position.y = 0.6; g.add(sh(pole));
  g.add(rbox(0.3, 0.55, 0.12, '#5c6273', { y: 0.55, z: 0.06, r: 0.05 }));
  return g;
}
function standFan() {
  const g = new THREE.Group();
  g.add(rbox(0.26, 0.03, 0.26, '#d9dad8', { r: 0.01 }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8), mat('#d9dad8')); pole.position.y = 0.35; g.add(sh(pole));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), mat('#e6e7e5')); head.rotation.x = Math.PI / 2; head.position.y = 0.78; g.add(sh(head));
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
  for (const sx of [-1, 1]) g.add(rbox(0.04, 1.0, d, '#cdd2d5', { x: sx * w / 2, r: 0.01 }));
  g.add(rbox(w - 0.06, 1.0, 0.04, '#b9c4cf', { z: d / 2, r: 0.01 }));
  const t = toilet(); t.position.set(0, 0, -d / 2 + 0.3); g.add(t);
  return g;
}

export function buildOffice() {
  const root = new THREE.Group();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#33373f');
  scene.add(root);

  // light: a dim cool floor lit by warm ceiling lamps; one soft key from high above for shadows
  scene.add(new THREE.HemisphereLight('#aeb8ca', '#5a544f', 1.05));
  const sun = new THREE.DirectionalLight('#ffe6c4', 1.5);
  sun.position.set(-7, 22, 10);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 5, far: 60 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dde6ff', 0.5); fill.position.set(0.3, 1, 0.9); scene.add(fill);
  for (const [x, z, k] of [[-2.2, -3.4, 1.5], [0.8, -3.4, 1.5], [-0.6, -1.0, 1.0], [-5.6, -1.6, 1.3], [5.2, -3.4, 0.9], [-4.4, 1.3, 1.1], [0.2, 1.3, 1.1], [4.6, 1.3, 1.1], [-4.6, 4.2, 1.3], [-0.2, 4.2, 1.2], [3.1, 4.4, 0.9], [5.7, 4.4, 0.9], [-5.6, -5.0, 0.8]]) {
    const p = new THREE.PointLight('#ffd6a0', k * 2.1, 3.6, 1.9); p.position.set(x, 1.3, z); scene.add(p);
  }

  // ---- floors ----
  root.add(tileFloor(X0, X1, Z0, Z1, 0.8, { color: '#9b9b9d', seam: '#8a8a8d' }));
  root.add(tileFloor(X0, X1, CN, CS, 0.8, { color: '#949290', seam: '#84827f', y: 0.003 }));                 // corridor, older vinyl
  root.add(tileFloor(3.4, X1, Z0, CN, 0.6, { color: '#9da2a8', seam: '#8d9298', y: 0.003 }));                // machine room, painted concrete
  root.add(tileFloor(1.8, X1, CS, Z1, 0.4, { color: '#c9cccd', seam: '#b3b7ba', y: 0.003 }));                // toilets
  root.add(tileFloor(-7, -2.2, CS, Z1, 1.0, { color: '#9ea0a3', seam: '#909295', y: 0.003 }));              // copy room sheet vinyl
  root.add(tileFloor(-2.2, 1.8, CS, Z1, 1.0, { color: '#a09d98', seam: '#918e89', y: 0.003 }));             // kitchenette

  // ---- walls ----
  const W = (...a) => root.add(wall(...a));
  const LO = 0.7, MID = 0.95;
  // outer
  W('x', X0 - T / 2, X1 + T / 2, Z0 - T / 2, WH, T);
  W('z', Z0, CS, X0 - T / 2, WH, T); W('z', CS, Z1, X0 - T / 2, MID, T);
  W('z', Z0, CN, X1 + T / 2, WH, T, { holes: [] }); W('z', CN, CS, X1 + T / 2, WH, T, { holes: [[0.6, 1.9, 0, 1.3]] }); W('z', CS, Z1, X1 + T / 2, MID, T);
  W('x', X0 - T / 2, X1 + T / 2, Z1 + T / 2, 0.32, T);
  // top row
  W('x', X0, -4.2, -3.4, WH, T, { holes: [[-6.75, -6.15, 0, 1.25], [-5.95, -4.95, 0, 1.25]] });        // lift lobby north: stair door, lift
  W('z', Z0, CN, -4.2, WH, T);                                                                          // lobby / office
  W('z', Z0, CN, 3.4, WH, T);                                                                           // office / machine room
  W('x', X0, X1, CN, WH, T, { holes: [[X0, -4.2, 0, WH], [-0.8, 0.3, 0, 1.3], [4.7, 5.5, 0, 1.25], [6.2, 6.8, 0, 0.0001]] });
  // bottom row
  W('x', X0, X1, CS, LO, T, { holes: [[-4.4, -3.6, 0, LO], [-0.8, 0.1, 0, LO], [2.3, 2.9, 0, LO], [4.9, 5.5, 0, LO]] });
  W('z', CS, Z1, -2.2, MID, T); W('z', CS, Z1, 1.8, MID, T); W('z', CS, Z1, 4.4, MID, T);

  // doors and plates on the corridor's north face (seen from the camera)
  const sd = door(0.6, 1.25, { windows: true }); sd.position.set(-6.45, 0, -3.4 + T / 2); root.add(sd);
  const md = new THREE.Group(); md.add(door(0.8, 1.25, { windows: false })); md.position.set(5.1, 0, CN + T / 2); root.add(md);
  const fe = door(0.7, 1.2, { windows: true }); fe.rotation.y = -Math.PI / 2; fe.position.set(X1 - 0.02, 0, 1.25); root.add(fe);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), emissive('#6fe39a', '#3fbf6e', 1.2)); ex.position.set(X1 - 0.09, 1.38, 1.25); ex.rotation.y = -Math.PI / 2; root.add(ex);
  const addPlate = (t, x, y, z, o) => { const p = plate(t, o); p.position.set(x, y, z); root.add(p); return p; };
  addPlate('企画室７', -1.3, 1.02, CN + T / 2 + 0.005);
  addPlate('機械室', 5.95, 1.02, CN + T / 2 + 0.005);
  addPlate('階段', -6.45, 1.34, -3.4 + T / 2 + 0.005, { w: 0.4 });
  addPlate('B2', -4.55, 1.05, -3.4 + T / 2 + 0.005, { w: 0.3, h: 0.3, bg: '#3b414c', fg: '#e9ecf0' });
  // plates for the bottom rooms stand on the low wall tops, tilted up toward the camera
  for (const [t, x] of [['コピー室', -3.1], ['給湯室', 0.55]]) { const p = plate(t, { w: 0.5, h: 0.14 }); p.position.set(x, LO + 0.1, CS); p.rotation.x = -0.5; root.add(p); root.add(rbox(0.52, 0.1, 0.03, '#8a909a', { x, y: LO, z: CS - 0.02, r: 0.01, cast: false })); }
  for (const [k, x] of [['m', 3.25], ['f', 5.85]]) { const p = toiletSign(k); p.scale.setScalar(0.6); p.position.set(x, LO + 0.13, CS); p.rotation.x = -0.5; root.add(p); }
  // corridor dressing: noticeboard, extinguisher, hydrant, distribution board, notices
  const nb = pinboard(0.9, 0.46); nb.position.set(-3.0, 0.72, CN + T / 2 + 0.01); root.add(nb);
  root.add(rbox(0.26, 0.4, 0.08, '#b8413b', { x: 1.5, y: 0.35, z: CN + T / 2 + 0.04, r: 0.02 }));
  const hy = rbox(0.5, 0.62, 0.1, '#c9473f', { x: 2.6, y: 0.2, z: CN + T / 2 + 0.05, r: 0.02 }); root.add(hy);
  const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), emissive('#ff8a7a', '#ff4a3a', 2.2)); lampR.position.set(2.6, 0.95, CN + T / 2 + 0.06); root.add(lampR);
  root.add(rbox(0.4, 0.5, 0.06, '#9aa0a8', { x: 3.7, y: 0.5, z: CN + T / 2 + 0.03, r: 0.01 }));
  addPlate('', -1.9, 0.62, CN + T / 2 + 0.006, { w: 0.18, h: 0.24, bg: '#f2f0ea' });
  // corridor lamps
  for (const x of [-5.6, -2.6, 0.9, 4.0]) { const l = ceilingLamp(0.7); l.position.set(x, 1.3, CN + T / 2 + 0.02); root.add(l); }
  const trolley = new THREE.Group(); trolley.add(rbox(0.5, 0.04, 0.34, '#4c6696', { y: 0.08, r: 0.01 }), rbox(0.04, 0.6, 0.04, '#4c6696', { x: -0.23, y: 0.08, z: -0.13, r: 0.01 }), rbox(0.04, 0.6, 0.04, '#4c6696', { x: -0.23, y: 0.08, z: 0.13, r: 0.01 }));
  trolley.position.set(6.3, 0, 2.05); root.add(trolley);
  // corridor dressing: plants at the ends, a folded 清掃中 sign, bins, a pipe chair stack
  { const p = plant({ size: 0.95, seed: 14 }); p.position.set(-4.3, 0, 2.05); root.add(p); }
  { const p = plant({ size: 0.95, seed: 15 }); p.position.set(3.2, 0, 2.05); root.add(p); }
  { const s = new THREE.Group(); s.add(rbox(0.3, 0.5, 0.04, '#e0b83a', { r: 0.02 })); s.rotation.x = -0.25; s.position.set(1.6, 0, 1.95); root.add(s); }
  for (const [x, c] of [[0.7, '#4f6f9a'], [0.98, '#6a8f5c']]) root.add(rbox(0.22, 0.34, 0.22, c, { x, z: 2.1, r: 0.03 }));
  for (let i = 0; i < 3; i++) root.add(rbox(0.4, 0.05, 0.36, '#6d747e', { x: -2.4, y: 0.02 + i * 0.05, z: 2.05, r: 0.01 }));

  // ---- lift lobby ----
  const liftDoor = new THREE.Group();
  liftDoor.add(rbox(1.14, 1.3, 0.06, '#5d636d', { r: 0.02 }));
  const leaves = [];
  for (const s of [-1, 1]) { const l = rbox(0.5, 1.22, 0.05, null, { x: s * 0.255, z: 0.02, r: 0.01, m: mat('#8e949d', { roughness: 0.45, metalness: 0.35 }) }); liftDoor.add(l); leaves.push(l); }
  liftDoor.position.set(-5.45, 0, -3.4 + T / 2 + 0.01); root.add(liftDoor);
  root.add(rbox(0.36, 0.1, 0.03, '#1d2027', { x: -5.45, y: 1.32, z: -3.4 + T / 2 + 0.02, r: 0.01, cast: false }));
  root.add(rbox(0.07, 0.13, 0.03, '#b9bec6', { x: -4.8, y: 0.62, z: -3.4 + T / 2 + 0.02, r: 0.01 }));
  const vm = vending(true); vm.scale.setScalar(0.82); vm.position.set(-4.62, 0, -3.4 + T / 2 + 0.3); root.add(vm);
  root.add(rbox(0.2, 0.3, 0.2, '#6d7684', { x: -4.45, z: -2.35, r: 0.02 }));
  const bn = bench(1.6); bn.rotation.y = Math.PI / 2; bn.position.set(-6.72, 0, -1.4); root.add(bn);
  { const p = plant({ size: 1.0, seed: 6 }); p.position.set(-6.65, 0, -0.05); root.add(p); }
  { const l = ceilingLamp(0.6); l.position.set(-6.6, 1.3, -3.4 + T / 2 + 0.02); root.add(l); }
  // stairwell behind the lobby
  const stw = stairs(); stw.position.set(-6.1, 0, -4.0); root.add(stw);
  root.add(rbox(2.6, 0.05, 1.0, '#b2b5b8', { x: -5.6, y: -0.02, z: -4.1, r: 0.01, cast: false }));

  // ---- main office ----
  const iob = inOutBoard(); iob.position.set(-1.6, 0.62, Z0 + T / 2 + 0.01); root.add(iob);
  const ck = clock(); ck.position.set(-1.6, 1.3, Z0 + T / 2 + 0.02); root.add(ck);
  const secHand = new THREE.Group(); secHand.position.set(-1.6, 1.3, Z0 + T / 2 + 0.03); root.add(secHand);
  { const h = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.13), new THREE.MeshBasicMaterial({ color: '#c9473f' })); h.position.y = 0.055; secHand.add(h); }
  const cal = calendar(); cal.position.set(-0.6, 0.86, Z0 + T / 2 + 0.01); root.add(cal);
  const wb = whiteboard(); wb.position.set(0.55, 0.6, Z0 + T / 2 + 0.01); root.add(wb);
  const cb = pinboard(0.6, 0.36); cb.position.set(-2.95, 0.84, Z0 + T / 2 + 0.01); root.add(cb);
  root.add(rbox(0.4, 0.14, 0.04, '#9aa0a8', { x: 1.9, y: 1.18, z: Z0 + T / 2 + 0.02, r: 0.01, cast: false }));
  for (const x of [-3.8, -3.15]) { const gc = glassCabinet(); gc.position.set(x, 0, Z0 + T / 2 + 0.22); root.add(gc); }
  const wc = waterCooler(); wc.position.set(-3.85, 0, -4.9); root.add(wc);
  const tc = filingCabinet(3, '#8a909a'); tc.position.set(2.1, 0, Z0 + T / 2 + 0.25); root.add(tc);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 12), mat('#d4d6d8', { roughness: 0.35, metalness: 0.3 })); pot.position.set(2.0, 0.78, Z0 + 0.4); root.add(sh(pot));
  root.add(mug('#7aa0c8').translateX(2.2).translateY(0.73).translateZ(Z0 + 0.4));
  { const p = plant({ size: 1.2, seed: 1, tall: 1.4 }); p.position.set(2.95, 0, Z0 + 0.45); root.add(p); }
  { const p = plant({ size: 1.0, seed: 3 }); p.position.set(-3.85, 0, -0.35); root.add(p); }
  for (const [x, z, s] of [[2.9, -1.5, 0.42], [2.85, -1.0, 0.36], [2.3, -0.35, 0.34]]) root.add(rbox(s, s * 0.8, s, PAL.box, { x, z, r: 0.02 }));
  const cr = coatRack(); cr.position.set(1.1, 0, -0.45); root.add(cr);
  const fan = standFan(); fan.position.set(-3.3, 0, -2.2); root.add(fan);
  root.add(rbox(0.36, 0.36, 0.3, '#6a7b93', { x: -3.85, z: -3.0, r: 0.02 }));

  const dN = (i) => desks.find((d) => d.row === 'n' && d.i === i), dS = (i) => desks.find((d) => d.row === 's' && d.i === i);
  // desk island: two rows of three, back to back; the section chief's desk across the head
  const DX = [-2.0, -0.8, 0.4], ZN = -3.72, ZS = -3.0;
  const desks = [];
  for (const [row, z, face] of [['n', ZN, -1], ['s', ZS, 1]]) for (let i = 0; i < 3; i++) {
    const d = desk({ w: 1.12, d: 0.7, seed: i + (row === 'n' ? 3 : 0), clutter: 1 });
    d.position.set(DX[i], 0, z);
    if (face < 0) d.rotation.y = Math.PI;
    root.add(d);
    const c = officeChair(); c.position.set(DX[i], 0, z + face * 0.62); c.rotation.y = face > 0 ? Math.PI : 0;
    if (!(row === 's' && i === 1)) root.add(c);
    desks.push({ x: DX[i], z, face, chair: c, seat: [DX[i], z + face * 0.62], row, i });
  }
  // the section chief's desk at the head of the island, facing along it
  const chief = desk({ w: 1.2, d: 0.72, seed: 7 }); chief.rotation.y = -Math.PI / 2; chief.position.set(1.55, 0, -3.36); root.add(chief);
  const chiefChair = officeChair('#2a2f3e'); chiefChair.rotation.y = -Math.PI / 2; chiefChair.position.set(2.2, 0, -3.36); root.add(chiefChair);
  // the empty desk in the north row carries boxes and a dead monitor
  root.add(rbox(0.4, 0.3, 0.34, PAL.box, { x: DX[2] + 0.25, y: 0.42, z: ZN - 0.05, r: 0.02 }));
  // the team has shrunk: three desks have their monitors under a cloth
  const cloth = (d) => { const g = new THREE.Group(); g.add(rbox(0.52, 0.36, 0.12, '#6f737b', { y: 0.06, r: 0.05 }), rbox(0.6, 0.08, 0.26, '#6f737b', { r: 0.04 })); g.position.set(d.x, 0.42, d.z - d.face * 0.14); root.add(g); return g; };
  const covers = [cloth(dN(1)), cloth(dN(2)), cloth(dS(2))];
  // the 2019 party box on the cabinets, a tray of seven cups in the kitchenette, a nameplate face down on the chief's desk
  root.add(rbox(0.42, 0.22, 0.3, PAL.box, { x: -3.5, y: 1.2, z: Z0 + 0.3, r: 0.02 }));
  const tray = new THREE.Group(); tray.add(rbox(0.46, 0.02, 0.26, '#6d5a4a', { r: 0.006 }));
  for (let i = 0; i < 7; i++) { const cu = mug(['#e9e6df', '#c96a5a', '#7aa0c8', '#e9e6df', '#9cc39a', '#e2c26a', '#e9e6df'][i]); cu.position.set(-0.17 + (i % 4) * 0.11, 0.05, i < 4 ? -0.06 : 0.06); cu.scale.setScalar(0.8); tray.add(cu); }
  tray.position.set(0.4, 0.5, CS + T / 2 + 0.34); root.add(tray);
  root.add(rbox(0.26, 0.02, 0.08, '#3a3f48', { x: 1.55, y: 0.42, z: -3.1, r: 0.005 }));
  const card = nameCard('ミオ', 'Mio'); card.position.set(DX[1] + 0.32, 0.42, ZS + 0.2); root.add(card);

  const myChair = officeChair(); myChair.position.set(5.5, 0, -1.3); myChair.rotation.y = -0.5; root.add(myChair);
  const tama = cat(); tama.scale.setScalar(1.15 * K * 0.9); tama.position.set(0, 0.24, 0.02); tama.rotation.y = 0.4; myChair.add(tama);
  tama.userData.head.rotation.x = 0.35;

  // ---- machine room ----
  for (let i = 0; i < 4; i++) { const r = rack(); r.position.set(4.1 + i * 0.72, 0, Z0 + 0.5); root.add(r); }
  for (let i = 0; i < 3; i++) { const r = rack(); r.position.set(4.4 + i * 0.72, 0, -3.3); root.add(r); }
  const ac = acUnit(); ac.position.set(5.9, 1.05, Z0 + T / 2 + 0.1); root.add(ac);
  const fan2 = standFan(); fan2.position.set(6.6, 0, -1.2); root.add(fan2);
  const cart = new THREE.Group(); cart.add(rbox(0.5, 0.5, 0.4, '#6e747e', { r: 0.02 })); const cm = monitor(); cm.position.set(0, 0.5, 0); cart.add(cm);
  cart.position.set(4.2, 0, -1.3); root.add(cart);
  for (const [x0, z0, x1, z1] of [[3.7, -2.5, 6.8, -2.45], [3.7, -2.35, 6.8, -2.3]]) root.add(rbox(x1 - x0, 0.02, 0.05, '#2d3139', { x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 0.01, cast: false }));

  // ---- copy room ----
  const cp = copier(); cp.position.set(-2.95, 0, CS + T / 2 + 0.36); root.add(cp);
  const fax = new THREE.Group(); fax.add(rbox(0.8, 0.44, 0.5, '#9ea4ad', { r: 0.02 })); fax.add(rbox(0.46, 0.14, 0.36, '#dadcd8', { x: -0.1, y: 0.44, r: 0.02 })); fax.add(rbox(0.2, 0.08, 0.14, PAL.paper, { x: 0.25, y: 0.44, r: 0.01 }));
  fax.position.set(-5.4, 0, CS + T / 2 + 0.3); root.add(fax);
  const sh1 = shelf(0.95, 1.1, 0.4, { fill: 'paper', seed: 3 }); sh1.rotation.y = Math.PI / 2; sh1.position.set(X0 + 0.28, 0, 3.6); root.add(sh1);
  const sh3 = shelf(0.95, 1.1, 0.4, { fill: 'box', seed: 5 }); sh3.rotation.y = Math.PI / 2; sh3.position.set(X0 + 0.28, 0, 4.8); root.add(sh3);
  const work = new THREE.Group(); work.add(rbox(1.5, 0.04, 0.8, '#d5d6d3', { y: 0.42, r: 0.01 })); for (const [x, z] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) work.add(rbox(0.05, 0.42, 0.05, PAL.deskLeg, { x, z, r: 0.01 }));
  for (let i = 0; i < 4; i++) work.add(rbox(0.22, 0.03 + (i % 2) * 0.04, 0.3, PAL.paper, { x: -0.5 + i * 0.32, y: 0.46, r: 0.005 }));
  work.position.set(-4.4, 0, 4.7); root.add(work);
  for (const [x, z, s] of [[-2.7, 5.9, 0.4], [-3.15, 5.95, 0.34], [-6.5, 5.9, 0.36]]) root.add(rbox(s, s * 0.8, s, PAL.box, { x, z, r: 0.02 }));
  root.add(rbox(0.26, 0.32, 0.26, '#b8453e', { x: -2.55, z: 4.6, r: 0.03 }), rbox(0.26, 0.3, 0.26, '#4f8a55', { x: -2.55, z: 5.0, r: 0.03 }));
  { const sd = new THREE.Group(); sd.add(rbox(0.7, 0.04, 0.45, '#d5d6d3', { y: 0.4, r: 0.01 }), rbox(0.05, 0.4, 0.4, PAL.deskLeg, { x: -0.3, r: 0.01 }), rbox(0.05, 0.4, 0.4, PAL.deskLeg, { x: 0.3, r: 0.01 }), rbox(0.12, 0.05, 0.05, '#3a3f48', { x: -0.15, y: 0.44, r: 0.01 }), rbox(0.2, 0.05, 0.28, PAL.paper, { x: 0.15, y: 0.44, r: 0.004 })); sd.position.set(-6.2, 0, 5.9); root.add(sd); }
  for (const [x, z] of [[-3.5, 3.1], [-3.8, 3.1], [-3.65, 3.3]]) root.add(rbox(0.26, 0.2, 0.34, '#e8e4da', { x, y: 0, z, r: 0.01 }));

  // ---- kitchenette (給湯室) ----
  const ct = counter(1.5); ct.position.set(0.95, 0, CS + T / 2 + 0.3); root.add(ct);
  root.add(rbox(0.36, 0.02, 0.3, '#8d939b', { x: 0.55, y: 0.5, z: CS + 0.36, r: 0.01, cast: false }));
  root.add(rbox(0.22, 0.32, 0.24, '#2c3038', { x: 1.1, y: 0.5, z: CS + 0.36, r: 0.03 }), rbox(0.1, 0.1, 0.1, '#3e444e', { x: 1.1, y: 0.56, z: CS + 0.46, r: 0.02 }));
  const kpot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 12), mat('#d4d6d8', { roughness: 0.35, metalness: 0.3 })); kpot.position.set(1.45, 0.6, CS + 0.36); root.add(sh(kpot));
  const mw = new THREE.Group(); mw.add(rbox(0.46, 0.26, 0.34, '#e8e8e4', { r: 0.03 })); mw.add(rbox(0.28, 0.18, 0.02, '#2b2f37', { x: -0.04, y: 0.04, z: 0.172, r: 0.01, cast: false }));
  mw.position.set(1.5, 0, 4.3); mw.rotation.y = -Math.PI / 2;
  const side = counter(1.3); side.rotation.y = -Math.PI / 2; side.position.set(1.5, 0, 4.3); root.add(side); mw.position.y = 0.5; mw.position.x = 1.45; root.add(mw);
  const fr = fridge(); fr.position.set(-1.8, 0, CS + T / 2 + 0.32); root.add(fr);
  const t2 = table2(); t2.position.set(-0.8, 0, 4.6); root.add(t2);
  root.add(rbox(0.22, 0.3, 0.22, '#5c6b86', { x: -1.9, z: 6.0, r: 0.02 }));
  { const wc = waterCooler(); wc.position.set(-1.9, 0, 3.6); root.add(wc); }
  root.add(rbox(0.9, 0.04, 0.22, '#8a909a', { x: 0.2, y: 0.95, z: 6.2, r: 0.01 }), rbox(0.9, 0.04, 0.22, '#8a909a', { x: 0.2, y: 0.7, z: 6.2, r: 0.01 }));
  { const p = plant({ size: 0.9, seed: 8 }); p.position.set(1.4, 0, 6.0); root.add(p); }

  // ---- toilets: men's and women's ----
  for (const [x0, k] of [[1.8, 'm'], [4.4, 'f']]) {
    for (let i = 0; i < 2; i++) { const s = stall(0.9, 1.0); s.rotation.y = Math.PI; s.position.set(x0 + 0.62 + i * 0.95, 0, 5.85); root.add(s); }
    const sk = sink(); sk.rotation.y = -Math.PI / 2; sk.position.set(x0 + 2.35, 0, 3.4); root.add(sk);
    const mi = mirror(); mi.rotation.y = -Math.PI / 2; mi.position.set(x0 + 2.52, 0.9, 3.4); mi.scale.set(0.8, 0.6, 1); root.add(mi);
    if (k === 'm') { for (let i = 0; i < 2; i++) root.add(rbox(0.26, 0.5, 0.2, '#eeefee', { x: x0 + 0.45 + i * 0.45, y: 0.2, z: CS + T / 2 + 0.12, r: 0.06 })); }
    else root.add(rbox(0.5, 0.05, 0.3, '#d8dadb', { x: x0 + 0.7, y: 0.45, z: CS + T / 2 + 0.17, r: 0.01 }));
    root.add(rbox(0.18, 0.26, 0.18, '#5873a0', { x: x0 + 2.35, z: 4.0, r: 0.02 }));
  }

  // ---- people ----
  const scaleUp = (r) => { r.root.scale.multiplyScalar(K); return r; };
  const seatAt = (r, d, ry) => { sit(r); r.root.position.x = d.seat[0]; r.root.position.z = d.seat[1] - d.face * 0.02; r.root.position.y += 0.03 * K; r.root.rotation.y = ry; armsHold(r, -1.2, 0.35); r.seated = true; };

  const kenji = scaleUp(PEOPLE.kenji()); seatAt(kenji, dN(0), 0); root.add(kenji.root);
  const nao = scaleUp(PEOPLE.worker(1)); seatAt(nao, dN(1), 0); root.add(nao.root);
  const hiro = scaleUp(PEOPLE.worker(2)); seatAt(hiro, dS(2), Math.PI); root.add(hiro.root);
  const mori = scaleUp(PEOPLE.mori()); sit(mori); mori.root.position.set(2.16, mori.root.position.y + 0.03 * K, -3.36); mori.root.rotation.y = -Math.PI / 2; armsHold(mori, -1.2, 0.35); mori.seated = true; root.add(mori.root);
  const emi = scaleUp(PEOPLE.emi()); emi.root.position.set(-5.3, 0, -1.35); emi.root.rotation.y = Math.PI; root.add(emi.root);
  const emiBlob = blob(0.55, 0.38); emiBlob.position.set(-5.3, 0.004, -1.35); root.add(emiBlob);
  const yui = scaleUp(PEOPLE.yui()); yui.root.position.set(-2.95, 0, 3.55); yui.root.rotation.y = Math.PI; root.add(yui.root);
  const sota = scaleUp(PEOPLE.sota()); sota.root.position.set(1.05, 0, 3.5); sota.root.rotation.y = Math.PI; root.add(sota.root);
  const sm2 = mug('#c96a5a'); sm2.position.set(0, -0.26, 0.02); sota.arms[1].add(sm2); sota.arms[1].rotation.x = -0.9;
  for (const [x, z] of [dN(0).seat]) { const b = blob(0.6, 0.3); b.position.set(x, 0.004, z); root.add(b); }

  // ---- walk grid ----
  const nav = new Nav(X0, X1, Z0, Z1, 0.1);
  const B = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  const t2w = T / 2 + 0.02;
  const wallsX = [[X0, -6.75, -3.4], [-6.15, -5.95, -3.4], [-4.95, -4.2, -3.4], [-4.2, -0.8, CN], [0.3, 4.7, CN], [5.5, X1, CN],
    [X0, -4.4, CS], [-3.6, -0.8, CS], [0.1, 2.3, CS], [2.9, 4.9, CS], [5.5, X1, CS], [X0, X1, Z1 + 0.05], [X0, X1, Z0 - 0.05]];
  for (const [a, b, z] of wallsX) B(a, b, z - t2w, z + t2w);
  const wallsZ = [[Z0, CN, -4.2], [Z0, CN, 3.4], [CS, Z1, -2.2], [CS, Z1, 1.8], [CS, Z1, 4.4]];
  for (const [a, b, x] of wallsZ) B(x - t2w, x + t2w, a, b);
  B(-5.95, -4.95, -3.4, -3.3);                                      // lift (you don't walk into it)
  B(-4.95, -4.2, -3.4, -2.85); B(-4.6, -4.3, -2.5, -2.2);          // vending, bin
  B(X0, -6.4, -2.25, -0.55); B(-6.9, -6.4, -0.3, 0.2);             // bench, plant
  B(X0, -4.2, Z0, -3.45);                                           // stairwell (not walkable today)
  B(-4.15, -2.8, Z0, Z0 + 0.5); B(-4.1, -3.6, -5.15, -4.65); B(1.8, 3.35, Z0, Z0 + 0.62);
  B(-4.1, -3.6, -0.6, -0.1); B(2.05, 3.2, -1.8, -0.15); B(0.9, 1.3, -0.65, -0.25); B(-3.5, -3.1, -2.4, -2.0); B(-4.1, -3.6, -3.2, -2.8);
  B(-2.62, 1.0, ZN - 0.36, ZS + 0.36);                               // island
  for (const d of desks) B(d.seat[0] - 0.24, d.seat[0] + 0.24, Math.min(d.seat[1], d.seat[1] + d.face * 0.25) - 0.02, Math.max(d.seat[1], d.seat[1] + d.face * 0.25) + 0.02);
  B(1.15, 1.95, -4.0, -2.75); B(1.95, 2.45, -3.6, -3.1);             // chief's desk and chair
  // machine room: racks, fan, cart; the door keeps it shut until it opens
  B(3.7, 6.9, Z0, Z0 + 0.9); B(4.0, 6.5, -3.7, -2.9); B(3.9, 4.5, -1.55, -1.05); nav.blockTagged('chair', 5.2, 5.8, -1.6, -1.0); B(6.4, 6.8, -1.4, -1.0);
  nav.blockTagged('mdoor', 4.7, 5.5, CN - 0.2, CN + 0.12);
  B(6.0, 6.6, 1.85, 2.25);                                           // trolley
  B(-3.35, -2.55, CS, CS + 0.75); B(-5.8, -5.0, CS, CS + 0.58); B(X0, X0 + 0.5, 3.1, 5.3); B(-5.2, -3.6, 4.25, 5.15); B(-3.3, -2.35, 5.6, Z1); B(-6.75, -6.25, 5.65, Z1); B(-2.75, -2.35, 4.4, 5.2);
  B(0.15, 1.75, CS, CS + 0.62); B(1.15, 1.8, 3.6, 5.0); B(-2.15, -1.45, CS, CS + 0.62); B(-1.25, -0.35, 4.25, 5.3); B(-2.05, -1.75, 5.85, Z1); B(1.2, 1.6, 5.8, Z1);
  for (const x0 of [1.8, 4.4]) { B(x0 + 0.1, x0 + 2.55, 5.3, Z1); B(x0 + 2.15, x0 + 2.55, 3.15, 3.65); B(x0 + 2.2, x0 + 2.5, 3.85, 4.15); B(x0 + 0.25, x0 + 1.2, CS, CS + 0.32); }
  B(-4.55, -4.05, 1.85, CS); B(2.95, 3.45, 1.85, CS); B(1.45, 1.75, 1.85, 2.1); B(0.55, 1.12, 1.95, CS); B(-2.65, -2.15, 1.85, CS);
  B(-6.6, -5.8, 5.6, Z1); B(-3.95, -3.35, 2.9, 3.5); B(-2.1, -1.7, 3.4, 3.8);
  nav.blockTagged('emi', -5.5, -5.1, -1.55, -1.15);

  for (const r of [nao, hiro, yui, sota]) r.root.visible = false;
  const world = { root, scene, sun, nav, desks, dN, dS, kenji, nao, hiro, mori, emi, emiBlob, yui, sota, tama, covers, leaves, card, X0, X1, Z0, Z1, secHand, fanHead: fan.children[2], fan2Head: fan2.children[2], copier: cp, myChair, machineDoor: md, vendingPos: [-4.62, -2.6], coffeePos: [1.1, CS + 0.36] };
  world.update = (t) => {
    for (const r of [kenji, nao, hiro, mori, yui, sota]) idle(r, t);
    if (!emi._walk) idle(emi, t);
    kenji.arms[1].rotation.x = -1.2 + Math.max(0, Math.sin(t * 6)) * 0.06;
    nao.arms[0].rotation.x = -1.2 + Math.max(0, Math.sin(t * 5 + 1)) * 0.06;
    mori.head.rotation.x = -0.1 + Math.sin(t * 0.4) * 0.03;
    yui.arms[0].rotation.x = -0.8 + Math.sin(t * 1.3) * 0.2;
    sota.arms[1].rotation.x = -0.9 + Math.max(0, Math.sin(t * 0.5)) * -0.4;
  };
  world.openLift = (k) => { leaves[0].position.x = -0.255 - k * 0.47; leaves[1].position.x = 0.255 + k * 0.47; };
  world.lift = [-5.45, -3.4];
  return world;
}
