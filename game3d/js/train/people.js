// Chibi passengers, the cat and the player. Built like side/flat's Mio: every part is the convex hull
// of hand-placed points (no dents, every face checked to point outward), rigid parts on pivots.
// Simpler than Mio: a big round head, one hair mass, dark eyes with a highlight, no nose or mouth.
import * as THREE from 'three';
import { hull, beamHull, plate2, icoPoints } from './hull.js';
import { V, rng } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SEAT_Y } from './car.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export const S = 1.15; // chibi scale against the car

// soft shading: normals are smoothed across gentle angles and kept crisp at real edges
const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.78, metalness: 0 });
const screenMat = new THREE.MeshStandardMaterial({ color: '#bfe6ff', emissive: new THREE.Color('#9fd8ff'), emissiveIntensity: 0.9, roughness: 0.3 });

function mesh(geo, m = charMat) { const x = new THREE.Mesh(geo.isBufferGeometry ? geo : toCreasedNormals(geo.build(), 0.7), m); x.castShadow = true; x.receiveShadow = true; return x; }

// Proportions (standing, feet at y = 0)
const HIP = 0.32;          // hips pivot height
const TORSO_H = 0.31;
const HEAD_K = 0.74;       // head scale: about 2.8 heads tall
const HEAD = { rx: 0.245, ry: 0.222, rz: 0.232, c: 0.225 }; // c: head centre above the neck pivot

// unit sphere points from an icosphere (deduplicated)
function spherePts(detail) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    if (!seen.has(k)) seen.set(k, V(p.getX(i), p.getY(i), p.getZ(i)));
  }
  return [...seen.values()];
}
const SPH2 = spherePts(2);

// point and normal on the head ellipsoid, front side, at face coordinates (x, y) from the head centre
function faceAt(x, y, e = 0) {
  const { rx, ry, rz } = HEAD;
  const a = rx + e, b = ry + e, c = rz + e;
  const zz = c * Math.sqrt(Math.max(0.0001, 1 - (x / a) ** 2 - (y / b) ** 2));
  const p = V(x, y + HEAD.c, zz);
  const n = V(x / (a * a), y / (b * b), zz / (c * c)).normalize();
  return { p, n };
}
function tangentFrame(n) {
  const u = V(0, 1, 0).cross(n).normalize(); // points to +x on the front
  const v = n.clone().cross(u).normalize();   // up along the surface
  return { u, v };
}
function ellipse(w, h, n = 10, rot = 0) { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = Math.cos(a) * w / 2, y = Math.sin(a) * h / 2; o.push([x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]); } return o; }

function decal(x, y, outline, color, lift = 0.004, depth = 0.012, name = 'decal') {
  const { p, n } = faceAt(x, y);
  const { u, v } = tangentFrame(n);
  return plate2(outline, p.clone().addScaledVector(n, lift), u, v, n, depth, color, { name });
}

// ---------- head ----------
function headGeo(skin, { chubby = 1 } = {}) {
  const { rx, ry, rz, c } = HEAD;
  const pts = SPH2.map((q) => {
    const p = V(q.x * rx, q.y * ry, q.z * rz);
    // fuller cheeks and a softer, flatter chin: the cute chibi face
    if (q.y < 0.1) p.x *= 1 + 0.05 * chubby * (1 - Math.abs(q.y + 0.35));
    if (q.y < -0.6) p.y = -ry * (0.6 + (-(q.y) - 0.6) * 0.72);
    p.y += c;
    return p;
  });
  return hull(pts, skin, { grad: 0.08, name: 'head' });
}

function eyes(style, { col = '#2b2233', gap = 0.09, y = -0.05, w = 0.056, h = 0.064, shine = true } = {}) {
  const parts = [];
  for (const s of [-1, 1]) {
    const x = s * gap;
    if (style === 'closed') {
      // a gentle downward arc: three short strokes on the face
      const pts = [-0.028, -0.012, 0.012, 0.028].map((dx) => faceAt(x + dx, y - 0.006 + 0.012 * (1 - (dx / 0.028) ** 2) * -0.6 + 0.004, 0.004).p);
      for (let i = 0; i < 3; i++) parts.push(beamHull(pts[i], pts[i + 1], 0.011, 0.012, col, V(0, 0, 1)));
    } else {
      parts.push(decal(x, y, ellipse(w, h, 12), col, 0.003, 0.012, 'eye'));
      if (shine) parts.push(decal(x - s * 0.01 + 0.004, y + 0.014, ellipse(0.017, 0.019, 6), '#ffffff', 0.007, 0.006, 'shine'));
    }
  }
  return parts;
}

function blush(col) { return [-1, 1].map((s) => decal(s * 0.145, -0.1, ellipse(0.055, 0.026, 8), col, 0.002, 0.008, 'blush')); }

// Hair: one cap over the skull, cut by a plane that sits high at the front (the fringe line) and
// low at the back (the nape). Extra points make tufts, a V fringe, side locks, long hair or a bun.
function hairCap(color, o = {}) {
  const { rx, ry, rz, c } = HEAD;
  const e = o.e ?? 0.028;
  const a = rx + e, b = ry + e + (o.top ?? 0), cc = rz + e;
  const front = o.front ?? 0.055, back = o.back ?? -0.2, side = o.side ?? -0.07;
  // cut height as a function of the direction around the head (phi = 0 is the face)
  const cutY = (phi) => {
    const f = Math.cos(phi); // 1 front, -1 back
    const base = f > 0 ? side + (front - side) * f : side + (back - side) * -f;
    return base;
  };
  const pts = [V(0, b + c, 0)];
  const R = rng(o.seed ?? 3);
  const NL = o.nl ?? 11;
  for (let i = 0; i < NL; i++) {
    const phi = (i / NL) * Math.PI * 2;
    const sx = Math.sin(phi), sz = Math.cos(phi);
    // find the latitude where the ellipsoid meets the cut height
    const yc = cutY(phi);
    const th = Math.acos(Math.max(-1, Math.min(1, yc / b)));
    for (let k = 1; k <= 3; k++) {
      const t = (th * [0.42, 0.78, 1][k - 1]);
      let r = 1;
      if (o.messy && k < 3) r += (R() - 0.3) * o.messy;
      pts.push(V(a * Math.sin(t) * sx * r, b * Math.cos(t) * r + c, cc * Math.sin(t) * sz * r));
    }
  }
  // V fringe: a lower point in the middle of the forehead
  if (o.vfringe) { const p = faceAt(0, front - o.vfringe, e * 0.8).p; pts.push(p); }
  for (const t of o.tufts || []) pts.push(V(t[0], t[1] + c, t[2]));
  const parts = [hull(pts, color, { grad: 0.16, name: 'hair' })];
  if (o.locks) {
    for (const s of [-1, 1]) {
      const L = o.locks;
      const top = [V(s * (a - 0.01), c + side + 0.03, 0.09), V(s * (a - 0.01), c + side + 0.03, -0.05), V(s * (a - 0.06), c + side + 0.04, 0.14)];
      const bot = [V(s * (a - 0.035), c - L, 0.08), V(s * (a - 0.045), c - L + 0.02, 0.01), V(s * (a - 0.01), c - L * 0.6, 0.12)];
      const outer = [V(s * (a + 0.012), c + side - 0.02, 0.04)];
      parts.push(hull([...top, ...bot, ...outer], color, { grad: 0.2, name: 'lock' }));
    }
  }
  if (o.long) {
    // back mass from the crown down past the shoulders
    const L = o.long;
    const up = [];
    for (let i = 0; i < 9; i++) { const phi = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9; up.push(V(a * 0.98 * Math.sin(phi), c + 0.02, cc * 0.98 * Math.cos(phi))); }
    const low = [V(-0.19, c - L, -0.08), V(0.19, c - L, -0.08), V(-0.14, c - L - 0.03, -0.17), V(0.14, c - L - 0.03, -0.17), V(0, c - L - 0.05, -0.18), V(-0.25, c - L * 0.45, -0.03), V(0.25, c - L * 0.45, -0.03)];
    parts.push(hull([...up, ...low], color, { grad: 0.22, name: 'long' }));
  }
  if (o.bun) parts.push(hull(icoPoints(V(0, c + b * 0.8, -cc * 0.55), [0.1, 0.09, 0.1], 0.08, 5), color, { grad: 0.15, name: 'bun' }));
  return parts;
}

function glasses(col = '#2b2f3a') {
  const parts = [];
  for (const s of [-1, 1]) {
    const cx = s * 0.088, cy = -0.046, w = 0.085, h = 0.064;
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([dx, dy]) => faceAt(cx + dx, cy + dy, 0.02).p);
    for (let i = 0; i < 4; i++) parts.push(beamHull(corners[i], corners[(i + 1) % 4], 0.012, 0.012, col, V(0, 0, 1)));
  }
  parts.push(beamHull(faceAt(-0.046, -0.036, 0.02).p, faceAt(0.046, -0.036, 0.02).p, 0.012, 0.012, col, V(0, 0, 1)));
  return parts;
}

// ---------- body ----------
function torsoGeo(col, { w = 0.3, d = 0.18, h = TORSO_H, flare = 0 } = {}) {
  const p = [];
  const ring = (y, ww, dd, ch) => [[-ww / 2 + ch, y, dd / 2], [ww / 2 - ch, y, dd / 2], [ww / 2, y, dd / 2 - ch], [ww / 2, y, -dd / 2 + ch], [ww / 2 - ch, y, -dd / 2], [-ww / 2 + ch, y, -dd / 2], [-ww / 2, y, -dd / 2 + ch], [-ww / 2, y, dd / 2 - ch]];
  p.push(...ring(0, w * 0.84 + flare, d * 0.92, 0.035), ...ring(h * 0.78, w, d, 0.045), ...ring(h, w * 0.62, d * 0.72, 0.04));
  return hull(p, col, { grad: 0.14, name: 'torso', chamfer: 0.025 });
}
function pelvisGeo(col, { w = 0.25, d = 0.17, skirt = 0 } = {}) {
  const p = [];
  for (const [y, ww, dd] of [[-0.075, w * (0.92 + skirt), d * (0.95 + skirt * 0.6)], [0.03, w * 0.86, d * 0.92]]) {
    for (const [sx, sz] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) { p.push([sx * (ww / 2 - 0.03), y, sz * dd / 2], [sx * ww / 2, y, sz * (dd / 2 - 0.03)]); }
  }
  return hull(p, col, { grad: 0.1, name: 'pelvis' });
}
// tapered limb hanging down from its pivot: length L, top section (w0, d0), bottom (w1, d1)
function limbGeo(col, L, w0, d0, w1, d1, name) {
  const p = [];
  for (const [y, w, d] of [[0.01, w0 * 0.8, d0 * 0.8], [-0.02, w0, d0], [-L + 0.012, w1, d1], [-L, w1 * 0.8, d1 * 0.8]]) {
    for (const [sx, sz] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) p.push([sx * w / 2, y, sz * d / 2]);
  }
  return hull(p, col, { grad: 0.12, name, chamfer: 0.03 }); // well rounded, reads soft rather than boxy
}
function handGeo(skin) { return hull(icoPoints(V(0, 0, 0), [0.048, 0.05, 0.046], 0.05, 9), skin, { grad: 0.1, name: 'hand' }); }
function shoeGeo(col, sole) {
  const top = [[-0.045, 0.045, -0.05], [0.045, 0.045, -0.05], [-0.04, 0.04, 0.05], [0.04, 0.04, 0.05], [-0.035, 0.02, 0.1], [0.035, 0.02, 0.1]];
  const bot = [[-0.05, 0.012, -0.06], [0.05, 0.012, -0.06], [-0.05, 0.012, 0.1], [0.05, 0.012, 0.1], [-0.04, 0.0, 0.11], [0.04, 0.0, 0.11], [-0.045, 0, -0.06], [0.045, 0, -0.06]];
  return hull([...top, ...bot], col, { grad: 0.1, name: 'shoe', colorOf: (c) => (c.y < 0.014 ? sole : undefined) });
}

// A shirt V and a tie on the chest, as thin plates on the torso front.
function chestFront(shirt, tie, d = 0.18) {
  const parts = [];
  const z = d / 2 + 0.002, o = V(0, 0, z), u = V(1, 0, 0), v = V(0, 1, 0), n = V(0, 0, 1);
  parts.push(plate2([[-0.055, TORSO_H], [0.055, TORSO_H], [0, TORSO_H - 0.13]], V(0, 0, z - 0.012), u, v, n, 0.01, shirt, { name: 'vneck' }));
  if (tie) parts.push(plate2([[-0.014, TORSO_H - 0.01], [0.014, TORSO_H - 0.01], [0.02, TORSO_H - 0.12], [0, TORSO_H - 0.145], [-0.02, TORSO_H - 0.12]], V(0, 0, z - 0.006), u, v, n, 0.008, tie, { name: 'tie' }));
  void o;
  return parts;
}

// ---------- chibi ----------
export function chibi(o) {
  const skin = o.skin || '#f6d9c6';
  const root = new THREE.Group();
  root.scale.setScalar(o.scale ?? S);
  const hips = new THREE.Group(); hips.position.y = HIP; root.add(hips);
  hips.add(mesh(pelvisGeo(o.bottom, { skirt: o.skirt ? 0.12 : 0 })));
  const torso = new THREE.Group(); torso.position.y = 0.02; hips.add(torso);
  const tw = o.torsoW ?? 0.31;
  torso.add(mesh(torsoGeo(o.top, { w: tw })));
  for (const g of chestFront(o.shirt, o.tie)) if (o.shirt) torso.add(mesh(g));
  torso.add(mesh(hull([[-0.045, TORSO_H - 0.03, -0.03], [0.045, TORSO_H - 0.03, -0.03], [-0.045, TORSO_H - 0.03, 0.04], [0.045, TORSO_H - 0.03, 0.04], [-0.04, TORSO_H + 0.05, -0.025], [0.04, TORSO_H + 0.05, -0.025], [-0.04, TORSO_H + 0.05, 0.035], [0.04, TORSO_H + 0.05, 0.035]], skin, { grad: 0.2, name: 'neck' })));
  const head = new THREE.Group(); head.position.y = TORSO_H; torso.add(head);
  const headK = new THREE.Group(); headK.scale.setScalar(o.headK ?? HEAD_K); head.add(headK);
  headK.add(mesh(headGeo(skin)));
  for (const g of eyes(o.eyes || 'open', o.eyeOpts)) headK.add(mesh(g));
  if (o.blush) for (const g of blush(o.blush)) headK.add(mesh(g));
  for (const g of hairCap(o.hair, o.hairOpts || {})) headK.add(mesh(g));
  if (o.glasses) for (const g of glasses(o.glasses)) headK.add(mesh(g));
  const arms = [], legs = [], knees = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * (tw / 2 + 0.01), TORSO_H * 0.82, 0);
    arm.add(mesh(limbGeo(o.sleeve || o.top, 0.22, 0.095, 0.1, 0.078, 0.084, 'arm')));
    const hand = mesh(handGeo(skin)); hand.position.y = -0.255; arm.add(hand);
    arm.userData.hand = hand;
    torso.add(arm); arms.push(arm);
    const leg = new THREE.Group(); leg.position.set(s * 0.065, -0.03, 0);
    leg.add(mesh(limbGeo(o.legs || o.bottom, 0.16, 0.105, 0.11, 0.095, 0.1, 'thigh')));
    const knee = new THREE.Group(); knee.position.y = -0.155; leg.add(knee);
    knee.add(mesh(limbGeo(o.shin || o.legs || o.bottom, 0.1, 0.09, 0.095, 0.085, 0.09, 'shin')));
    const shoe = mesh(shoeGeo(o.shoes || '#3a3f4a', o.sole || '#f1f1ee')); shoe.position.y = -0.12; shoe.position.y = -0.1 + 0.0; knee.add(shoe);
    shoe.position.set(0, -0.13, 0);
    hips.add(leg); legs.push(leg); knees.push(knee);
  }
  const rig = { root, hips, torso, head, headK, arms, legs, knees, ph: o.phase ?? (o.hair.length * 1.7) % 6 };
  return rig;
}

// Poses
export function sit(r) {
  r.root.position.y = SEAT_Y - (HIP - 0.075) * r.root.scale.y + 0.012;
  for (const l of r.legs) l.rotation.x = -1.5;
  for (const k of r.knees) k.rotation.x = 1.35;
  r.legs[0].rotation.z = 0.04; r.legs[1].rotation.z = -0.04;
}
export function armsLap(r) { for (const [i, a] of r.arms.entries()) { a.rotation.x = -0.75; a.rotation.z = (i ? -1 : 1) * 0.28; } }
export function armsHold(r, x = -1.15, z = 0.52) { for (const [i, a] of r.arms.entries()) { a.rotation.x = x; a.rotation.z = (i ? -1 : 1) * z; } }

// small props held in the hands
export function phone() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.012, 0.12, 2, 0.006), new THREE.MeshStandardMaterial({ color: '#2d3240', roughness: 0.4 }));
  const s = new THREE.Mesh(new RoundedBoxGeometry(0.064, 0.004, 0.105, 1, 0.002), screenMat); s.position.y = 0.007;
  g.add(b, s); return g;
}
export function book() {
  const g = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: '#c8584f', roughness: 0.7 });
  const paper = new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 0.9 });
  const left = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.02, 0.15, 1, 0.006), paper); left.position.x = -0.058; left.rotation.z = 0.12;
  const right = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.02, 0.15, 1, 0.006), paper); right.position.x = 0.058; right.rotation.z = -0.12;
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.012, 0.16, 1, 0.005), cover); back.position.y = -0.016;
  const pagePiv = new THREE.Group();
  const page = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.004, 0.14), paper); page.position.x = 0.055;
  pagePiv.add(page); pagePiv.position.y = 0.014;
  g.add(left, right, back, pagePiv);
  g.userData.page = pagePiv;
  for (const m of [left, right, back, page]) { m.castShadow = true; m.receiveShadow = true; }
  return g;
}

// ---------- the cat (calico loaf) ----------
// Faces +z. A loaf body, a round head with two ears, closed happy eyes, a tail curled along the side.
export function cat() {
  const g = new THREE.Group();
  const W = '#fbf7f0', O = '#e59a52', K = '#4a3e3a';
  const patch = (c) => (c.x > 0.04 && c.z < 0.03 && c.y > 0.05 ? O : c.x < -0.07 && c.z < -0.0 && c.y > 0.06 ? K : undefined);
  g.add(mesh(hull(icoPoints(V(0, 0.085, -0.02), [0.17, 0.095, 0.12], 0.03, 11), W, { grad: 0.2, name: 'catbody', colorOf: patch })));
  const head = new THREE.Group(); head.position.set(-0.02, 0.17, 0.08); g.add(head);
  head.add(mesh(hull(icoPoints(V(0, 0, 0), [0.095, 0.08, 0.085], 0.03, 12), W, { grad: 0.12, name: 'cathead', colorOf: (c) => (c.x > 0.02 && c.y > 0.02 ? O : c.x < -0.03 && c.y > 0.03 ? K : undefined) })));
  for (const s of [-1, 1]) {
    head.add(mesh(hull([[s * 0.035, 0.05, -0.03], [s * 0.035, 0.05, 0.03], [s * 0.085, 0.045, 0.0], [s * 0.068, 0.12, 0.0], [s * 0.06, 0.06, 0.015]], s > 0 ? O : K, { grad: 0.05, name: 'ear' })));
    // closed eyes: a small arc on the face
    const e = (dx, dy) => V(s * 0.036 + dx, dy - 0.005, 0.083 - Math.abs(s * 0.036 + dx) * 0.25);
    head.add(mesh(beamHull(e(-0.016, 0.0), e(0, -0.008), 0.008, 0.009, K, V(0, 0, 1))), mesh(beamHull(e(0, -0.008), e(0.016, 0.0), 0.008, 0.009, K, V(0, 0, 1))));
  }
  head.add(mesh(hull(icoPoints(V(0, -0.028, 0.08), [0.012, 0.009, 0.006], 0, 3), '#e59a9a', { grad: 0, name: 'nose' })));
  const tail = new THREE.Group(); tail.position.set(0.15, 0.04, -0.03); g.add(tail);
  tail.add(mesh(beamHull(V(0, 0, 0), V(0.02, 0.0, 0.11), 0.045, 0.04, O)));
  const tip = new THREE.Group(); tip.position.set(0.02, 0, 0.11); tail.add(tip);
  tip.add(mesh(beamHull(V(0, 0, 0), V(-0.07, 0.005, 0.06), 0.04, 0.036, K)));
  g.userData = { head, tail, tip };
  return g;
}

// ---------- backpack for the player ----------
function backpack() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#e39a3b', roughness: 0.8 });
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.28, 0.14, 3, 0.06), m);
  const p = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.11, 0.05, 2, 0.022), new THREE.MeshStandardMaterial({ color: '#c77e2c', roughness: 0.85 }));
  p.position.set(0, -0.06, -0.08);
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.04, 0.1, 2, 0.018), new THREE.MeshStandardMaterial({ color: '#f3d9a8', roughness: 0.7 }));
  top.position.set(0, 0.14, 0);
  for (const x of [b, p, top]) { x.castShadow = true; x.receiveShadow = true; g.add(x); }
  return g;
}

// ---------- the cast of the carriage ----------
export const SKINS = ['#f6d9c6', '#f1cfb6', '#e9c2a0', '#f7ddcc'];

export function buildPassengers(LZ, SEAT_Y) {
  const list = [];
  const far = -(LZ - 0.24), near = LZ - 0.24;
  const add = (r, x, z, faceIn = true) => { r.root.position.x = x; r.root.position.z = z; r.root.rotation.y = z < 0 ? 0 : Math.PI; if (!faceIn) r.root.rotation.y += Math.PI; list.push(r); return r; };

  // 1. salaryman asleep, head nodding
  const sleeper = chibi({ skin: SKINS[1], top: '#2f3a55', bottom: '#2c354d', shirt: '#eef1f5', tie: '#8a3b46', hair: '#5a3e2f', eyes: 'closed', hairOpts: { messy: 0.08, front: 0.065, vfringe: 0.03, seed: 4 }, shoes: '#2a2524', sole: '#2a2524' });
  sit(sleeper); armsLap(sleeper); add(sleeper, -2.55, far);
  sleeper.head.rotation.z = 0.2;
  sleeper.act = (t, r) => {
    // slow drift down, a small catch back up every ~7 s
    const c = (t + 2.3) % 7.2, drop = c < 6.5 ? c / 6.5 : 1 - (c - 6.5) / 0.7;
    r.head.rotation.x = -0.2 + drop * 0.12 - (c > 6.5 && c < 6.8 ? 0.05 : 0);
    r.head.rotation.z = 0.36 + drop * 0.08 + Math.sin(t * 0.4) * 0.02;
  };

  // 2. woman on her phone
  const phoneW = chibi({ skin: SKINS[3], top: '#f3f0ea', sleeve: '#f3f0ea', bottom: '#2f3446', legs: '#2f3446', skirt: true, shin: '#e9c9b5', hair: '#e89fae', blush: '#f2b4ab', hairOpts: { locks: 0.17, long: 0.26, front: 0.06, vfringe: 0.035, seed: 7 }, shoes: '#3b2e2c', sole: '#3b2e2c', torsoW: 0.28 });
  sit(phoneW); armsHold(phoneW, -1.4, 0.5); add(phoneW, -1.7, far);
  const ph1 = phone(); ph1.position.set(0, 0.13, 0.21); ph1.rotation.x = 1.1; phoneW.torso.add(ph1);
  phoneW.head.rotation.x = -0.18;
  phoneW.act = (t, r) => { r.arms[1].rotation.x = -1.4 + Math.max(0, Math.sin(t * 5.1)) * 0.05; r.head.rotation.y = Math.sin(t * 0.3) * 0.05; };

  // 3. man reading, with glasses; turns a page now and then
  const reader = chibi({ skin: SKINS[0], top: '#f4f5f7', sleeve: '#f4f5f7', bottom: '#6b5646', shirt: null, tie: null, hair: '#23262e', glasses: '#26272c', hairOpts: { messy: 0.05, front: 0.07, vfringe: 0.025, seed: 12, tufts: [[0.08, 0.26, 0.05], [-0.06, 0.27, -0.02]] }, shoes: '#3b2e2c', sole: '#3b2e2c' });
  sit(reader); armsHold(reader, -1.05, 0.55); add(reader, 1.05, far);
  const bk = book(); bk.position.set(0, 0.05, 0.2); bk.rotation.x = 0.75; reader.torso.add(bk);
  reader.torso.add(mesh(plate2([[-0.015, TORSO_H - 0.005], [0.015, TORSO_H - 0.005], [0.02, TORSO_H - 0.11], [0, TORSO_H - 0.13], [-0.02, TORSO_H - 0.11]], V(0, 0, 0.09 - 0.004), V(1, 0, 0), V(0, 1, 0), V(0, 0, 1), 0.008, '#33456b', { name: 'tie' })));
  reader.head.rotation.x = -0.14;
  reader.act = (t, r) => {
    const c = (t + 1.0) % 6.5;
    const k = c < 0.7 ? c / 0.7 : 0; // page flips over the spine
    bk.userData.page.rotation.z = k > 0 ? Math.PI * (k * k * (3 - 2 * k)) : 0;
    bk.userData.page.visible = k > 0;
    r.head.rotation.x = -0.14 + Math.sin(t * 0.5) * 0.02;
  };

  // 4. someone in a cap and headphones, nodding to music
  const music = chibi({ skin: SKINS[2], top: '#5f7d6e', sleeve: '#5f7d6e', bottom: '#3a4150', hair: '#3d2f2a', hairOpts: { front: 0.02, side: -0.1, seed: 2 }, shoes: '#e8e6e0', sole: '#bfbcb4' });
  sit(music); armsHold(music, -0.95, 0.45); add(music, 2.5, far);
  // cap: a dome over the hair and a brim
  const { rx, ry, rz, c } = HEAD;
  const capPts = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; for (const [t, k] of [[0.35, 1], [0.8, 1], [1.12, 1]]) capPts.push(V((rx + 0.05) * Math.sin(t) * Math.sin(a) * k, (ry + 0.05) * Math.cos(t) + c + 0.01, (rz + 0.05) * Math.sin(t) * Math.cos(a) * k)); }
  capPts.push(V(0, ry + 0.06 + c, 0));
  music.headK.add(mesh(hull(capPts, '#3f4a5c', { grad: 0.15, name: 'cap' })));
  music.headK.add(mesh(hull([[-0.15, c + 0.08, 0.2], [0.15, c + 0.08, 0.2], [-0.13, c + 0.06, 0.34], [0.13, c + 0.06, 0.34], [0, c + 0.055, 0.37], [-0.15, c + 0.1, 0.2], [0.15, c + 0.1, 0.2], [0, c + 0.075, 0.37]], '#34404f', { grad: 0.05, name: 'brim' })));
  for (const s of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), new THREE.MeshStandardMaterial({ color: '#e0a44a', roughness: 0.5 }));
    cup.rotation.z = Math.PI / 2; cup.position.set(s * (rx + 0.04), c - 0.01, 0); cup.castShadow = true; music.headK.add(cup);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(rx + 0.07, 0.016, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.5 }));
  band.position.set(0, c - 0.01, 0); music.headK.add(band);
  const ph2 = phone(); ph2.position.set(0, 0.02, 0.21); ph2.rotation.x = 0.6; music.torso.add(ph2);
  music.act = (t, r) => { const b = Math.max(0, Math.sin(t * Math.PI * 2 * 1.05)); r.head.rotation.x = -0.3 + b * b * 0.1; r.torso.rotation.z = Math.sin(t * Math.PI * 1.05) * 0.015; };

  // 5. man standing by the far-right corner, bag in hand, looking out
  const stander = chibi({ skin: SKINS[1], top: '#343944', sleeve: '#343944', bottom: '#2e323b', shirt: '#e8ebef', hair: '#1f2229', hairOpts: { front: 0.06, messy: 0.04, seed: 21 }, shoes: '#222', sole: '#222' });
  stander.root.position.set(3.58, 0, -0.78); stander.root.rotation.y = Math.PI * 0.62;
  stander.arms[0].rotation.z = 0.12; stander.arms[1].rotation.x = -0.1;
  const sb = new THREE.Group(); const sbm = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.15, 0.08, 2, 0.03), new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.8 })); sbm.position.y = -0.1; sbm.castShadow = true; sb.add(sbm); sb.position.y = -0.24; stander.arms[1].add(sb);
  stander.act = (t, r, sway) => { r.root.rotation.z = -sway * 1.5; r.hips.rotation.y = Math.sin(t * 0.25) * 0.08; };
  list.push(stander);

  // 6. near side, seen from behind: woman with a bun
  const bunW = chibi({ skin: SKINS[0], top: '#f5f2ec', sleeve: '#f5f2ec', bottom: '#384059', hair: '#4b3a63', blush: '#f2b4ab', hairOpts: { bun: true, locks: 0.12, front: 0.05, seed: 9 }, torsoW: 0.28 });
  sit(bunW); armsHold(bunW, -1.1, 0.5); add(bunW, -2.5, near);
  const ph3 = phone(); ph3.position.set(0, 0.07, 0.2); ph3.rotation.x = 0.9; bunW.torso.add(ph3);
  bunW.head.rotation.x = 0.12;
  bunW.act = (t, r) => { r.head.rotation.y = -0.8 + Math.sin(t * 0.21 + 1) * 0.15; };

  // 7. near side: young guy with light olive hair
  const youth = chibi({ skin: SKINS[3], top: '#2f3542', sleeve: '#2f3542', bottom: '#4a5263', hair: '#c3c27e', hairOpts: { messy: 0.1, front: 0.05, seed: 31, tufts: [[0.0, 0.29, -0.06]] }, shoes: '#e8e6e0', sole: '#bfbcb4' });
  sit(youth); armsLap(youth); add(youth, 2.55, near);
  youth.head.rotation.y = 0.9; youth.head.rotation.x = -0.1;
  youth.act = (t, r) => { r.head.rotation.y = 0.9 + Math.sin(t * 0.17) * 0.25; };

  for (const r of list) r.breath = 0.012;
  return list;
}

export function buildPlayer() {
  const r = chibi({ skin: '#f7dccb', phase: 0, top: '#34466b', sleeve: '#34466b', bottom: '#44536f', shirt: '#a4adb8', hair: '#8a6446', hairOpts: { messy: 0.1, front: 0.065, vfringe: 0.035, seed: 42, tufts: [[0.1, 0.27, -0.04], [-0.1, 0.25, 0.02], [0.02, 0.29, -0.1]] }, shoes: '#eeeeea', sole: '#cfcac0' });
  const bp = backpack(); bp.position.set(0, TORSO_H * 0.55, -0.16); r.torso.add(bp);
  // backpack straps over the shoulders
  for (const s of [-1, 1]) r.torso.add(mesh(beamHull(V(s * 0.08, TORSO_H * 0.95, -0.02), V(s * 0.09, TORSO_H * 0.2, 0.092), 0.035, 0.012, '#3c4658', V(0, 0, 1))));
  r.pack = bp;
  return r;
}

// walk cycle (phase in radians) and idle
export function walkPose(r, ph, amt) {
  const s = Math.sin(ph);
  r.legs[0].rotation.x = s * 0.6 * amt; r.legs[1].rotation.x = -s * 0.6 * amt;
  r.knees[0].rotation.x = Math.max(0, -Math.cos(ph)) * 0.5 * amt; r.knees[1].rotation.x = Math.max(0, Math.cos(ph)) * 0.5 * amt;
  r.arms[0].rotation.x = -s * 0.5 * amt; r.arms[1].rotation.x = s * 0.5 * amt;
  r.arms[0].rotation.z = 0.1; r.arms[1].rotation.z = -0.1;
  r.hips.position.y = HIP + Math.abs(Math.cos(ph)) * 0.025 * amt;
  r.torso.rotation.y = s * 0.08 * amt;
  r.head.rotation.x = 0.06 - Math.abs(Math.cos(ph)) * 0.02 * amt;
}
export { HIP, TORSO_H, HEAD };
