// The showcase room: a compact office corner (two cut-away walls, a window with sun coming in, a door, vinyl tiles
// with a carpet area under the desk, desk, chair, monitor, PC, shelf of binders, filing cabinet, plants, pinboard,
// clock). The same content in every look; only avenue 8 swaps in the detailed builders (detail.js).
// Every mesh carries userData.surf (what it is made of), which the looks read: tile, grout, carpet, plaster, wallcap,
// skirting, laminate, metal, drawerfront, handle, plastic, monitor, tower, keys, fabric, binder, paper, card, ceramic,
// frame, door, glass, leaf, soil, screen, print.
import * as THREE from 'three';
import { PAL, mat, emissive, rbox, plant, wall, tileFloor, door, desk, officeChair, filingCabinet, shelf, pinboard, clock, shadowProxy } from '../props.js';
import { mug } from '../cast.js';
import * as D from './detail.js';

export const R = { X0: -2.6, X1: 2.6, Z0: -2.0, Z1: 2.0, WH: 1.45, T: 0.16 };
export const WIN = { x0: -1.55, x1: -0.15, y0: 0.42, y1: 1.28 };   // window hole in the back wall
export const DOOR = { z0: 0.2, z1: 1.0, h: 1.25 };                  // door hole in the left wall
export const DESK = { x: 1.15, z: -1.45, w: 1.3, d: 0.72 };
export const CARPET = { x0: -0.25, x1: 2.52, z0: -1.92, z1: 0.35 };
export const SPOTS = { eric: [-1.25, 0.75, 0.45], mio: [-0.5, 1.05, Math.PI - 0.35] };
// the office's colour grade (js/places/office.js), so the baseline is today's look
export const GRADE = { exposure: 1.12, temp: 0.03, sat: 0.94, contrast: 1.06, lift: [0.01, 0.012, 0.02], shadowTint: [-0.006, 0, 0.018], highTint: [0.02, 0.01, -0.012], vignette: 0.26, bloom: 0.4, bloomThreshold: 0.8, focusBand: 0.3 };

const hx = (c) => new THREE.Color(c).getHex();
// tag each untagged mesh under g by its material colour; anything unlisted gets `def`
export function tagBy(g, map, def) {
  const m2 = new Map(Object.entries(map).map(([k, v]) => [hx(k), v]));
  g.traverse((o) => {
    if (!o.isMesh || o.userData.surf) return;
    const c = o.material && o.material.color ? o.material.color.getHex() : -1;
    o.userData.surf = m2.get(c) || def;
  });
  return g;
}
export const tagAll = (g, surf) => { g.traverse((o) => { if (o.isMesh && !o.userData.surf) o.userData.surf = surf; }); return g; };

export function buildRoom({ detail = false } = {}) {
  const { X0, X1, Z0, Z1, WH, T } = R;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#33373f');
  const root = new THREE.Group(); scene.add(root);

  // light: the office's hemisphere and fill, a warm sun through the window, two ceiling lamps
  scene.add(new THREE.HemisphereLight('#aab4c6', '#5a5552', 1.3));
  const sun = new THREE.DirectionalLight('#ffe2b8', 3.2);
  sun.position.set(-3.5, 6.5, -9); sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dde6ff', 0.45); fill.position.set(0.3, 1, 0.9); scene.add(fill);
  for (const [x, z, k] of [[1.1, -0.8, 1.3], [0.9, 1.1, 1.1]]) { const p = new THREE.PointLight('#ffd6a0', k * 2.1, 3.2, 2.0); p.position.set(x, 1.3, z); scene.add(p); }
  // shadow-only shell: the walls above the cut line and a ceiling, so the sun only gets in through the window
  root.add(shadowProxy([
    [X1 - X0 + 0.4, 1.9, T, 0, WH + 0.95, Z0], [T, 1.9, Z1 - Z0 + 0.4, X0, WH + 0.95, 0], [X1 - X0 + 2, 0.1, Z1 - Z0 + 2, 0, 3.4, 0],
  ]));

  // ---- floor: vinyl tiles, carpet tiles in the desk area ----
  root.add(tagBy(tileFloor(X0, X1, Z0, Z1, 0.8, { color: '#979ca4', seam: '#868b93' }), { '#979ca4': 'tile', '#868b93': 'grout' }, 'tile'));
  const cw = CARPET.x1 - CARPET.x0, cd = CARPET.z1 - CARPET.z0;
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.012, cd), mat('#5f6a7a', { roughness: 0.95 }));
  carpet.position.set((CARPET.x0 + CARPET.x1) / 2, 0.006, (CARPET.z0 + CARPET.z1) / 2); carpet.receiveShadow = true; carpet.userData.surf = 'carpet'; carpet.name = 'carpet';
  root.add(carpet);

  // ---- walls ----
  const W = detail ? D.wall : wall;
  const back = W('x', X0 - T / 2, X1, Z0, WH, T, { holes: [[WIN.x0, WIN.x1, WIN.y0, WIN.y1]] });
  const left = W('z', Z0 - T / 2, Z1, X0, WH, T, { holes: [[DOOR.z0, DOOR.z1, 0, DOOR.h]] });
  for (const w of [back, left]) root.add(tagBy(w, { [PAL.wall]: 'plaster', [PAL.skirting]: 'skirting', [PAL.wallTop]: 'wallcap', [PAL.trim]: 'frame' }, 'plaster'));
  // window: a bright pane of sky and a frame
  const wx = (WIN.x0 + WIN.x1) / 2, wy = (WIN.y0 + WIN.y1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), emissive('#cfe0ef', '#dcebf7', 1.15));
  pane.position.set(wx, wy, Z0 - 0.02); pane.userData.surf = 'glass'; pane.castShadow = false; root.add(pane);
  const win = detail ? D.windowFrame(ww, wh) : windowFrame(ww, wh);
  win.position.set(wx, WIN.y0, Z0); root.add(tagBy(win, {}, 'frame'));
  // door, closed, in the left wall
  const dr = detail ? D.door(DOOR.z1 - DOOR.z0 - 0.02, DOOR.h) : door(DOOR.z1 - DOOR.z0 - 0.02, DOOR.h, { windows: true });
  dr.rotation.y = Math.PI / 2; dr.position.set(X0, 0, (DOOR.z0 + DOOR.z1) / 2); root.add(tagBy(dr, { [PAL.doorFrame]: 'frame', [PAL.door]: 'door', [PAL.doorWin]: 'glass', [PAL.metal]: 'handle' }, 'door'));
  if (detail) { const s = D.switchPlate(); s.rotation.y = Math.PI / 2; s.position.set(X0 + T / 2, 0.68, DOOR.z1 + 0.16); root.add(tagAll(s, 'plastic')); }

  // ---- desk corner ----
  const dk = detail ? D.desk({ w: DESK.w, d: DESK.d, seed: 2 }) : desk({ w: DESK.w, d: DESK.d, seed: 2 });
  dk.position.set(DESK.x, 0, DESK.z); root.add(tagDesk(dk));
  const mg = detail ? D.mug() : mug('#e9e6df'); mg.position.set(DESK.x + 0.36, 0.42 + 0.04 * (detail ? 0 : 1), DESK.z + 0.18); mg.userData.surf = 'ceramic'; root.add(tagAll(mg, 'ceramic'));
  const papers = detail ? D.paperPile(7) : rbox(0.21, 0.025, 0.29, PAL.paper, { r: 0.004 });
  papers.position.set(DESK.x - 0.2, 0.42, DESK.z + 0.16); papers.rotation.y = 0.12; root.add(tagAll(papers, 'paper'));
  const ch = detail ? D.chair() : officeChair();
  ch.position.set(DESK.x - 0.05, 0, DESK.z + 0.6); ch.rotation.y = Math.PI + 0.25; ch.userData.repeat = 'chair'; root.add(tagBy(ch, { [PAL.dark]: 'plastic', [PAL.chair]: 'fabric' }, 'plastic'));
  const tw = detail ? D.tower() : tower();
  tw.position.set(DESK.x - DESK.w / 2 - 0.16, 0, DESK.z - 0.08); root.add(tagAll(tw, 'tower'));
  const bin = detail ? D.bin() : wastebin();
  bin.position.set(DESK.x + DESK.w / 2 + 0.22, 0, DESK.z + 0.3); root.add(tagAll(bin, 'plastic'));
  if (detail) {
    // the monitor's cables: down the back of the desk through the grommet, along the floor to a socket on the wall
    const sock = D.socket(); sock.position.set(DESK.x + 0.3, 0.12, Z0 + T / 2); root.add(tagAll(sock, 'plastic'));
    root.add(tagAll(D.cables(DESK, Z0 + T / 2, [DESK.x - DESK.w / 2 - 0.16, DESK.z - 0.08]), 'cable'));
  }

  // ---- shelf of binders and boxes, filing cabinet, plants, pinboard, clock ----
  const sf = detail ? D.shelf(0.92, 1.1, 0.36, { seed: 3 }) : shelf(0.92, 1.1, 0.36, { fill: 'binders', seed: 3 });
  sf.position.set(-2.03, 0, Z0 + T / 2 + 0.2); root.add(tagBy(sf, { [PAL.metal]: 'metal', '#a3a9b2': 'metal', [PAL.paper]: 'paper', [PAL.box]: 'card', [PAL.boxDark]: 'card' }, 'binder'));
  const fc = detail ? D.filingCabinet(3) : filingCabinet(3);
  fc.rotation.y = Math.PI / 2; fc.position.set(X0 + T / 2 + 0.24, 0, -0.62); root.add(tagBy(fc, { '#8a909a': 'metal', '#9aa0a9': 'drawerfront', '#c9cdd2': 'handle' }, 'metal'));
  const box = rbox(0.36, 0.22, 0.3, PAL.box, { r: 0.012 }); box.position.set(fc.position.x, 0.7, fc.position.z); box.rotation.y = 0.1; root.add(tagAll(box, 'card'));
  const p1 = detail ? D.plant({ size: 1.35, seed: 4 }) : plant({ size: 1.35, seed: 4 }); p1.position.set(2.27, 0, Z0 + T / 2 + 0.3); root.add(tagPlant(p1));
  const p2 = detail ? D.plant({ size: 0.9, seed: 9 }) : plant({ size: 0.9, seed: 9 }); p2.position.set(-2.25, 0, 1.55); root.add(tagPlant(p2));
  const pb = pinboard(0.72, 0.42); pb.position.set(DESK.x - 0.05, 0.86, Z0 + T / 2 + 0.005); root.add(tagBy(pb, { '#6e6255': 'frame' }, 'print'));
  if (detail) pb.add(tagAll(D.pins(0.72, 0.42), 'plastic'));
  const ck = clock(); ck.position.set(2.1, 1.12, Z0 + T / 2 + 0.01); ck.userData.surf = 'print'; root.add(ck);
  if (detail) { const rim = D.clockRim(); rim.position.copy(ck.position); root.add(tagAll(rim, 'plastic')); }

  root.traverse((o) => { if (o.isMesh && !o.userData.surf) o.userData.surf = 'plastic'; });
  return { scene, root, sun };
}

// the desk from props.js (or detail.js) tagged by colour; the monitor body gets its own tag for the trim sheet
function tagDesk(dk) {
  dk.traverse((o) => {
    if (!o.isMesh || o.userData.surf) return;
    if (o.material && o.material.emissiveMap) { o.userData.surf = 'screen'; return; }
    const c = o.material.color.getHex();
    if (c === hx(PAL.monitor)) { o.geometry.computeBoundingBox(); const s = new THREE.Vector3(); o.geometry.boundingBox.getSize(s); o.userData.surf = s.x > 0.3 && s.y > 0.2 ? 'monitor' : 'plastic'; }
  });
  return tagBy(dk, { [PAL.deskTop]: 'laminate', [PAL.drawer]: 'metal', [PAL.trim]: 'drawerfront', '#cfd1d4': 'keys', [PAL.dark]: 'plastic', [PAL.paper]: 'paper', '#4a5b78': 'ceramic', [PAL.deskLeg]: 'metal', '#c9cdd2': 'handle', '#4a6490': 'binder', '#6a7a8c': 'binder', '#3d4d6b': 'binder', '#5b6f86': 'binder' }, 'plastic');
}
function tagPlant(p) {
  p.traverse((o) => { if (o.isMesh && !o.userData.surf) o.userData.surf = o.material.vertexColors ? 'leaf' : null; });
  return tagBy(p, { [PAL.planter]: 'ceramic', [PAL.soil]: 'soil' }, 'ceramic');
}

// ---- small props in the current style (rounded boxes, one colour each) ----
function windowFrame(w, h) {
  const g = new THREE.Group(), f = 0.05, t = 0.2;
  g.add(rbox(w + f * 2, f, t, PAL.trim, { y: -f, r: 0.01 }));
  g.add(rbox(w + f * 2, f, t, PAL.trim, { y: h, r: 0.01 }));
  for (const s of [-1, 1]) g.add(rbox(f, h, t, PAL.trim, { x: s * (w / 2 + f / 2), r: 0.01 }));
  return g;
}
function tower() {
  const g = new THREE.Group();
  g.add(rbox(0.2, 0.42, 0.44, '#3a3f49', { r: 0.02 }));
  g.add(rbox(0.03, 0.03, 0.01, '#6fd0c6', { x: 0.05, y: 0.36, z: 0.222, r: 0.005, cast: false, m: emissive('#6fd0c6', '#6fd0c6', 1.4) }));
  return g;
}
function wastebin() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.3, 14), mat('#4f5866'));
  m.position.y = 0.15; m.castShadow = true; m.receiveShadow = true; g.add(m);
  return g;
}
