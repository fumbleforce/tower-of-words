// Clothes made from the base body itself, so every piece fits both bodies (creator-base-5: "a small assortment of
// other clothes and hair"; creator-base-6: "Hair and clothes need more character, like the original ones, and fit
// the anime theme. New ones are too plain, simple.").
//
// A garment is a list of pieces. A piece is part of the body's surface cut out by functions of the position (hems,
// necklines, sleeve and trouser ends, the edge of a collar or pocket), pushed out along the body's normals and
// keeping its skin weights, so it moves with the body in every pose. A piece laid over another with a bigger offset
// is a collar, pocket, belt or cuff. Inside a piece, regions split the triangles exactly on a line to colour bands,
// stripes, seams and placket lines. Where a piece is cut, a lip turns the edge in to the body, so a cuff or hem
// is closed. Accessories (buttons, bows, ties, drawstrings, buckles, collars, skirts) are small meshes placed on
// the body's surface, weighted like the body where they sit. Colours are baked into vertex colours: the garment's
// main colour (the player's pick) and fixed trims.
//
//   const g = clothesGeometry(base.d, joints, 'sailor', '#f4f2ee');
//   const mesh = wardrobeMesh(ch, g, 'top-sailor', flat);
import * as THREE from 'three';
import { BONES } from '../recipe.js';

const B = Object.fromEntries(BONES.map((name, index) => [name, index]));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const WHITE = '#f4f2ee', NAVY = '#1f2c4a', INK = '#23252c', RED = '#b8343a', METAL = '#c9ccd2', SOLE = '#eeece6';

// ---------- where a body corner is ----------

// Zone (torso, neck, arm, hand, leg, foot) and how far down its limb, measured from the joints: the source-derived
// bodies carry weights from the original clothes (a hood, loose sleeves), so a chest corner can be weighted mostly
// to an arm or the head.
const segment = (p, a, b) => {
  const ab = b.clone().sub(a), s = p.clone().sub(a).dot(ab) / ab.lengthSq();
  return { s, dist: p.distanceTo(a.clone().addScaledVector(ab, THREE.MathUtils.clamp(s, 0, 1))) };
};
const sideOf = (x, J) => (Math.sign(x - J.Hips.x) === Math.sign(J.LeftArm.x - J.Hips.x) ? 'Left' : 'Right');
export function classify(d, i, J) {
  const p = new THREE.Vector3().fromArray(d.pos, i * 3);
  const side = sideOf(p.x, J);
  const arm = segment(p, J[side + 'Arm'], J[side + 'Hand']);
  const armLength = J[side + 'Arm'].distanceTo(J[side + 'Hand']);
  const outside = Math.abs(p.x - J.Hips.x) > Math.abs(J[side + 'Arm'].x - J.Hips.x) * 0.75;
  let best = 0;
  for (let k = 1; k < 4; k++) if (d.sw[i * 4 + k] > d.sw[i * 4 + best]) best = k;
  const bone = BONES[d.si[i * 4 + best]];
  if (bone === side + 'Hand') return { zone: 'hand', p };
  if (bone === side + 'ForeArm') return arm.s > 1 - 0.01 / armLength ? { zone: 'hand', p } : { zone: 'arm', s: arm.s, p };
  // near the arm and weighted to it; the waist beside a hanging hand is near the arm too, but weighted to the spine
  const armish = /Arm|Shoulder|Hand/.test(bone);
  if (outside && armish && arm.s > -0.05 && arm.dist < 0.06) {
    if (arm.s > 1 - 0.01 / armLength) return { zone: 'hand', p };
    return { zone: 'arm', s: arm.s, p };
  }
  if (outside && armish && arm.s > 0.9 && arm.dist < 0.09) return { zone: 'hand', p };
  if (p.y > J.neck.y - 0.012) return { zone: 'neck', p };
  const crotch = J[side + 'UpLeg'].y - 0.03;
  if (p.y < crotch) {
    if (p.y < J[side + 'Foot'].y + 0.005) return { zone: 'foot', p };
    return { zone: 'leg', s: (J[side + 'UpLeg'].y - p.y) / (J[side + 'UpLeg'].y - J[side + 'Foot'].y), p };
  }
  return { zone: 'torso', p };
}

// ---------- cut functions (positive on the covered side) ----------

// A neckline: a scoop round the neck that only cuts near it, so the shoulders stay covered (Codex review X-0290:
// a flat neckline left Eric's shoulder caps bare). v: how far the front drops at the middle (a V).
const neckline = (J, { lift = 0, v = 0, vWidth = 0.06, scoop = 0.004 } = {}) => (p) => {
  const horiz = Math.hypot(p.x - J.neck.x, p.z - J.neck.z), front = clamp01((p.z - J.neck.z) / 0.05);
  const line = J.neck.y + lift - scoop * front - v * front * Math.max(0, 1 - Math.abs(p.x - J.neck.x) / vWidth) + 3 * Math.max(0, horiz - 0.05);
  return line - p.y;
};
const hemAt = (J, s) => (p) => p.y - lerp(J.Hips.y, J.Spine02.y, s);   // s: 0 at the hips, 1 at the lowest spine joint
const waistAt = (J, s) => (p) => lerp(J.Hips.y, J.Spine02.y, s) - p.y;
// along the arm from the shoulder joint; s = 1 at the wrist. Only the arms are cut (zone: the triangle's zone), so the
// waist beside a hanging hand stays covered.
const sleeveAt = (J, s) => (p, zone) => {
  if (zone && zone !== 'arm') return 1;
  const side = sideOf(p.x, J), a = J[side + 'Arm'], axis = J[side + 'Hand'].clone().sub(a), len = axis.length();
  return s * len - p.clone().sub(a).dot(axis.normalize());
};
const legAt = (J, s) => (p) => { const side = sideOf(p.x, J); return p.y - lerp(J[side + 'UpLeg'].y, J[side + 'Foot'].y, s); };
const front = (J, z = 0) => (p) => p.z - (J.Spine.z + z);
const back = (J, z = 0) => (p) => J.Spine.z + z - p.z;
const within = (c, half) => (p) => half - Math.abs(p.x - c);
// fold lines: thin darker creases across the front of the knee, bent down towards the outside
const kneeFolds = (J) => (p, zone) => {
  if (zone && zone !== 'leg') return -1;
  const side = sideOf(p.x, J), knee = J[side + 'Leg'], across = Math.abs(p.x - knee.x);
  if (p.z < knee.z - 0.01) return -1;
  return Math.max(...[0.004, -0.014].map((dy) => 0.0018 - Math.abs(p.y - (knee.y + dy - 0.35 * across))));
};
// a crease round the inside of the elbow
const elbowFold = (J) => (p, zone) => {
  if (zone && zone !== 'arm') return -1;
  const side = sideOf(p.x, J), e = J[side + 'ForeArm'];
  return 0.0022 - Math.abs(Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z) - 0.012);
};
const legCentre = (J, p) => { const side = sideOf(p.x, J); return lerp(J[side + 'UpLeg'].x, J[side + 'Foot'].x, 0.5); };

// ---------- garments ----------
// Each garment: slot, label, main colour, pieces(J) and optional extras(put, J). A piece: zones it may cover, keep
// (cuts), offset from the skin, colour (a role), regions [{ f, colour }] (first match wins, f >= 0 inside), lip
// (the colour of the turned-in edge, or null for none). Roles: 'main', a hex colour, or ['main', shade].
const shade = (f) => ['main', f];
export const CLOTHES = {
  hoodie: {
    slot: 'top', label: 'Hoodie', main: '#8a93a3',
    pieces: (J) => [
      { zones: ['torso', 'neck', 'arm', 'leg'], keep: [hemAt(J, -0.32), neckline(J, { lift: 0.004 }), sleeveAt(J, 0.9)], offset: 0.014, colour: 'main',
        regions: [{ f: elbowFold(J), colour: shade(0.78) }, { f: (p) => 0.022 - hemAt(J, -0.32)(p), colour: shade(0.82) }, { f: (p, z) => 0.03 - sleeveAt(J, 0.9)(p, z), colour: shade(0.82) }], lip: shade(0.7) },
      // kangaroo pocket
      { zones: ['torso', 'leg'], keep: [front(J, 0.03), within(J.Hips.x, 0.075), hemAt(J, -0.12), (p) => lerp(J.Hips.y, J.Spine02.y, 0.45) - p.y - 0.8 * Math.abs(p.x - J.Hips.x)],
        offset: 0.02, colour: shade(0.93), lip: shade(0.72) },
    ],
    extras: (put, J) => {
      put.hood(J, 'main');
      for (const s of [-1, 1]) put.cord(J.neck.x + s * 0.022, J.neck.y - 0.012, 0.075, WHITE, METAL);
    },
  },
  sailor: {
    slot: 'top', label: 'Sailor blouse', main: WHITE,
    pieces: (J) => {
      const collarBack = J.Spine.y - 0.035, vBottom = lerp(J.Spine02.y, J.Spine.y, 0.45);
      const vLine = (p) => vBottom + 1.25 * Math.abs(p.x - J.neck.x);
      const edge = (p) => (p.z < J.neck.z ? p.y - collarBack : p.y - vLine(p));   // the collar's outer edge (0 on the edge)
      const vEdge = neckline(J, { v: J.neck.y - vBottom, vWidth: 0.08 });
      return [
        // the dickey filling the V
        { zones: ['torso', 'neck'], keep: [neckline(J, { lift: 0.004 }), front(J, 0.0), (p) => 0.012 - vEdge(p)], offset: 0.01, colour: 'main', lip: null },
        { zones: ['torso', 'neck', 'arm', 'leg'], keep: [hemAt(J, 0.05), neckline(J, { v: J.neck.y - vBottom, vWidth: 0.08 }), sleeveAt(J, 0.46)], offset: 0.012, colour: 'main',
          regions: [{ f: (p, z) => 0.0025 - Math.abs(sleeveAt(J, 0.46)(p, z) - 0.011), colour: WHITE }, { f: (p, z) => 0.018 - sleeveAt(J, 0.46)(p, z), colour: NAVY }], lip: NAVY },
        // the sailor collar: square at the back, down to the V at the front, with a white stripe near its edge
        { zones: ['torso', 'neck', 'arm'], keep: [edge, neckline(J, { v: J.neck.y - vBottom, vWidth: 0.08 }), (p) => 0.13 - Math.abs(p.x - J.neck.x)],
          offset: 0.018, colour: NAVY, regions: [{ f: (p) => 0.004 - Math.abs(edge(p) - 0.012), colour: WHITE }], lip: NAVY },
      ];
    },
    extras: (put, J) => { const vBottom = lerp(J.Spine02.y, J.Spine.y, 0.45); put.bow(J.neck.x, vBottom + 0.004, RED, 0.034); },
  },
  shirt: {
    slot: 'top', label: 'Shirt and tie', main: WHITE, accent: NAVY,
    pieces: (J) => [
      { zones: ['torso', 'neck', 'arm', 'leg'], keep: [hemAt(J, -0.3), neckline(J, { lift: 0.006 }), sleeveAt(J, 0.9)], offset: 0.011, colour: 'main',
        regions: [{ f: (p, z) => 0.022 - sleeveAt(J, 0.9)(p, z), colour: shade(0.92) }, { f: (p) => Math.min(front(J, 0.02)(p), 0.005 - Math.abs(p.x - J.neck.x)), colour: shade(0.9) }], lip: shade(0.8) },
    ],
    extras: (put, J, colours) => {
      put.collar(J, 'shirt', 'main');
      put.tie(J, colours.accent || NAVY);
    },
  },
  blazer: {
    slot: 'top', label: 'Blazer', main: NAVY, accent: RED,
    pieces: (J) => {
      const vBottom = lerp(J.Spine02.y, J.Spine.y, 0.1), v = J.neck.y - vBottom, vw = 0.1;
      const vEdge = (p) => neckline(J, { v, vWidth: vw })(p);
      return [
        // the shirt showing in the V
        { zones: ['torso', 'neck'], keep: [neckline(J, { lift: 0.006 }), front(J, 0.0), (p) => 0.012 - vEdge(p)], offset: 0.011, colour: WHITE, lip: null },
        { zones: ['torso', 'neck', 'arm', 'leg'], keep: [hemAt(J, -0.55), vEdge, sleeveAt(J, 0.9)], offset: 0.022, colour: 'main',
          regions: [{ f: (p) => Math.min(front(J, 0.02)(p), 0.004 - Math.abs(p.x - J.Hips.x - 0.006)), colour: shade(0.72) },
            { f: (p, z) => 0.02 - sleeveAt(J, 0.9)(p, z), colour: shade(0.9) }], lip: shade(0.6) },
        // lapels: a raised band along the V
        { zones: ['torso', 'neck'], keep: [vEdge, (p) => 0.026 - vEdge(p), front(J, 0.0), (p) => p.y - vBottom + 0.01], offset: 0.027, colour: shade(0.82), lip: shade(0.6) },
        // pocket flaps
        { zones: ['torso', 'leg'], keep: [front(J, 0.03), (p) => Math.abs(p.x - J.Hips.x) - 0.03, (p) => 0.075 - Math.abs(p.x - J.Hips.x), hemAt(J, -0.18), (p) => lerp(J.Hips.y, J.Spine02.y, -0.1) - p.y],
          offset: 0.027, colour: shade(0.8), lip: shade(0.6) },
      ];
    },
    extras: (put, J, colours) => {
      put.tie(J, colours.accent || RED, 0.5);
      for (const y of [lerp(J.Spine02.y, J.Spine.y, -0.05), lerp(J.Hips.y, J.Spine02.y, 0.45)]) put.button(J.Hips.x + 0.006, y, METAL, 0.008);
    },
  },
  tee: {
    slot: 'top', label: 'Ringer tee', main: '#d9dde3', accent: '#3a6ea5',
    pieces: (J, colours) => [
      { zones: ['torso', 'neck', 'arm', 'leg'], keep: [hemAt(J, -0.22), neckline(J, { scoop: 0.01 }), sleeveAt(J, 0.44)], offset: 0.011, colour: 'main',
        regions: [{ f: (p, z) => 0.016 - sleeveAt(J, 0.44)(p, z), colour: colours.accent },
          { f: (p) => 0.009 - Math.abs(p.y - lerp(J.Spine02.y, J.Spine.y, 0.55)), colour: colours.accent },
          { f: (p) => 0.004 - Math.abs(p.y - lerp(J.Spine02.y, J.Spine.y, 0.3)), colour: colours.accent }], lip: colours.accent },
    ],
    extras: (put, J, colours) => put.rib(J, colours.accent),
  },
  trousers: {
    slot: 'bottom', label: 'Slim trousers', main: '#2b2f3a',
    pieces: (J) => [
      { zones: ['torso', 'leg', 'foot'], keep: [waistAt(J, 0.08), legAt(J, 0.95)], offset: 0.009, colour: 'main',
        regions: [{ f: (p) => Math.min(front(J, 0.01)(p), 0.0025 - Math.abs(p.x - legCentre(J, p)), p.y > J.LeftUpLeg.y - 0.03 ? -1 : 1), colour: shade(0.72) },
          { f: (p) => 0.018 - legAt(J, 0.95)(p), colour: shade(0.86) }, { f: kneeFolds(J), colour: shade(0.78) }], lip: shade(0.7) },
      // belt
      { zones: ['torso'], keep: [waistAt(J, 0.1), (p) => p.y - lerp(J.Hips.y, J.Spine02.y, -0.05)], offset: 0.015, colour: INK, lip: INK },
      // back pockets
      { zones: ['torso', 'leg'], keep: [back(J, -0.02), (p) => Math.abs(p.x - J.Hips.x) - 0.018, (p) => 0.07 - Math.abs(p.x - J.Hips.x), (p) => lerp(J.Hips.y, J.Spine02.y, -0.12) - p.y, (p) => p.y - J.LeftUpLeg.y + 0.035],
        offset: 0.013, colour: shade(0.9), lip: shade(0.7) },
    ],
    extras: (put, J) => put.buckle(J.Hips.x, lerp(J.Hips.y, J.Spine02.y, 0.025), METAL),
  },
  cargo: {
    slot: 'bottom', label: 'Cargo shorts', main: '#6f7a5a',
    pieces: (J) => [
      { zones: ['torso', 'leg'], keep: [waistAt(J, 0.08), legAt(J, 0.42)], offset: 0.01, colour: 'main', lip: shade(0.7) },
      // turned-up cuffs
      { zones: ['leg'], keep: [(p) => 0.03 - legAt(J, 0.42)(p), legAt(J, 0.42)], offset: 0.016, colour: shade(0.88), lip: shade(0.7) },
      // side pockets with flaps
      { zones: ['leg'], keep: [(p) => Math.abs(p.x - J.Hips.x) - Math.abs(legCentre(J, p) - J.Hips.x) - 0.012, legAt(J, 0.33), (p) => -legAt(J, 0.12)(p)], offset: 0.017, colour: shade(0.93),
        regions: [{ f: (p) => -legAt(J, 0.17)(p), colour: shade(0.78) }], lip: shade(0.68) },
      { zones: ['torso'], keep: [waistAt(J, 0.1), (p) => p.y - lerp(J.Hips.y, J.Spine02.y, -0.05)], offset: 0.015, colour: INK, lip: INK },
    ],
    extras: (put, J) => put.buckle(J.Hips.x, lerp(J.Hips.y, J.Spine02.y, 0.025), METAL),
  },
  pleated: {
    slot: 'bottom', label: 'Pleated skirt', main: NAVY,
    pieces: (J) => [
      { zones: ['torso', 'leg'], keep: [waistAt(J, 0.1), legAt(J, 0.1)], offset: 0.008, colour: 'main', lip: null },
      { zones: ['torso'], keep: [waistAt(J, 0.12), (p) => p.y - lerp(J.Hips.y, J.Spine02.y, -0.02)], offset: 0.014, colour: shade(0.8), lip: shade(0.7) },
    ],
    extras: (put, J) => put.skirt(J, { length: 0.56, pleats: 28, pleated: true, flare: 1.3, stripes: [[0.12, WHITE], [0.22, WHITE]] }),
  },
  sneakers: {
    slot: 'shoes', label: 'Sneakers', main: '#3a6ea5',
    pieces: (J) => [
      { zones: ['leg', 'foot'], keep: [(p) => -legAt(J, 0.93)(p)], offset: 0.012, colour: 'main',
        regions: [{ f: (p) => 0.016 - p.y, colour: SOLE }, { f: (p) => Math.min(0.03 - p.y, p.z - lerp(J.LeftFoot.z, J.LeftToeBase.z, 0.9)), colour: SOLE },
          { f: (p) => Math.min(p.y - 0.034, 0.011 - Math.abs(p.x - lerp(J[sideOf(p.x, J) + 'Foot'].x, J[sideOf(p.x, J) + 'ToeBase'].x, 0.5)), p.z - J[sideOf(p.x, J) + 'Foot'].z), colour: WHITE },
          { f: (p) => legAt(J, 0.93)(p) + 0.012, colour: shade(0.7) }], lip: shade(0.6) },
    ],
  },
  loafers: {
    slot: 'shoes', label: 'Loafers', main: '#2b2f3a',
    pieces: (J) => [
      { zones: ['foot', 'leg'], keep: [(p) => lerp(J.LeftFoot.y, 0, 0.1) - p.y + 0.004], offset: 0.011, colour: 'main',
        regions: [{ f: (p) => 0.012 - p.y, colour: '#3d4049' }, { f: (p) => Math.min(0.006 - Math.abs(p.z - lerp(J.LeftFoot.z, J.LeftToeBase.z, 0.45)), p.y - 0.02), colour: shade(0.7) }], lip: shade(0.55) },
    ],
  },
  boots: {
    slot: 'shoes', label: 'Boots', main: '#4a4f5c',
    pieces: (J) => [
      { zones: ['leg', 'foot'], keep: [(p) => -legAt(J, 0.6)(p)], offset: 0.013, colour: 'main',
        regions: [{ f: (p) => 0.02 - p.y, colour: INK }, { f: (p) => Math.min(p.y - 0.04, 0.008 - Math.abs(p.x - legCentre(J, p)), p.z - J[sideOf(p.x, J) + 'Foot'].z), colour: shade(0.65) }], lip: shade(0.6) },
      { zones: ['leg'], keep: [(p) => -legAt(J, 0.6)(p), (p) => legAt(J, 0.6)(p) + 0.035], offset: 0.02, colour: shade(0.85), lip: shade(0.6) },
    ],
  },
};

// ---------- building ----------

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
// a corner remembers which cut made it (edge), so the cut's edge can get a lip
function lerpCorner(a, b, t, edge) {
  return { p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), ...blendWeights(a, b, t), edge };
}
// Sutherland-Hodgman against one function, cutting where it crosses 0
function clip(poly, f, edge = null) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length], fa = f(a.p), fb = f(b.p);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) out.push(lerpCorner(a, b, fa / (fa - fb), edge));
  }
  return out;
}

// Which way a garment corner is pushed off the body: on the limbs straight out from the bone (the joined wrists and
// ankles have normals that lean along the limb, which would push a cuff out into spikes).
function outward(p, n, zone, J) {
  if (zone !== 'arm' && zone !== 'leg') return n;
  const side = sideOf(p.x, J);
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

function output() {
  const out = { pos: [], normal: [], si: [], sw: [], col: [] };
  out.corner = (p, n, si, sw, c) => { out.pos.push(p.x, p.y, p.z); out.normal.push(n.x, n.y, n.z); out.si.push(...si); out.sw.push(...sw); out.col.push(c.r, c.g, c.b); };
  return out;
}

// the body's surface as corners and triangles, ready to cut: zone per triangle, pushed-out normals
function bodyTriangles(d, J) {
  const list = [];
  for (let t = 0; t < d.T; t++) {
    if (d.pieces[t] !== 'body') continue;
    const zones = [0, 1, 2].map((k) => classify(d, t * 3 + k, J).zone);
    const zone = zones[1] === zones[2] ? zones[1] : zones[0];
    list.push({ zone, zones, corners: [0, 1, 2].map((k) => {
      const i = t * 3 + k, p = new THREE.Vector3().fromArray(d.pos, i * 3);
      return { p, n: outward(p, new THREE.Vector3().fromArray(d.normal, i * 3), zones[k], J), si: d.si.slice(i * 4, i * 4 + 4), sw: d.sw.slice(i * 4, i * 4 + 4), edge: null };
    }) });
  }
  return list;
}

function addPiece(out, tris, piece, colourOf) {
  const lipIn = -0.002;
  for (const T of tris) {
    if (!piece.zones.includes(T.zone) || T.zones.includes('hand') || (piece.zones.includes('foot') ? false : T.zones.includes('foot') && T.zone !== 'leg')) continue;
    let poly = T.corners;
    piece.keep.forEach((f, k) => { if (poly.length >= 3) poly = clip(poly, (p) => f(p, T.zone), k); });
    if (poly.length < 3) continue;
    // colour regions: split exactly on each region's line, first match wins
    let rest = [poly];
    const parts = [];
    for (const r of piece.regions || []) {
      const next = [];
      for (const q of rest) {
        const inside = clip(q, (p) => r.f(p, T.zone)), outside = clip(q, (p) => -r.f(p, T.zone));
        if (inside.length >= 3) parts.push([inside, r.colour]);
        if (outside.length >= 3) next.push(outside);
      }
      rest = next;
    }
    for (const q of rest) parts.push([q, piece.colour]);
    for (const [q, role] of parts) {
      const c = colourOf(role);
      for (let k = 1; k + 1 < q.length; k++) for (const v of [q[0], q[k], q[k + 1]]) out.corner(v.p.clone().addScaledVector(v.n, piece.offset), v.n, v.si, v.sw, c);
    }
    // lips: every edge of the cut outline turned in to the skin, so the garment is closed there
    if (piece.lip === null) continue;
    const c = colourOf(piece.lip ?? piece.colour);
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      if (a.edge === null || a.edge !== b.edge) continue;
      const ao = a.p.clone().addScaledVector(a.n, piece.offset), bo = b.p.clone().addScaledVector(b.n, piece.offset);
      const ai = a.p.clone().addScaledVector(a.n, lipIn), bi = b.p.clone().addScaledVector(b.n, lipIn);
      const n = a.n.clone().add(b.n).normalize();
      for (const [v, s] of [[ao, a], [bo, b], [bi, b], [ao, a], [bi, b], [ai, a]]) out.corner(v, n, s.si, s.sw, c);
    }
  }
}

// ---------- accessories ----------

function accessories(d, J, out, colourOf, tris) {
  // the nearest body corner's weights, for a point placed on the body
  const weightsAt = (p) => {
    let best = 0, dist = Infinity;
    for (let i = 0; i < d.T * 3; i++) {
      if (d.pieces[Math.floor(i / 3)] !== 'body') continue;
      const dx = d.pos[i * 3] - p.x, dy = d.pos[i * 3 + 1] - p.y, dz = d.pos[i * 3 + 2] - p.z, q = dx * dx + dy * dy + dz * dz;
      if (q < dist) { dist = q; best = i; }
    }
    return { si: d.si.slice(best * 4, best * 4 + 4), sw: d.sw.slice(best * 4, best * 4 + 4) };
  };
  // the body's front surface at (x, y): the largest z of the body there (torso only)
  const surfaceZ = (x, y, sign = 1) => {
    let best = null;
    for (const T of tris) {
      if (T.zone !== 'torso' && T.zone !== 'neck') continue;
      const [a, b, c] = T.corners.map((v) => v.p);
      const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(den) < 1e-12) continue;
      const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / den, l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / den, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const z = l1 * a.z + l2 * b.z + l3 * c.z;
      if (best === null || z * sign > best * sign) best = z;
    }
    return best ?? J.Spine.z + sign * 0.06;
  };
  // w: one set of weights for every corner, or a list with one per corner
  const tri = (a, b, c, colour, w) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(), col = colourOf(colour);
    [a, b, c].forEach((v, k) => { const x = Array.isArray(w) ? w[k] : w; out.corner(v, n, x.si, x.sw, col); });
  };
  const quad = (a, b, c, e, colour, w) => {
    if (!Array.isArray(w)) { tri(a, b, c, colour, w); tri(a, c, e, colour, w); return; }
    tri(a, b, c, colour, [w[0], w[1], w[2]]); tri(a, c, e, colour, [w[0], w[2], w[3]]);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // a flat polygon disc facing +z with a rim, at (x, y) on the front
  const disc = (x, y, z, r, colour, sides = 6, depth = 0.003) => {
    const w = weightsAt(V(x, y, z)), ring = Array.from({ length: sides }, (_, k) => V(x + r * Math.cos(k * 2 * Math.PI / sides), y + r * Math.sin(k * 2 * Math.PI / sides), z));
    const c = V(x, y, z + depth);
    for (let k = 0; k < sides; k++) {
      const a = ring[k], b = ring[(k + 1) % sides];
      tri(a.clone().setZ(z + depth), b.clone().setZ(z + depth), c, colour, w);
      quad(a, b, b.clone().setZ(z + depth), a.clone().setZ(z + depth), colour, w);
    }
  };
  // a strip on the front of the body following its surface: points (x, y, half width) down the body
  const strip = (rows, lift, colour, ridge = 0.35) => {
    const pts = rows.map(([x, y, hw]) => ({ c: V(x, y, surfaceZ(x, y) + lift), hw }));
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], w = weightsAt(a.c);
      const aL = a.c.clone().add(V(-a.hw, 0, 0)), aR = a.c.clone().add(V(a.hw, 0, 0)), aT = a.c.clone().add(V(0, 0, a.hw * ridge));
      const bL = b.c.clone().add(V(-b.hw, 0, 0)), bR = b.c.clone().add(V(b.hw, 0, 0)), bT = b.c.clone().add(V(0, 0, b.hw * ridge));
      quad(aL, bL, bT, aT, colour, w); quad(aT, bT, bR, aR, colour, w);
    }
  };
  return {
    button: (x, y, colour, r = 0.006) => disc(x, y, surfaceZ(x, y) + 0.02, r, colour),
    buckle: (x, y, colour) => {
      const z = surfaceZ(x, y) + 0.012, w = weightsAt(V(x, y, z));
      const box = [[-0.016, -0.011], [0.016, -0.011], [0.016, 0.011], [-0.016, 0.011]].map(([dx, dy]) => V(x + dx, y + dy, z));
      const top = box.map((v) => v.clone().setZ(z + 0.005));
      quad(top[0], top[1], top[2], top[3], colour, w);
      for (let k = 0; k < 4; k++) quad(box[k], box[(k + 1) % 4], top[(k + 1) % 4], top[k], colour, w);
      quad(top[0].clone().lerp(top[2], 0.3).setZ(z + 0.0055), V(x + 0.006, y - 0.004, z + 0.0055), V(x + 0.006, y + 0.004, z + 0.0055), V(x - 0.006, y + 0.004, z + 0.0055), INK, w);
    },
    // a bow: two loops and two tails, at the point of a V
    bow: (x, y, colour, size) => {
      const z = surfaceZ(x, y) + 0.024, w = weightsAt(V(x, y, z)), s = size;
      for (const sx of [-1, 1]) {
        const knot = V(x + sx * s * 0.12, y, z + 0.006), outer = V(x + sx * s, y + s * 0.35, z), outerLow = V(x + sx * s * 0.95, y - s * 0.3, z);
        tri(knot, outer, outerLow, colour, w); tri(knot, outerLow, V(x + sx * s * 0.6, y, z + 0.01), colour, w);
        const tailTop = V(x + sx * s * 0.08, y - s * 0.1, z), tailEnd = V(x + sx * s * 0.45, y - s * 1.3, z - 0.004);
        tri(tailTop, tailEnd, V(x + sx * s * 0.2, y - s * 1.25, z - 0.004), colour, w);
      }
      disc(x, y, z + 0.004, s * 0.2, colour, 5, 0.004);
    },
    // a necktie from the collar down the front: knot, then a blade that widens and ends in a point
    tie: (J2, colour, length = 0.75) => {
      const x = J2.neck.x, top = J2.neck.y - 0.012, bottom = lerp(top, J2.Hips.y, length);
      const rows = [[x, top, 0.011], [x, top - 0.02, 0.007], [x, lerp(top, bottom, 0.35), 0.014], [x, lerp(top, bottom, 0.92), 0.018], [x, bottom, 0.001]];
      strip(rows, 0.02, colour);
    },
    cord: (x, y, length, colour, tip) => {
      const z = surfaceZ(x, y) + 0.02, w = weightsAt(V(x, y, z)), r = 0.0022;
      const a = V(x, y, z), b = V(x + 0.004 * Math.sign(x - J.neck.x), y - length, z + 0.004);
      const side = V(r, 0, 0), up = V(0, 0, r);
      quad(a.clone().sub(side), b.clone().sub(side), b.clone().add(up), a.clone().add(up), colour, w);
      quad(a.clone().add(up), b.clone().add(up), b.clone().add(side), a.clone().add(side), colour, w);
      disc(b.x, b.y - 0.004, b.z, 0.004, tip, 5, 0.004);
    },
    // a ribbed neckband: a ring round the neckline
    rib: (colour) => {
      const n = 16, y0 = J.neck.y - 0.006, ring = [];
      for (let k = 0; k < n; k++) {
        const a = k * 2 * Math.PI / n, dirH = V(Math.sin(a), 0, Math.cos(a));
        const o = V(J.neck.x, y0 - 0.01 * clamp01(dirH.z), J.neck.z);
        let r = 0.03;
        for (const T of tris) for (const v of T.corners) if (Math.abs(v.p.y - o.y) < 0.012 && (v.p.x - o.x) * dirH.x + (v.p.z - o.z) * dirH.z > 0 && Math.abs((v.p.x - o.x) * dirH.z - (v.p.z - o.z) * dirH.x) < 0.02) r = Math.max(r, (v.p.x - o.x) * dirH.x + (v.p.z - o.z) * dirH.z);
        ring.push(o.clone().addScaledVector(dirH, r + 0.012));
      }
      for (let k = 0; k < n; k++) {
        const a = ring[k], b = ring[(k + 1) % n], w = weightsAt(a);
        quad(a, b, b.clone().add(V(0, 0.008, 0)).lerp(V(J.neck.x, b.y + 0.008, J.neck.z), 0.08), a.clone().add(V(0, 0.008, 0)).lerp(V(J.neck.x, a.y + 0.008, J.neck.z), 0.08), colour, w);
      }
    },
    // a collar standing up from the neckline and folding down over it; 'shirt' has points at the front,
    // 'hood' is a hood lying folded at the back of the neck
    collar: (J2, kind, colour) => ring(J2, kind, colour),
    hood: (J2, colour) => ring(J2, 'hood', colour),
    skirt: (J2, spec) => skirt(J2, spec),
  };

  function ring(J2, kind, colour) {
    const n = 20, rows = [];
    for (let k = 0; k < n; k++) {
      const a = k * 2 * Math.PI / n, dirH = V(Math.sin(a), 0, Math.cos(a)), frontness = clamp01(dirH.z), backness = clamp01(-dirH.z);
      const base = V(J2.neck.x, J2.neck.y - 0.004 - 0.006 * frontness, J2.neck.z);
      let r = 0.028;
      for (const T of tris) for (const v of T.corners) {
        if (Math.abs(v.p.y - base.y) > 0.014) continue;
        const along = (v.p.x - base.x) * dirH.x + (v.p.z - base.z) * dirH.z, across = Math.abs((v.p.x - base.x) * dirH.z - (v.p.z - base.z) * dirH.x);
        if (along > 0 && across < 0.02) r = Math.max(r, along);
      }
      const root = base.clone().addScaledVector(dirH, r + 0.01);
      if (kind === 'hood') {
        // a thick fold lying on the upper back, thin at the front
        const h = 0.01 + 0.05 * backness, out = 0.012 + 0.03 * backness;
        const top = root.clone().add(V(0, h * 0.5, 0)).addScaledVector(dirH, out * 0.6);
        const fold = root.clone().add(V(0, -h * 0.9, 0)).addScaledVector(dirH, out);
        rows.push([root, top, fold, root.clone().add(V(0, -h * 1.1, 0)).addScaledVector(dirH, out * 0.3)]);
      } else {
        const stand = root.clone().add(V(0, 0.016, 0)), point = kind === 'shirt' ? 0.022 * Math.pow(frontness, 4) : 0;
        const fold = stand.clone().addScaledVector(dirH, 0.012).add(V(0, -0.022 - point, 0)).add(V(-Math.sign(dirH.x) * point * 0.3, 0, 0));
        rows.push([root, stand, fold]);
      }
    }
    const open = kind === 'shirt' ? 0 : -1;   // the shirt collar opens at the front middle (between the last and first rows)
    for (let k = 0; k < n; k++) {
      if (k === n - 1 && open === 0) continue;
      const A = rows[k], Bn = rows[(k + 1) % n], w = weightsAt(A[0]);
      for (let j = 0; j + 1 < A.length; j++) quad(A[j], Bn[j], Bn[j + 1], A[j + 1], j === A.length - 2 && kind === 'hood' ? ['main', 0.8] : colour, w);
    }
  }

  function skirt(J2, spec) {
    const n = spec.pleats, waistY = lerp(J2.Hips.y, J2.Spine02.y, 0.1), kneeY = lerp(J2.LeftUpLeg.y, J2.LeftFoot.y, spec.length);
    const hipY = lerp(waistY, J2.LeftUpLeg.y - 0.03, 0.6), C = V(J2.Hips.x, 0, J2.Hips.z);
    const reach = (y0, y1, a) => {
      let r = 0.03;
      const dirH = V(Math.sin(a), 0, Math.cos(a));
      for (const T of tris) {
        if (T.zone !== 'torso' && T.zone !== 'leg') continue;
        for (const v of T.corners) {
          if (v.p.y < y0 || v.p.y > y1 || Math.abs(v.p.x - C.x) > Math.abs(J2.LeftArm.x - C.x) * 0.95) continue;
          const along = (v.p.x - C.x) * dirH.x + (v.p.z - C.z) * dirH.z, across = Math.abs((v.p.x - C.x) * dirH.z - (v.p.z - C.z) * dirH.x);
          if (along > 0 && across < along * Math.tan(Math.PI / 8)) r = Math.max(r, along);
        }
      }
      return r;
    };
    const leftSign = Math.sign(J2.LeftUpLeg.x - J2.Hips.x) || 1;
    // rings: waist, hips, hem
    const levels = [waistY, hipY, kneeY], last = levels.length - 1;
    const rings = levels.map((y, j) => Array.from({ length: n }, (_, k) => {
      const a = k * 2 * Math.PI / n, dirH = V(Math.sin(a), 0, Math.cos(a));
      const rWaist = reach(waistY - 0.02, waistY + 0.02, a), rHip = Math.max(rWaist, reach(hipY - 0.05, hipY + 0.02, a));
      // knife pleats: every other hem corner further out; the sides flare less, so the hands swing clear
      const sideSquash = 1 - (spec.squash ?? 0.36) * dirH.x * dirH.x;
      // and the front and back a little more, so a thigh swinging forward stays inside
      const hemR = (rHip + 0.02) * spec.flare * sideSquash * (1 + 0.45 * Math.max(0, dirH.z) ** 2) * (k % 2 && spec.pleated ? 1.07 : 1);
      const r = j === 0 ? rWaist + 0.016 : j === 1 ? rHip + 0.018 - 0.006 * dirH.x * dirH.x : lerp(rHip + 0.018, hemR, (hipY - y) / (hipY - kneeY));
      const p = C.clone().addScaledVector(dirH, r).setY(y);
      // the hip ring follows the thighs a little, the hem a lot, each corner shared between the two thighs by how far
      // it is to either side, so a thigh swinging forward in a walk carries the front of the skirt with it
      const follow = (spec.follow || [0, 0.25, 0.85])[j], left = clamp01(0.5 + (p.x - C.x) * leftSign / 0.1);
      return { p, w: { si: [B.Hips, B.LeftUpLeg, B.RightUpLeg, 0], sw: [1 - follow, follow * left, follow * (1 - left), 0] } };
    }));
    // hem stripes (height above the hem as a share of the pleated band): the band is cut into slices at each edge
    const half = 0.035, colourAt = (u) => { for (const [h, c] of spec.stripes || []) if (Math.abs(u - h) < half) return c; return 'main'; };
    for (let j = 0; j < last; j++) for (let k = 0; k < n; k++) {
      const a = rings[j][k], b = rings[j][(k + 1) % n], c = rings[j + 1][k], e = rings[j + 1][(k + 1) % n];
      if (j === 0) { quad(a.p, c.p, e.p, b.p, ['main', 0.96], [a.w, c.w, e.w, b.w]); continue; }
      // the pleated band: cut into horizontal slices so stripes can run round it
      const cuts = j < last - 1 ? [0, 1] : [0, ...(spec.stripes || []).flatMap(([h]) => [h - half, h + half]).map((h) => 1 - h).filter((t) => t > 0 && t < 1).sort((x, y) => x - y), 1];
      for (let s = 0; s + 1 < cuts.length; s++) {
        const t0 = cuts[s], t1 = cuts[s + 1], lv = (P, Q, t) => P.p.clone().lerp(Q.p, t);
        const lw = (P, Q, t) => ({ si: P.w.si, sw: P.w.sw.map((x, i) => x + (Q.w.sw[i] - x) * t) });   // same bones on every ring
        const mid = (t0 + t1) / 2, u = 1 - mid;
        const tone = k % 2 || !spec.pleated ? 1 : 0.84;   // the pleats' two faces
        const colour = j < last - 1 ? 'main' : colourAt(u);
        const col = colour === 'main' ? ['main', tone] : colour;
        quad(lv(a, c, t0), lv(a, c, t1), lv(b, e, t1), lv(b, e, t0), col, [lw(a, c, t0), lw(a, c, t1), lw(b, e, t1), lw(b, e, t0)]);
      }
    }
  }
}

// ---------- the garment ----------

export function clothesGeometry(d, J, id, colour) {
  const spec = CLOTHES[id];
  if (!spec) throw new Error('No garment ' + id);
  const colours = { main: colour || spec.main, accent: spec.accent };
  const mainColour = new THREE.Color(colours.main);
  const colourOf = (role) => {
    if (role === 'main' || role === undefined) return mainColour;
    if (Array.isArray(role)) return (role[0] === 'main' ? mainColour : new THREE.Color(role[0])).clone().multiplyScalar(role[1]);
    return new THREE.Color(role);
  };
  const out = output(), tris = bodyTriangles(d, J);
  for (const piece of spec.pieces(J, colours)) addPiece(out, tris, piece, colourOf);
  if (spec.extras) spec.extras(accessories(d, J, out, colourOf, tris), J, colours);
  return out;
}

// ---------- mesh ----------

export function finish({ pos, normal, si, sw, col }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

// colours are in the vertex colours; flat: facets like the source (Mio's model is flat shaded, Eric's smooth)
export function wardrobeMesh(ch, data, name, flat = true) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat, side: THREE.DoubleSide });
  const mesh = new THREE.SkinnedMesh(finish(data), m);
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.bind(ch.skeleton, new THREE.Matrix4());
  return mesh;
}
