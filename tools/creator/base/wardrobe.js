// Clothes and hair made from the base body itself, so every piece fits every base (creator-base-5: "a small
// assortment of other clothes and hair to demonstrate customizability and reusability").
//
// Clothes are shells of the base body: the body triangles of a region (torso down to a hem, arms to a sleeve
// length, legs to a trouser length, feet) pushed out along their normals, keeping the body's skin weights, so they
// move with the body in every pose. The skirt is a flared ring on the hips. Hair is a low-poly cap shrink-wrapped
// round the base's head (ray cast from the head's centre), with a style shaping its hairline, length and tufts;
// it rides the Head bone.
//
//   const g = clothesGeometry(base.d, joints, 'tee');   // or hairGeometry(base.d, 'bob')
//   const mesh = wardrobeMesh(ch, g, '#3a6ea5');
import * as THREE from 'three';
import { BONES } from '../recipe.js';

const B = Object.fromEntries(BONES.map((name, index) => [name, index]));

// ---------- clothes ----------

// sleeve: how far down the arm (0 shoulder joint, 1 wrist); straps: a sleeveless top's width (fraction of the
// shoulder joints' spread); hem: top's lower edge between hips (0) and the lowest
// spine joint (1); legs: trouser length (0 hip joint, 1 ankle). Offsets are in body heights.
export const CLOTHES = {
  shirt: { slot: 'top', label: 'Long-sleeve shirt', sleeve: 0.8, hem: -0.35, neck: 0.5, offset: 0.010 },
  tee: { slot: 'top', label: 'T-shirt', sleeve: 0.42, hem: -0.25, neck: 0.35, offset: 0.010 },
  tank: { slot: 'top', label: 'Sleeveless top', straps: 0.8, hem: -0.2, neck: 0.1, offset: 0.009 },
  jacket: { slot: 'top', label: 'Jacket', sleeve: 0.82, hem: -0.7, neck: 0.7, offset: 0.016 },
  trousers: { slot: 'bottom', label: 'Trousers', legs: 0.96, waist: 0.05, offset: 0.007 },
  shorts: { slot: 'bottom', label: 'Shorts', legs: 0.4, waist: 0.05, offset: 0.007 },
  skirt: { slot: 'bottom', label: 'Pleated skirt', skirt: 0.45, follow: 0.55, waist: 0.05, offset: 0.007 },
  longskirt: { slot: 'bottom', label: 'Long skirt', skirt: 0.8, follow: 0.6, waist: 0.05, offset: 0.007 },
  sneakers: { slot: 'shoes', label: 'Sneakers', ankle: 0.93, offset: 0.012, sole: 0.018 },
  boots: { slot: 'shoes', label: 'Boots', ankle: 0.62, offset: 0.013, sole: 0.02 },
};

const lerp = (a, b, t) => a + (b - a) * t;

// Where a corner of the body sits: zone (torso, neck, arm, hand, leg, foot) and how far down its limb it is.
// Measured from the joints, not the skin weights: the source-derived bodies carry their weights over from the
// original clothes (a hood, loose sleeves), so a chest corner can be weighted mostly to an arm or the head.
const segment = (p, a, b) => {
  const ab = b.clone().sub(a), s = p.clone().sub(a).dot(ab) / ab.lengthSq();
  return { s, dist: p.distanceTo(a.clone().addScaledVector(ab, THREE.MathUtils.clamp(s, 0, 1))) };
};
export function classify(d, i, J) {
  const p = new THREE.Vector3().fromArray(d.pos, i * 3);
  const side = Math.sign(p.x - J.Hips.x) === Math.sign(J.LeftArm.x - J.Hips.x) ? 'Left' : 'Right';
  const arm = segment(p, J[side + 'Arm'], J[side + 'Hand']);
  const armLength = J[side + 'Arm'].distanceTo(J[side + 'Hand']);
  const outside = Math.abs(p.x - J.Hips.x) > Math.abs(J[side + 'Arm'].x - J.Hips.x) * 0.75;
  // The hands keep their source weights, so a corner weighted mostly to a hand or forearm is one.
  let best = 0;
  for (let k = 1; k < 4; k++) if (d.sw[i * 4 + k] > d.sw[i * 4 + best]) best = k;
  const bone = BONES[d.si[i * 4 + best]];
  if (bone === side + 'Hand') return { zone: 'hand', p };
  if (bone === side + 'ForeArm') return arm.s > 1 - 0.01 / armLength ? { zone: 'hand', p } : { zone: 'arm', s: arm.s, p };
  if (outside && arm.s > -0.05 && arm.dist < 0.06) {
    if (arm.s > 1 - 0.01 / armLength) return { zone: 'hand', p };
    return { zone: 'arm', s: arm.s, p };
  }
  if (outside && arm.s > 0.9 && arm.dist < 0.09) return { zone: 'hand', p };
  if (p.y > J.neck.y - 0.012) return { zone: 'neck', p };
  const crotch = J[side + 'UpLeg'].y - 0.03;
  if (p.y < crotch) {
    if (p.y < J[side + 'Foot'].y + 0.005) return { zone: 'foot', p };
    return { zone: 'leg', s: (J[side + 'UpLeg'].y - p.y) / (J[side + 'UpLeg'].y - J[side + 'Foot'].y), p };
  }
  return { zone: 'torso', p };
}

// A garment is the body cut by planes (hems, neckline, sleeve ends, trouser ends): each cut is a function of the
// position that is positive on the covered side. Triangles are clipped exactly on the plane, so hems are straight.
// Only triangles of the zones a garment can reach are used (never hands; tops never the feet).
function cuts(spec, J, zone, side) {
  const hemY = lerp(J.Hips.y, J.Spine02.y, spec.hem ?? 0), waistY = lerp(J.Hips.y, J.Spine02.y, spec.waist ?? 0);
  const legY = (s) => lerp(J[side + 'UpLeg'].y, J[side + 'Foot'].y, s);
  if (spec.slot === 'top') {
    if (!['torso', 'neck', 'arm', 'leg'].includes(zone)) return null;
    const neckY = lerp(J.Spine.y, J.neck.y, spec.neck), list = [(p) => p.y - hemY, (p) => neckY - p.y];
    if (spec.straps) list.push((p) => Math.abs(J[side + 'Arm'].x - J.Hips.x) * spec.straps - Math.abs(p.x - J.Hips.x));
    else if (zone === 'arm') {
      const a = J[side + 'Arm'], axis = J[side + 'Hand'].clone().sub(a), length = axis.length();
      axis.normalize();
      list.push((p) => spec.sleeve * length - p.clone().sub(a).dot(axis));
    }
    return list;
  }
  if (spec.slot === 'bottom') {
    if (!['torso', 'leg'].includes(zone)) return null;
    const end = legY(spec.skirt ? 0.12 : spec.legs);
    return [(p) => waistY - p.y, (p) => p.y - end];
  }
  if (!['leg', 'foot'].includes(zone)) return null;
  const top = legY(spec.ankle);
  return [(p) => top - p.y];
}

// weights of a clipped corner: blend two corners' bone weights, keep the four strongest
function blendWeights(a, b, t) {
  const w = new Map();
  for (const [corner, f] of [[a, 1 - t], [b, t]]) for (let k = 0; k < 4; k++) {
    const bone = corner.si[k], x = corner.sw[k] * f;
    if (x > 0) w.set(bone, (w.get(bone) || 0) + x);
  }
  const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4), total = top.reduce((sum, [, x]) => sum + x, 0) || 1;
  while (top.length < 4) top.push([0, 0]);
  return { si: top.map(([bone]) => bone), sw: top.map(([, x]) => x / total) };
}
function lerpCorner(a, b, t) {
  return { p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), ...blendWeights(a, b, t) };
}
// Sutherland-Hodgman against one cut
function clip(poly, f) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length], fa = f(a.p), fb = f(b.p);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) out.push(lerpCorner(a, b, fa / (fa - fb)));
  }
  return out;
}

// Which way a garment corner is pushed off the body. On the limbs, straight out from the bone: the joined wrists
// and ankles have normals that lean along the limb, which would push the cuff out into spikes.
function outward(p, n, zone, J) {
  if (zone !== 'arm' && zone !== 'leg') return n;
  const side = Math.sign(p.x - J.Hips.x) === Math.sign(J.LeftArm.x - J.Hips.x) ? 'Left' : 'Right';
  const chain = zone === 'arm' ? ['Arm', 'ForeArm', 'Hand'] : ['UpLeg', 'Leg', 'Foot'];
  let best = null;
  for (let k = 0; k < 2; k++) {
    const a = J[side + chain[k]], b = J[side + chain[k + 1]], ab = b.clone().sub(a);
    const s = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1), q = a.clone().addScaledVector(ab, s);
    const dist = p.distanceTo(q);
    if (!best || dist < best.dist) best = { dist, axis: ab.normalize() };
  }
  const radial = n.clone().addScaledVector(best.axis, -n.dot(best.axis));
  return radial.lengthSq() > 1e-6 ? radial.normalize() : n;
}

// The shell of the body a garment covers.
export function clothesGeometry(d, J, id) {
  const spec = CLOTHES[id];
  if (!spec) throw new Error('No garment ' + id);
  const out = { pos: [], normal: [], si: [], sw: [], col: [] };
  const sole = new THREE.Color('#f2f0ea').toArray();
  for (let t = 0; t < d.T; t++) {
    if (d.pieces[t] !== 'body') continue;
    const zones = [0, 1, 2].map((k) => classify(d, t * 3 + k, J).zone);
    const zone = zones[1] === zones[2] ? zones[1] : zones[0];
    const cx = (d.pos[t * 9] + d.pos[t * 9 + 3] + d.pos[t * 9 + 6]) / 3;
    const side = Math.sign(cx - J.Hips.x) === Math.sign(J.LeftArm.x - J.Hips.x) ? 'Left' : 'Right';
    const list = cuts(spec, J, zone, side);
    if (!list || (spec.slot === 'top' && zones.includes('hand'))) continue;
    let poly = [0, 1, 2].map((k) => {
      const i = t * 3 + k;
      return { p: new THREE.Vector3().fromArray(d.pos, i * 3), n: outward(new THREE.Vector3().fromArray(d.pos, i * 3), new THREE.Vector3().fromArray(d.normal, i * 3), zones[k], J),
        si: d.si.slice(i * 4, i * 4 + 4), sw: d.sw.slice(i * 4, i * 4 + 4) };
    });
    for (const f of list) { poly = clip(poly, f); if (poly.length < 3) break; }
    if (poly.length < 3) continue;
    // shoes: a pale sole below spec.sole
    const parts = spec.sole ? [[clip(poly, (p) => spec.sole - p.y), sole], [clip(poly, (p) => p.y - spec.sole), null]] : [[poly, null]];
    for (const [piece, colour] of parts) for (let k = 1; k + 1 < piece.length; k++) {
      for (const c of [piece[0], piece[k], piece[k + 1]]) {
        out.pos.push(...c.p.clone().addScaledVector(c.n, spec.offset).toArray()); out.normal.push(...c.n.toArray());
        out.si.push(...c.si); out.sw.push(...c.sw); out.col.push(...(colour || [1, 1, 1]));
      }
    }
  }
  if (spec.skirt) appendSkirt(out, d, J, spec);
  return finish(out);
}

// A flared ring skirt: waist and hip rings on the Hips bone; the hem also follows each thigh a little, and every
// other hem vertex sits further out, for pleats.
function appendSkirt(out, d, J, spec) {
  const n = 16, waistY = lerp(J.Hips.y, J.Spine02.y, spec.waist) + 0.01;
  const kneeY = lerp(J.LeftUpLeg.y, J.LeftFoot.y, spec.skirt);
  const hipY = lerp(waistY, kneeY, 0.25);
  const centre = new THREE.Vector2(J.Hips.x, J.Hips.z);
  // body extent round the waist and hips (torso and thighs only)
  const reach = (y0, y1) => {
    const r = new Array(n).fill(0);
    for (let i = 0; i < d.T * 3; i++) {
      const t = Math.floor(i / 3);
      if (d.pieces[t] !== 'body') continue;
      const y = d.pos[i * 3 + 1];
      if (y < y0 || y > y1 || Math.abs(d.pos[i * 3] - J.Hips.x) > Math.abs(J.LeftArm.x - J.Hips.x) * 0.9 || !['torso', 'leg'].includes(classify(d, i, J).zone)) continue;
      const x = d.pos[i * 3] - centre.x, z = d.pos[i * 3 + 2] - centre.y;
      const a = Math.atan2(x, z), dist = Math.hypot(x, z);
      for (let k = 0; k < n; k++) {
        const diff = Math.abs(Math.atan2(Math.sin(a - k * 2 * Math.PI / n), Math.cos(a - k * 2 * Math.PI / n)));
        if (diff < Math.PI / n * 1.5) r[k] = Math.max(r[k], dist * Math.cos(diff));
      }
    }
    return r;
  };
  const waistR = reach(waistY - 0.015, waistY + 0.015), hipR = reach(hipY - 0.04, hipY + 0.02);
  const maxHip = Math.max(...hipR);
  const leftSign = Math.sign(J.LeftUpLeg.x - J.Hips.x) || 1;
  const rings = [
    { y: waistY, r: (k) => waistR[k] + 0.012, w: () => [[B.Hips, 1]] },
    { y: hipY, r: (k) => Math.max(hipR[k], waistR[k]) + 0.014, w: () => [[B.Hips, 1]] },
    { y: kneeY, r: (k) => (Math.max(hipR[k], maxHip * 0.8) + 0.02) * (1.22 + spec.skirt * 0.3) * (k % 2 ? 1.06 : 1), w: (x) =>
      Math.abs(x) < 0.02 ? [[B.Hips, 1]] : [[B.Hips, 1 - spec.follow], [B[(Math.sign(x) === leftSign ? 'Left' : 'Right') + 'UpLeg'], spec.follow]] },
  ];
  const ring = rings.map((R) => Array.from({ length: n }, (_, k) => {
    const a = k * 2 * Math.PI / n, r = R.r(k);
    const x = centre.x + Math.sin(a) * r, z = centre.y + Math.cos(a) * r;
    return { p: [x, R.y, z], w: R.w(x - centre.x) };
  }));
  for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < n; k++) {
    const a = ring[j][k], b = ring[j][(k + 1) % n], c = ring[j + 1][k], e = ring[j + 1][(k + 1) % n];
    tri(out, a, c, e); tri(out, a, e, b);
  }
}

function tri(out, ...corners) {
  const [a, b, c] = corners.map((v) => new THREE.Vector3(...v.p));
  const nrm = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  for (const v of corners) {
    out.pos.push(...v.p); out.normal.push(...nrm.toArray());
    const w = v.w.slice(0, 4), total = w.reduce((s, [, x]) => s + x, 0);
    for (let k = 0; k < 4; k++) { out.si.push(w[k] ? w[k][0] : 0); out.sw.push(w[k] ? w[k][1] / total : 0); }
    out.col.push(...(v.c || [1, 1, 1]));
  }
}

function finish({ pos, normal, si, sw, col }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

// ---------- hair ----------

// Hairline: polar angle from the crown (degrees) by direction round the head (0 = the face). front: the fringe
// over the forehead; side and back: how far down the sides and nape reach. tufts: the fringe's points.
// fall: straight-hanging length below the head's widest ring (bob), in body heights. spikes: tufts over the crown.
export const HAIR = {
  crop: { label: 'Short crop', front: 70, side: 96, back: 118, tufts: 6, tuft: 8, thick: 0.012 },
  bob: { label: 'Bob', front: 74, side: 96, back: 100, tufts: 7, tuft: 12, thick: 0.016, fall: 0.11, coversEars: true },
  ponytail: { label: 'Ponytail', front: 72, side: 98, back: 112, tufts: 5, tuft: 9, thick: 0.013, tail: true },
  spiky: { label: 'Spiky', front: 70, side: 98, back: 118, tufts: 7, tuft: 12, thick: 0.014, spikes: 0.045 },
};

// farthest hit of a ray from `o` along `dir` against triangles (flat array of 9 per triangle)
function farthest(o, dir, tris) {
  let best = 0;
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), h = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < tris.length; t += 9) {
    a.fromArray(tris, t); b.fromArray(tris, t + 3); c.fromArray(tris, t + 6);
    e1.subVectors(b, a); e2.subVectors(c, a); h.crossVectors(dir, e2);
    const det = e1.dot(h);
    if (Math.abs(det) < 1e-12) continue;
    s.subVectors(o, a);
    const u = s.dot(h) / det; if (u < -1e-6 || u > 1 + 1e-6) continue;
    q.crossVectors(s, e1);
    const v = dir.dot(q) / det; if (v < -1e-6 || u + v > 1 + 1e-6) continue;
    const dist = e2.dot(q) / det;
    if (dist > best) best = dist;
  }
  return best;
}

// Base positions with separate ear pieces (Mio's) folded in towards where they join the head, for hair that
// covers the ears. The original hair hid them; without this a bob would have to stand out round them.
export function tuckedEars(d, amount = 0.7) {
  const pos = Float32Array.from(d.pos);
  for (const sign of [-1, 1]) {
    const corners = [];
    for (let t = 0; t < d.T; t++) if (d.pieces[t] === 'ear' && Math.sign(d.pos[t * 9]) === sign) corners.push(t * 3, t * 3 + 1, t * 3 + 2);
    if (!corners.length) continue;
    const inner = [...corners].sort((a, b) => Math.abs(d.pos[a * 3]) - Math.abs(d.pos[b * 3])).slice(0, Math.max(3, corners.length / 5));
    const root = [0, 1, 2].map((a) => inner.reduce((sum, i) => sum + d.pos[i * 3 + a], 0) / inner.length);
    for (const i of corners) for (let a = 0; a < 3; a++) pos[i * 3 + a] = root[a] + (d.pos[i * 3 + a] - root[a]) * (1 - amount);
  }
  return pos;
}

export function hairGeometry(d, id) {
  const S = HAIR[id];
  if (!S) throw new Error('No hair style ' + id);
  const head = [], ears = [], source = S.coversEars ? tuckedEars(d) : d.pos;
  for (let t = 0; t < d.T; t++) {
    const list = d.pieces[t] === 'head' ? head : d.pieces[t] === 'ear' ? ears : null;
    if (list) for (let k = 0; k < 9; k++) list.push(source[t * 9 + k]);
  }
  const box = new THREE.Box3().setFromArray(head);
  const C = box.getCenter(new THREE.Vector3());
  C.y = lerp(box.min.y, box.max.y, 0.5);
  const wrap = head.concat(ears), capWrap = S.coversEars ? wrap : head;   // short styles leave the ears out
  const nLon = 20, nLat = 9;
  const hairline = (phi) => {   // phi in radians, 0 = face
    const a = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi))) * 180 / Math.PI;
    const base = a < 40 ? S.front : a < 110 ? lerp(S.front, S.side, Math.min(1, (a - 40) / 30)) : lerp(S.side, S.back, (a - 110) / 70);
    return base;
  };
  const out = { pos: [], normal: [], si: [], sw: [], col: [] };
  const headW = [[B.Head, 1]];
  const dir = (theta, phi) => new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
  const shade = (f) => { const v = 1 - 0.28 * f; return [v, v, v]; };
  const grid = [];
  for (let i = 0; i < nLon; i++) {
    const phi = i * 2 * Math.PI / nLon, a = Math.abs(Math.atan2(Math.sin(phi), Math.cos(phi))) * 180 / Math.PI;
    let edge = hairline(phi);
    const front = a < 55;
    if (front && S.tufts && i % 2 === 0) edge += S.tuft * (a < 40 ? 1 : 0.6);   // fringe points
    const col = [];
    for (let j = 0; j <= nLat; j++) {
      const theta = (edge * Math.PI / 180) * j / nLat;
      const dv = dir(theta, phi);
      // the farthest of a few rays round this one, so no bump of the head between grid points pokes through
      let r = farthest(C, dv, capWrap);
      for (const [dt, dp] of [[0.08, 0], [-0.08, 0], [0, 0.12], [0, -0.12]]) r = Math.max(r, farthest(C, dir(Math.max(0, theta + dt), phi + dp), capWrap));
      r += S.thick;
      if (S.spikes && j >= 2 && j <= nLat - 2 && (i + j) % 3 === 0) r += S.spikes;
      col.push({ p: C.clone().addScaledVector(dv, r).toArray(), w: headW, c: shade(j / nLat) });
    }
    // bob: hang straight down from the hairline ring outside the face, a little flared
    if (S.fall && !front) {
      const last = new THREE.Vector3(...col[nLat].p);
      const out2 = last.clone().sub(C).setY(0).normalize();
      const flare = Math.min(1, (a - 55) / 30);
      const bottom = last.clone().addScaledVector(out2, 0.02 * flare);
      bottom.y = Math.min(last.y, box.min.y + 0.03) - S.fall * flare * 0.35;
      // hang clear of the ears and cheeks: at least as far out as anything of the head in this direction
      let reach = 0;
      for (let v = 0; v < wrap.length; v += 3) {
        if (wrap[v + 1] > last.y + 0.01 || wrap[v + 1] < bottom.y) continue;
        const x = wrap[v] - C.x, z = wrap[v + 2] - C.z, along2 = x * out2.x + z * out2.z;
        if (along2 > 0 && Math.abs(x * out2.z - z * out2.x) < along2 * Math.tan(Math.PI / nLon * 1.5)) reach = Math.max(reach, along2);
      }
      for (const point of [last, bottom]) {
        const r = Math.hypot(point.x - C.x, point.z - C.z), want = Math.max(r, reach + S.thick);
        point.x = C.x + out2.x * want; point.z = C.z + out2.z * want;
      }
      bottom.addScaledVector(out2, 0.01 * flare);
      col[nLat] = { ...col[nLat], p: last.toArray() };
      col.push({ p: bottom.toArray(), w: headW, c: shade(1.2) });
    } else col.push({ p: col[nLat].p, w: headW, c: shade(1) });
    grid.push(col);
  }
  const rows = nLat + 1;
  for (let i = 0; i < nLon; i++) {
    const A = grid[i], Bc = grid[(i + 1) % nLon];
    for (let j = 0; j < rows; j++) {
      if (j === 0) { tri(out, A[0], A[1], Bc[1]); continue; }
      tri(out, A[j], A[j + 1], Bc[j + 1]); tri(out, A[j], Bc[j + 1], Bc[j]);
    }
  }
  // underside rim: the hairline edge turned in towards the head, so the hair has a visible thickness
  for (let i = 0; i < nLon; i++) {
    const A = grid[i][rows], Bc = grid[(i + 1) % nLon][rows];
    const inA = { ...A, p: new THREE.Vector3(...A.p).lerp(C, 0.08).toArray(), c: shade(1.4) };
    const inB = { ...Bc, p: new THREE.Vector3(...Bc.p).lerp(C, 0.08).toArray(), c: shade(1.4) };
    tri(out, A, inA, inB); tri(out, A, inB, Bc);
  }
  if (S.tail) appendTail(out, C, box, wrap, headW, shade);
  return finish(out);
}

// Ponytail: a tapered six-sided tail from the back of the head, with a band where it is tied.
function appendTail(out, C, box, wrap, w, shade) {
  const back = new THREE.Vector3(0, -0.12, -1).normalize();
  const root = C.clone().addScaledVector(back, farthest(C, back, wrap) + 0.01);
  const path = [
    { at: root.clone().add(new THREE.Vector3(0, 0.015, 0.02)), r: 0.03, c: shade(0.4) },
    { at: root.clone().add(new THREE.Vector3(0, -0.005, -0.02)), r: 0.036, c: [0.25, 0.25, 0.28] },   // band
    { at: root.clone().add(new THREE.Vector3(0, -0.03, -0.035)), r: 0.05, c: shade(0.5) },
    { at: root.clone().add(new THREE.Vector3(0, -0.1, -0.065)), r: 0.062, c: shade(0.7) },
    { at: root.clone().add(new THREE.Vector3(0, -0.19, -0.055)), r: 0.042, c: shade(0.9) },
    { at: root.clone().add(new THREE.Vector3(0, -0.25, -0.04)), r: 0, c: shade(1.1) },
  ];
  const n = 6, ring = path.map((P) => Array.from({ length: n }, (_, k) => {
    const a = k * 2 * Math.PI / n;
    return { p: P.at.clone().add(new THREE.Vector3(Math.cos(a) * P.r, 0, Math.sin(a) * P.r * 0.8)).toArray(), w, c: P.c };
  }));
  for (let j = 0; j < path.length - 1; j++) for (let k = 0; k < n; k++) {
    const a = ring[j][k], b = ring[j][(k + 1) % n], c = ring[j + 1][k], e = ring[j + 1][(k + 1) % n];
    tri(out, a, b, e); tri(out, a, e, c);
  }
}

// ---------- mesh ----------

export function wardrobeMesh(ch, geometry, colour, name) {
  const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(colour), vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.SkinnedMesh(geometry, m);
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.bind(ch.skeleton, new THREE.Matrix4());
  return mesh;
}
