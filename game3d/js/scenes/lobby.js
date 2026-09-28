// Place 2: the company lobby with the security gate (game3d/ref/2-security-gate-muted.png).
// Local space: floor at y = 0, the entrance at +z (near the camera), lifts on the back wall at -z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, mat, emissive, rbox, plant, bench, wallLamp, lampPost, door, wall, tileFloor, shadowProxy, textTexture, plane, JP_FONT } from '../props.js';
import { PEOPLE, sit, armsLap, walkPose, HIP, idle } from '../cast.js';
import { cat } from '../train/people.js';
import { blob, Nav } from '../engine.js';
import { K } from './office.js';

const X = 6.3, Z = 4.5, WH = 1.9; // half sizes, wall height

function poster(lines, sky) {
  const tex = textTexture((g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#39414f'); gr.addColorStop(1, '#232830');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // a skyline or hills at the bottom
    g.fillStyle = '#4b5566';
    if (sky === 'city') { for (let i = 0; i < 9; i++) { const w = 22 + (i * 13) % 20, h = 40 + (i * 37) % 90; g.fillRect(20 + i * 28, H - 30 - h, w, h + 30); } }
    else { g.beginPath(); g.moveTo(0, H - 40); for (let x = 0; x <= W; x += 16) g.lineTo(x, H - 70 - 40 * Math.sin(x / 50) - 20 * Math.sin(x / 17)); g.lineTo(W, H); g.lineTo(0, H); g.fill(); }
    g.fillStyle = '#c9ced6'; g.font = '600 30px ' + JP_FONT;
    lines.forEach((l, i) => g.fillText(l, 26, 56 + i * 38));
  }, 300, 420);
  const grp = new THREE.Group();
  grp.add(rbox(0.86, 1.18, 0.03, PAL.charcoal, { r: 0.01, cast: false }));
  const p = plane(0.8, 1.12, tex); p.position.set(0, 0.59, 0.017); grp.add(p);
  return grp;
}

function readerPost() {
  const g = new THREE.Group();
  g.add(rbox(0.26, 0.62, 0.3, '#4a4f59', { r: 0.03 }));
  g.add(rbox(0.2, 0.05, 0.24, '#3a3e46', { y: 0.62, r: 0.02 }));
  // the pad on top, angled toward the entrance
  const pad = rbox(0.16, 0.03, 0.16, null, { y: 0.66, r: 0.01, m: mat('#20242b', { roughness: 0.3 }) });
  g.add(pad);
  // status light on the side facing the player
  const light = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ color: '#46d18a' }));
  light.position.set(0, 0.42, 0.152); g.add(light);
  const tex = { ok: arrowTex('#46d18a', 'ok'), no: arrowTex('#e0564f', 'no'), idle: arrowTex('#46d18a', 'arrow') };
  light.material.map = tex.idle; light.material.color.set('#ffffff');
  g.userData.set = (k) => { light.material.map = tex[k]; light.material.needsUpdate = true; };
  return g;
}
function arrowTex(col, kind) {
  return textTexture((g, W, H) => {
    g.fillStyle = '#15181d'; g.fillRect(0, 0, W, H);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 12; g.lineCap = 'round';
    if (kind === 'arrow') { g.beginPath(); g.moveTo(30, 98); g.lineTo(96, 32); g.moveTo(52, 32); g.lineTo(96, 32); g.lineTo(96, 76); g.stroke(); }
    if (kind === 'ok') { g.beginPath(); g.arc(64, 64, 34, 0, Math.PI * 2); g.stroke(); }
    if (kind === 'no') { g.beginPath(); g.moveTo(34, 34); g.lineTo(94, 94); g.moveTo(94, 34); g.lineTo(34, 94); g.stroke(); }
  }, 128, 128);
}

function arch() {
  const g = new THREE.Group();
  const W = 1.3, H = 1.45;
  for (const s of [-1, 1]) {
    g.add(rbox(0.16, H, 0.3, '#8b919c', { x: s * (W / 2), r: 0.03 }));
    const strip = rbox(0.03, H * 0.62, 0.05, null, { x: s * (W / 2 - 0.09), y: H * 0.22, r: 0.012, m: emissive('#9fd4ff', '#6ab8ff', 1.4), cast: false });
    g.add(strip); strip.userData.glow = true;
  }
  g.add(rbox(W + 0.16, 0.2, 0.34, '#7d838e', { y: H, r: 0.04 }));
  const bar = rbox(0.5, 0.04, 0.05, null, { y: H - 0.05, z: 0.15, r: 0.015, m: emissive('#9fd4ff', '#6ab8ff', 1.6), cast: false });
  g.add(bar);
  g.userData.lights = [];
  g.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.emissiveIntensity > 1) g.userData.lights.push(o); });
  const glowMats = { idle: emissive('#9fd4ff', '#6ab8ff', 1.5), ok: emissive('#a8f0c8', '#46d18a', 1.8), no: emissive('#ffb3ad', '#e0564f', 2.0) };
  g.userData.set = (k) => { for (const l of g.userData.lights) l.material = glowMats[k]; };
  // two glass flaps across the opening, hinged on the posts
  const flapM = new THREE.MeshStandardMaterial({ color: '#dfeaf1', roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false });
  const flaps = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(s * (W / 2 - 0.08), 0, 0);
    const f = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.42, 0.03, 2, 0.012), flapM); f.position.set(-s * 0.26, 0.42, 0); f.renderOrder = 2;
    const edge = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.03, 0.04, 1, 0.01), mat('#9aa0aa')); edge.position.set(-s * 0.26, 0.64, 0);
    hinge.add(f, edge); g.add(hinge); flaps.push([hinge, s]);
  }
  g.userData.flaps = (k) => { for (const [h, s] of flaps) h.rotation.y = s * k * Math.PI / 2 * 0.95; };
  return g;
}

function guardDesk() {
  const g = new THREE.Group();
  g.add(rbox(1.9, 0.5, 0.62, '#8c929c', { r: 0.03 }));
  g.add(rbox(1.96, 0.05, 0.68, '#b9bdc3', { y: 0.5, r: 0.02 }));
  g.add(rbox(1.9, 0.06, 0.01, '#5b7ea8', { y: 0.24, z: 0.316, r: 0.004, cast: false }));
  // monitor facing the guard (away from camera), a phone, a small plant
  const mon = new THREE.Group();
  mon.add(rbox(0.46, 0.3, 0.04, PAL.monitor, { y: 0.08, r: 0.015 }));
  mon.add(rbox(0.05, 0.1, 0.04, PAL.monitor, { r: 0.01 }));
  mon.position.set(0.2, 0.55, 0.05); g.add(mon);
  g.add(rbox(0.16, 0.05, 0.12, '#2c3038', { x: -0.45, y: 0.55, z: 0.05, r: 0.015 }));
  const pl = plant({ size: 0.5, seed: 4 }); pl.position.set(0.72, 0.55, 0.05); g.add(pl);
  return g;
}

function entrance() {
  const g = new THREE.Group();
  // two glass leaves and two side panels
  const glassM = new THREE.MeshStandardMaterial({ color: '#dce8ef', roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false });
  const frame = mat('#3f444e');
  const W = 4.6, H = 1.2;
  g.add(rbox(W + 0.2, 0.08, 0.14, null, { y: H, m: frame }));
  for (const x of [-W / 2, -W / 4 - 0.05, 0, W / 4 + 0.05, W / 2]) g.add(rbox(0.09, H, 0.12, null, { x, m: frame }));
  const panes = [];
  for (const [x0, x1] of [[-W / 2, -W / 4 - 0.05], [-W / 4 - 0.05, 0], [0, W / 4 + 0.05], [W / 4 + 0.05, W / 2]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.09, H - 0.04, 0.02), glassM);
    p.position.set((x0 + x1) / 2, H / 2, 0); p.renderOrder = 2; g.add(p); panes.push(p);
  }
  g.add(rbox(0.03, 0.34, 0.04, '#c9cdd3', { x: -0.08, y: 0.45, z: 0.06, r: 0.01 }), rbox(0.03, 0.34, 0.04, '#c9cdd3', { x: 0.08, y: 0.45, z: 0.06, r: 0.01 }));
  return g;
}

function liftDoor(x, z) {
  const g = new THREE.Group();
  g.add(rbox(1.34, 1.52, 0.08, '#5d636d', { r: 0.02 }));
  const inside = rbox(1.1, 1.36, 0.02, '#c9c3b6', { z: -0.06, r: 0.01, m: emissive('#d8cfbf', '#f3dfb8', 0.4) }); g.add(inside);
  const leaves = [-1, 1].map((s) => { const l = rbox(0.54, 1.36, 0.05, null, { x: s * 0.275, z: 0.03, r: 0.01, m: mat('#8e949d', { roughness: 0.45, metalness: 0.35 }) }); g.add(l); return l; });
  const ind = rbox(0.36, 0.12, 0.03, '#1d2027', { y: 1.4, z: 0.05, r: 0.01, cast: false }); g.add(ind);
  g.position.set(x, 0, z + 0.02);
  const L = { g, k: 0, want: 0, x };
  L.update = () => { L.k += (L.want - L.k) * 0.08; leaves[0].position.x = -0.275 - L.k * 0.5; leaves[1].position.x = 0.275 + L.k * 0.5; };
  return L;
}
function noticeScreen() {
  const notices = [['本日のお知らせ', 'Fire drill: Thursday 14:00'], ['本日のお知らせ', 'Canteen: curry day'], ['本日のお知らせ', 'Welcome, new staff!']];
  const texs = notices.map(([a, b]) => textTexture((g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#24405e'); gr.addColorStop(1, '#172536'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#9fc4e8'; g.font = '700 34px ' + JP_FONT; g.fillText(a, 28, 56); g.fillStyle = '#eef3f8'; g.font = '600 38px ' + JP_FONT; g.fillText(b, 28, 150); g.fillStyle = '#5d86ad'; g.fillRect(28, 190, W - 56, 6); }, 512, 280));
  const grp = new THREE.Group();
  grp.add(rbox(1.2, 0.72, 0.05, '#23262c', { r: 0.02, cast: false }));
  const m = new THREE.MeshStandardMaterial({ map: texs[0], emissive: new THREE.Color('#ffffff'), emissiveMap: texs[0], emissiveIntensity: 0.8, roughness: 0.4 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62), m); p.position.set(0, 0.36, 0.03); grp.add(p);
  let cur = 0;
  grp.userData.update = (t) => { const i = Math.floor(t / 5) % texs.length; if (i !== cur) { cur = i; m.map = texs[i]; m.emissiveMap = texs[i]; m.needsUpdate = true; } };
  return grp;
}

let _winTex = null;
function winMat(k) {
  if (!_winTex) _winTex = textTexture((g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#c9d6e2'); gr.addColorStop(0.55, '#f0d6b4'); gr.addColorStop(1, '#ffc98a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(80,90,105,.35)'; g.fillRect(W / 2 - 3, 0, 6, H); g.fillRect(0, H * 0.35, W, 5); }, 64, 128);
  return new THREE.MeshStandardMaterial({ map: _winTex, emissive: new THREE.Color('#ffffff'), emissiveMap: _winTex, emissiveIntensity: k, roughness: 0.3 });
}
function mat2(w, d, color) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), mat(color, { roughness: 0.95 })); m.position.y = 0.006; m.receiveShadow = true; return m; }

function sign(text, sub) {
  const tex = textTexture((g, W, H) => {
    g.fillStyle = '#2a2f38'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e9ecf0'; g.font = '700 120px ' + JP_FONT; g.textBaseline = 'middle'; g.fillText(text, 36, H / 2 + 4);
    g.fillStyle = '#9aa3b0'; g.font = '600 46px ' + JP_FONT; g.fillText(sub, 300, H / 2 + 6);
  }, 640, 180);
  const grp = new THREE.Group();
  const p = plane(1.2, 0.34, tex, { emissiveK: 0.35 }); grp.add(p);
  return grp;
}

export function buildLobby() {
  const root = new THREE.Group();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3b3f47');
  scene.add(root);

  // light: cool dim room, warm low sun through the right-hand windows, warm wall lamps
  const SUN_DIR = new THREE.Vector3(0.86, 0.3, -0.42).normalize();
  scene.add(new THREE.HemisphereLight('#b7c1d2', '#6a625c', 1.55));
  const sun = new THREE.DirectionalLight('#ffc990', 3.8);
  sun.position.copy(SUN_DIR).multiplyScalar(30);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 5, far: 70 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe7ff', 0.6); fill.position.set(0.3, 1, 0.9); scene.add(fill);
  for (const x of [-5.3, -2.9, 2.9, 5.3]) { const p = new THREE.PointLight('#ffc27e', 2.2, 3.6, 1.8); p.position.set(x, 1.05, -4.1); scene.add(p); }
  for (const z of [-3.4, -0.4, 2.0]) for (const s of [-1, 1]) { const p = new THREE.PointLight('#ffd3a0', 1.2, 3.0, 1.8); p.position.set(s * 5.9, 0.9, z); scene.add(p); }
  { const p = new THREE.PointLight('#ffc27e', 0.9, 4, 1.8); p.position.set(0, 0.9, 4.3); scene.add(p); }

  // floor, with the darker stone bands of the reference
  root.add(tileFloor(-X, X, -Z, Z, 1.25, { bands: [['z', -1.25, 0.28], ['z', 1.25, 0.28], ['x', -2.45, 0.28], ['x', 2.7, 0.28]] }));
  // outside strip beyond the entrance
  root.add(tileFloor(-X - 1, X + 1, Z, Z + 2.2, 1.25, { color: '#8e8a86', seam: '#7b7774' }));

  // back wall with lifts, doors, posters, lamps and a sign
  root.add(wall('x', -X - 0.15, X + 0.15, -Z - 0.08, WH, 0.16, { holes: [[3.5, 4.4, 0, 1.35]] }));
  const lifts = [-1.0, 1.0].map((x) => liftDoor(x, -Z)); lifts.forEach((l) => root.add(l.g));
  { const d = door(0.9, 1.35); d.position.set(3.95, 0, -Z); root.add(d); }
  const scr = noticeScreen(); scr.position.set(-3.95, 0.55, -Z + 0.03); root.add(scr);
  const p1 = poster(['PEOPLE', 'IDEAS', 'PROGRESS'], 'hills'); p1.position.set(-2.1, 0.45, -Z + 0.02); root.add(p1);
  const p2 = poster(['A', 'BRIGHTER', 'TOMORROW'], 'city'); p2.position.set(2.1, 0.45, -Z + 0.02); root.add(p2);
  { const pl = textTexture((g, W, H) => { g.fillStyle = '#e9ebee'; g.fillRect(0, 0, W, H); g.fillStyle = '#2b3140'; g.font = '700 70px ' + JP_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('階段', W / 2, H / 2 + 4); }, 256, 110); const pp = plane(0.36, 0.16, pl); pp.position.set(3.95, 1.5, -Z + 0.03); root.add(pp); }
  for (const x of [-5.3, -2.9, 2.9, 5.3]) { const l = wallLamp(0.72, 0.14); l.position.set(x, 1.0, -Z + 0.01); root.add(l); }
  const sg = sign('本社', 'HONSHA'); sg.position.set(0, 1.68, -Z + 0.03); root.add(sg);
  // lift call panel
  root.add(rbox(0.1, 0.18, 0.03, '#8d939d', { x: 0, y: 0.6, z: -Z + 0.01, r: 0.01 }));

  // side walls with tall warm windows
  const winHoles = [[-3.4, -2.2, 0.3, 1.6], [-1.0, 0.2, 0.3, 1.6], [1.4, 2.6, 0.3, 1.6]];
  for (const s of [-1, 1]) {
    root.add(wall('z', -Z, Z - 0.9, s * (X + 0.08), WH, 0.16, { holes: winHoles }));
    for (const [a, b, y0, y1] of winHoles) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), winMat(s > 0 ? 0.85 : 0.6));
      pane.position.set(s * (X + 0.06), (y0 + y1) / 2, (a + b) / 2); pane.rotation.y = -s * Math.PI / 2; root.add(pane);
    }
  }
  // front wall: low, with the glass entrance in the middle
  root.add(wall('x', -X - 0.15, -2.4, Z + 0.06, 0.5, 0.16));
  root.add(wall('x', 2.4, X + 0.15, Z + 0.06, 0.5, 0.16));
  const ent = entrance(); ent.position.set(0, 0, Z + 0.06); root.add(ent);
  { const im = mat2(2.2, 1.2, '#3c4658'); im.position.set(0, 0.006, Z - 0.75); root.add(im); }
  const outMat = mat2(2.4, 1.3, '#3c4658'); outMat.position.set(0, 0.006, Z + 1.0); root.add(outMat);
  for (const x of [-2.85, 2.85]) { const lp = lampPost(); lp.position.set(x, 0, Z + 0.5); root.add(lp); }

  // shadow proxy: tall walls with the same window slits and a roof, only for the sun
  const PH = 3.4;
  const proxyParts = [[2 * X + 0.4, 0.2, 2 * Z + 0.4, 0, PH, 0], [2 * X + 0.4, PH, 0.2, 0, PH / 2, -Z - 0.1]];
  // right wall: solid between tall window slits
  const slits = [[-4.2, -3.6], [-2.5, -1.8], [-0.6, 0.1], [1.3, 2.0], [3.1, 3.8]];
  let zc = -Z;
  for (const [a, b] of slits) { if (a > zc) proxyParts.push([0.2, PH, a - zc, X + 0.1, PH / 2, (zc + a) / 2]); zc = b; }
  proxyParts.push([0.2, PH, Z - zc, X + 0.1, PH / 2, (zc + Z) / 2]);
  proxyParts.push([0.2, 0.3, 2 * Z, X + 0.1, 0.15, 0]);         // sill
  const proxy = shadowProxy(proxyParts); root.add(proxy);

  // plants
  const plants = [[-5.7, -3.9], [-2.95, -3.95], [2.95, -3.95], [5.7, -3.9], [-5.75, -1.6], [5.75, -1.6], [-1.95, 3.95], [1.95, 3.95], [-5.8, 4.0], [5.8, 4.0]];
  plants.forEach(([x, z], i) => { const p = plant({ size: 1.15, seed: i + 2 }); p.position.set(x, 0, z); root.add(p); });

  // barrier: glass panels on steel posts, readers either side of the arch, guard desk on the right
  const BZ = -0.55;
  const glassM = new THREE.MeshStandardMaterial({ color: '#b9cad6', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
  function glassRun(x0, x1) {
    const n = Math.max(1, Math.round((x1 - x0) / 1.3));
    for (let i = 0; i <= n; i++) root.add(rbox(0.1, 0.62, 0.1, '#6b717c', { x: x0 + (x1 - x0) * i / n, z: BZ, r: 0.02 }));
    root.add(rbox(x1 - x0, 0.04, 0.08, '#7c828d', { x: (x0 + x1) / 2, y: 0.58, z: BZ, r: 0.015 }));
    const g = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.5, 0.02), glassM); g.position.set((x0 + x1) / 2, 0.31, BZ); g.renderOrder = 2; root.add(g);
  }
  glassRun(-X + 0.35, -1.2);
  glassRun(3.25, X - 0.35);
  const readers = [-0.93, 0.93].map((x) => { const r = readerPost(); r.position.set(x, 0, BZ); root.add(r); return r; });
  const ar = arch(); ar.position.set(0, 0, BZ); root.add(ar);
  const dk = guardDesk(); dk.position.set(2.2, 0, BZ); root.add(dk);
  // guard's chair behind the desk
  root.add(rbox(0.4, 0.3, 0.4, '#2c3242', { x: 2.35, z: BZ - 0.62, r: 0.04 }));

  // visitor counter on the public side, left of the gate, with the receptionist behind it
  const counter = new THREE.Group();
  counter.add(rbox(1.9, 0.52, 0.5, '#8c929c', { r: 0.03 }), rbox(1.96, 0.05, 0.56, '#bfc3c8', { y: 0.52, r: 0.02 }), rbox(1.9, 0.06, 0.01, '#5b7ea8', { y: 0.26, z: 0.256, r: 0.004, cast: false }));
  counter.add(rbox(0.34, 0.03, 0.24, '#f2f0ea', { x: 0.45, y: 0.57, z: 0.08, r: 0.005 }), rbox(0.02, 0.02, 0.18, '#2b3140', { x: 0.62, y: 0.58, z: 0.1, r: 0.005 }));
  counter.add(rbox(0.3, 0.2, 0.03, PAL.monitor, { x: -0.5, y: 0.58, z: -0.08, r: 0.01 }));
  { const cp = plant({ size: 0.45, seed: 11 }); cp.position.set(-0.8, 0.57, 0.05); counter.add(cp); }
  counter.position.set(-4.2, 0, 0.45); root.add(counter);
  { const t = textTexture((g, W, H) => { g.fillStyle = '#2a2f38'; g.fillRect(0, 0, W, H); g.fillStyle = '#e9ecf0'; g.font = '700 54px ' + JP_FONT; g.textBaseline = 'middle'; g.fillText('受付', 24, H / 2 + 2); g.fillStyle = '#9aa3b0'; g.font = '600 34px ' + JP_FONT; g.fillText('VISITORS', 160, H / 2 + 4); }, 400, 100); const p = plane(0.8, 0.2, t); p.position.set(-4.2, 0.27, 0.72); p.rotation.x = -0.2; root.add(p); }
  const lost = new THREE.Group();
  lost.add(rbox(0.9, 0.95, 0.36, '#9aa0a9', { r: 0.02 }));
  for (let i = 0; i < 2; i++) lost.add(rbox(0.84, 0.02, 0.32, '#b8bcc2', { y: 0.33 + i * 0.3, r: 0.006, cast: false }));
  lost.add(rbox(0.22, 0.14, 0.2, '#6a4f3e', { x: -0.24, y: 0.35, r: 0.03 }), rbox(0.3, 0.05, 0.2, '#b0506a', { x: 0.2, y: 0.35, r: 0.02 }), rbox(0.06, 0.26, 0.06, '#2f3649', { x: 0.3, y: 0.65, r: 0.02 }), rbox(0.2, 0.08, 0.14, '#d8c9a4', { x: -0.15, y: 0.65, r: 0.02 }));
  { const t = textTexture((g, W, H) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#2b3140'; g.font = '700 44px ' + JP_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('忘れ物', W / 2, H / 2 + 2); }, 256, 80); const p = plane(0.4, 0.12, t); p.position.set(0, 1.02, 0.19); lost.add(p); lost.add(rbox(0.44, 0.15, 0.02, '#8a909a', { y: 0.95, z: 0.17, r: 0.005, cast: false })); }
  lost.position.set(-5.85, 0, 0.3); lost.rotation.y = Math.PI / 2; root.add(lost);
  const kiosk = new THREE.Group();
  kiosk.add(rbox(0.8, 1.25, 0.6, '#4a4f59', { r: 0.03 }));
  kiosk.add(rbox(0.6, 0.5, 0.02, null, { x: 0, y: 0.62, z: 0.3, r: 0.02, m: emissive('#f1d8b8', '#e8b27a', 0.7), cast: false }));
  kiosk.add(rbox(0.24, 0.2, 0.2, '#1c1d20', { y: 0.2, z: 0.26, r: 0.02 }));
  { const t = textTexture((g, W, H) => { g.fillStyle = '#4a4f59'; g.fillRect(0, 0, W, H); g.fillStyle = '#f1e4d0'; g.font = '700 56px ' + JP_FONT; g.textAlign = 'center'; g.fillText('COFFEE', W / 2, 70); g.font = '600 34px ' + JP_FONT; g.fillText('¥120', W / 2, 118); }, 256, 140); const p = plane(0.5, 0.27, t); p.position.set(0, 0.62, 0.315); kiosk.add(p); }
  kiosk.position.set(5.72, 0, 3.0); kiosk.rotation.y = -Math.PI / 2; root.add(kiosk);
  // benches
  const b1 = bench(2.1); b1.position.set(-3.9, 0, 2.55); root.add(b1);
  const b2 = bench(2.1); b2.position.set(3.95, 0, 1.3); root.add(b2);
  const bag = rbox(0.22, 0.17, 0.1, '#6a4f3e', { x: 4.55, y: 0.29, z: 1.3, r: 0.03 }); root.add(bag);
  for (const [x, z, s] of [[-3.9, 2.55, 2.6], [3.95, 1.3, 2.6], [-4.2, 0.45, 2.4], [2.2, BZ, 2.4]]) { const b = blob(s, 0.28); b.scale.set(1, 0.35, 1); b.position.set(x, 0.004, z); root.add(b); }

  // people
  const up = (r) => { r.root.scale.multiplyScalar(K); return r; };
  const guard = up(PEOPLE.guard()); sit(guard); armsLap(guard); guard.root.position.set(2.35, 0.08, BZ - 0.62); root.add(guard.root);
  guard.arms[0].rotation.x = -1.1; guard.arms[1].rotation.x = -1.1;
  { const gb = blob(0.6, 0.3); gb.position.set(2.35, 0.004, BZ - 0.55); root.add(gb); }
  const man = up(PEOPLE.kuroda()); man.root.position.set(-1.2, 0, Z + 1.6); man.root.rotation.y = Math.PI; root.add(man.root);
  const manBlob = blob(0.55, 0.38); manBlob.position.set(-1.2, 0.004, Z + 1.6); root.add(manBlob);
  const tama = cat(); tama.scale.setScalar(1.15 * K); tama.position.set(3.45, 0, BZ + 0.42); tama.rotation.y = -0.5; root.add(tama);
  { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 14), mat('#d9dde2')); bowl.position.set(3.2, 0.025, BZ + 0.56); root.add(bowl); const tb = blob(0.5, 0.3); tb.position.set(3.4, 0.004, BZ + 0.45); root.add(tb); }
  const kuro = up(PEOPLE.kuro()); kuro.root.position.set(-4.2, 0, -0.05); root.add(kuro.root);
  { const b = blob(0.55, 0.35); b.position.set(-4.2, 0.004, -0.05); root.add(b); }
  const aoi = up(PEOPLE.aoi()); aoi.root.position.set(1.0, 0, Z + 0.8); root.add(aoi.root);
  const aoiBlob = blob(0.55, 0.38); root.add(aoiBlob);

  // walk grid
  const nav = new Nav(-X, X, -Z, Z + 1.5, 0.1);
  nav.block(-X - 1, X + 1, Z + 0.02, Z + 0.3);                       // front wall (gap made below)
  nav.rects.pop();
  nav.block(-X - 1, -2.4, Z - 0.02, Z + 0.3); nav.block(2.4, X + 1, Z - 0.02, Z + 0.3);
  nav.block(-X + 0.3, -1.1, BZ - 0.08, BZ + 0.08); nav.block(3.2, X, BZ - 0.08, BZ + 0.08);
  for (const x of [-0.93, 0.93]) nav.block(x - 0.15, x + 0.15, BZ - 0.17, BZ + 0.17);
  nav.block(-0.75, -0.6, BZ - 0.17, BZ + 0.17); nav.block(0.6, 0.75, BZ - 0.17, BZ + 0.17);
  nav.block(1.2, 3.25, BZ - 0.34, BZ + 0.34);                          // desk
  nav.block(1.9, 2.8, BZ - 1.0, BZ - 0.34);                            // guard and chair
  nav.blockTagged('gate', -0.6, 0.6, BZ - 0.1, BZ + 0.1);
  for (const [x, z] of plants) nav.block(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
  nav.block(-5.0, -2.8, 2.25, 2.85); nav.block(2.85, 5.05, 1.0, 1.6);
  for (const x of [-2.85, 2.85]) nav.block(x - 0.15, x + 0.15, Z + 0.35, Z + 0.65);
  nav.block(3.1, 3.75, BZ + 0.2, BZ + 0.75);                             // the cat and her bowl
  nav.block(-5.2, -3.2, BZ, 0.75);                                     // counter and receptionist
  nav.block(-X, -5.6, -0.2, 0.8);                                      // lost and found
  nav.block(5.35, X, 2.55, 3.45);                                      // coffee machine

  const world = { root, scene, sun, proxy, nav, readers, arch: ar, guard, man, kuro, aoi, aoiBlob, manBlob, tama, lifts, screen: scr, BZ, X, Z };
  world.update = (t) => {
    idle(guard, t); idle(kuro, t);
    for (const l of lifts) l.update(t);
    scr.userData.update(t);
    guard.head.rotation.y = Math.sin(t * 0.3) * 0.25;
    if (!man._walk) idle(man, t);
    tama.userData.tail.rotation.y = Math.sin(t * 1.3) * 0.3; tama.userData.head.rotation.x = 0.25 + Math.max(0, Math.sin(t * 2.2)) * 0.15;
    if (aoi.seated) idle(aoi, t);
  };
  return world;
}
