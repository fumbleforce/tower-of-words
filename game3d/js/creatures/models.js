// The birds and small animals' shapes (docs/game/places.md, each place's "Creatures"): faceted convex parts with one
// colour per face, built in code like the chibi people (train/hull.js), in metres, facing +z with the feet at y = 0.
// A bird is two geometries: the body (head, beak, tail and legs in one) and one wing, its root at the shoulder and
// its span along +x; the other wing is the same one mirrored. Insects are a single small shape whose wings are flapped by squashing it across.
import * as THREE from 'three';
import { hull, beamHull, icoPoints } from '../train/hull.js';
import { V, Geo } from '../train/kit.js';

const build = (...parts) => {
  const g = new Geo();
  for (const p of parts) g.add(p);
  return g.build();
};

// The species: size is the body's length (stylised a little bigger than life, like the people), colours from back to
// front. Pigeons are the plaza's grey ones, sparrows the brown tree sparrows, crows the big-billed jungle crow, gulls
// the black-tailed gull of Japanese harbours.
export const BIRDS = {
  pigeon: {
    len: 0.3,
    body: '#8e96a5',
    belly: '#a49cae',
    head: '#7d8595',
    neck: '#5d8378',
    beak: '#3b3b40',
    legs: '#c4686a',
    wing: '#9aa1af',
    bar: '#4a4f5c',
    tip: '#3d424e',
    tail: '#5e6573',
    span: 0.27,
    beakLen: 0.03,
  },
  sparrow: {
    len: 0.17,
    body: '#94704e',
    belly: '#d8c8aa',
    head: '#7a4f36',
    neck: '#f2ede2',
    beak: '#2d2a28',
    legs: '#b9967a',
    wing: '#8a6644',
    bar: '#f0e8d8',
    tip: '#4c3828',
    tail: '#6f5139',
    span: 0.15,
    beakLen: 0.016,
    bib: '#262422',
  },
  crow: {
    len: 0.38,
    body: '#2a2d36',
    belly: '#262931',
    head: '#24272f',
    neck: '#2c3040',
    beak: '#1c1d22',
    legs: '#1f2026',
    wing: '#30343f',
    bar: '#2a2e38',
    tip: '#1e2027',
    tail: '#25282f',
    span: 0.22,
    beakLen: 0.065,
    beakH: 0.035,
  },
  gull: {
    len: 0.4,
    body: '#f4f4f1',
    belly: '#fafaf8',
    head: '#f7f7f5',
    neck: '#f4f4f1',
    beak: '#e8c64a',
    legs: '#e3c75a',
    wing: '#78818d',
    bar: '#808995',
    tip: '#1f2227',
    tail: '#f2f2ef',
    tailTip: '#26292e',
    span: 0.27,
    beakLen: 0.05,
  },
};

// one bird: { body, wing (the left), right, shoulder: [x, y, z] (the left one), len }
export function birdGeometry(kind) {
  const s = BIRDS[kind],
    k = s.len / 0.3; // the parts are drawn for a 0.3 m pigeon and scaled
  const P = (x, y, z) => V(x * k, y * k, z * k);
  const R = (a, b, c) => [a * k, b * k, c * k];
  const body = hull(icoPoints(P(0, 0.125, -0.01), R(0.07, 0.068, 0.115), 0.04, 7), s.body, {
    grad: 0.18,
    name: 'bird',
    colorOf: (c) => (c.y < 0.115 * k && c.z > -0.02 * k ? s.belly : undefined),
  });
  const neck = hull(icoPoints(P(0, 0.175, 0.065), R(0.045, 0.05, 0.045), 0.02, 3), s.neck, { grad: 0.05 });
  const head = hull(icoPoints(P(0, 0.225, 0.085), R(0.04, 0.042, 0.046), 0.03, 5), s.head, {
    grad: 0.08,
    // the sparrow's black bib and pale cheek
    colorOf: s.bib ? (c) => (c.y < 0.205 * k && c.z > 0.1 * k ? s.bib : undefined) : undefined,
  });
  const bh = (s.beakH || 0.02) * k;
  const beak = hull(
    [
      P(-0.012, 0.226, 0.118),
      P(0.012, 0.226, 0.118),
      V(0, 0.226 * k + bh * 0.5, 0.118 * k),
      V(0, 0.226 * k - bh * 0.5, 0.118 * k),
      V(0, 0.222 * k, 0.118 * k + s.beakLen * k),
    ],
    s.beak,
    { grad: 0 },
  );
  const eyes = [-1, 1].map((x) =>
    hull(icoPoints(P(x * 0.032, 0.236, 0.104), R(0.009, 0.009, 0.007), 0, 2), '#15161a', { grad: 0 }),
  );
  const tail = hull(
    [
      P(-0.03, 0.135, -0.09),
      P(0.03, 0.135, -0.09),
      P(-0.05, 0.105, -0.24),
      P(0.05, 0.105, -0.24),
      P(0, 0.115, -0.25),
      P(0, 0.122, -0.09),
      P(0, 0.095, -0.24),
    ],
    s.tail,
    {
      grad: 0,
      colorOf: s.tailTip ? (c) => (c.z < -0.2 * k ? s.tailTip : undefined) : undefined,
    },
  );
  const legs = [-1, 1].map((x) =>
    beamHull(P(x * 0.025, 0.08, 0), P(x * 0.027, 0.0, 0.012), 0.012 * k, 0.012 * k, s.legs),
  );
  const feet = [-1, 1].map((x) =>
    beamHull(P(x * 0.027, 0.004, -0.012), P(x * 0.027, 0.004, 0.04), 0.022 * k, 0.008 * k, s.legs),
  );
  // one wing, root at the shoulder, span along +x, the trailing edge toward -z
  const w = s.span / 0.27;
  const outline = [
    [0, 0.05],
    [0.08, 0.06],
    [0.19, 0.025],
    [0.27, -0.045],
    [0.15, -0.095],
    [0.06, -0.1],
    [0, -0.08],
  ].map(([x, z]) => [x * w * k, z * k]);
  const wpts = [];
  for (const [x, z] of outline) wpts.push(V(x, 0.007 * k, z), V(x, -0.007 * k, z));
  const wing = hull(wpts, s.wing, {
    grad: 0,
    colorOf: (c) => (c.x > 0.19 * w * k ? s.tip : c.x > 0.07 * w * k && c.x < 0.11 * w * k ? s.bar : undefined),
  });
  return {
    body: build(body, neck, head, beak, ...eyes, tail, ...legs, ...feet),
    wing: build(wing),
    right: wing.mirrorX().build(),
    shoulder: [0.062 * k, 0.178 * k, 0.03 * k],
    len: s.len,
  };
}

// The cats: cat-rig.js (the rigged body) and cat.js (how they move).

// Insects: a butterfly (two pairs of wings spread flat; the game squashes it across to flap) and a red dragonfly
// (akatombo: a thin red body and four pale wings).
export function butterflyGeometry() {
  const g = new Geo();
  const wing = (s) => {
    const pts = [];
    for (const [x, z] of [
      [0.006, 0.01],
      [0.05, 0.05],
      [0.075, 0.035],
      [0.06, -0.005],
      [0.045, -0.045],
      [0.012, -0.03],
    ])
      pts.push(V(s * x, 0.002, z), V(s * x, -0.002, z));
    return hull(pts, '#ffffff', {
      grad: 0,
      colorOf: (c) => (Math.abs(c.x) > 0.055 && c.z > 0.02 ? '#3a3a3a' : undefined),
    });
  };
  g.add(wing(1)).add(wing(-1));
  g.add(beamHull(V(0, 0.004, 0.03), V(0, 0.004, -0.035), 0.01, 0.01, '#3b3530'));
  return g.build();
}
export function dragonflyGeometry() {
  const g = new Geo();
  g.add(beamHull(V(0, 0, 0.03), V(0, 0, -0.1), 0.012, 0.012, '#c8432f'));
  g.add(hull(icoPoints(V(0, 0.002, 0.035), [0.014, 0.012, 0.012], 0, 2), '#9a3426', { grad: 0 }));
  for (const [z, l] of [
    [0.015, 0.07],
    [-0.005, 0.065],
  ])
    for (const s of [-1, 1]) {
      const pts = [];
      for (const [x, dz] of [
        [0.004, 0.006],
        [l, 0.008],
        [l + 0.006, 0],
        [l, -0.008],
        [0.004, -0.006],
      ])
        pts.push(V(s * x, 0.004, z + dz), V(s * x, 0.002, z + dz));
      g.add(hull(pts, '#e8eef0', { grad: 0 }));
    }
  return g.build();
}

// the soft dark disc under a creature on the ground (one texture for all)
let _blob;
export function blobTexture() {
  if (_blob) return _blob;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.9)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  _blob = new THREE.CanvasTexture(cv);
  return _blob;
}
