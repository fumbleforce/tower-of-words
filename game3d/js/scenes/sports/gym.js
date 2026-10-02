// The gym (gym, docs/game/island.md "Sports and baths"), seen from the sports lane and the pool walk and shut on
// day 1: only its outside is built, nothing behind the door. In the island frame (sports/plan.js):
//   the hall: pale concrete walls on a granite plinth, pilasters every bay down the long sides with a band of
//   clerestory glass between them under the eaves, and a shallow barrel-vaulted roof (the layout's muted green)
//   running north-south, overhanging, with a dark edge along its eaves and round its arched ends
//   the arched ends: the wall carried up into the arch, and in the south one a lunette of glass with mullions
//   the entrance, on the south face on the door's axis: a glass front in a dark frame, two pairs of glass doors in
//   it, shut, with a 準備中 CLOSED card on the glass; a flat canopy on two posts over it, たいいくかん GYM on a board
//   standing on its front edge; beds of low shrubs either side between the face and the lane
// After work the glass is lit from inside.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STEEL } from '../outdoor/furniture.js';
import { mound, bed, LEAF } from '../outdoor/planting.js';
import { BLOCK } from '../outdoor/block.js';
import * as P from './plan.js';

const C = {
  wall: '#cfccc4',
  pilaster: '#bab7af',
  plinth: '#8f9092',
  roof: '#6f7d72', // the layout's gym roof
  seam: '#5f6b62',
  edge: '#4a5249',
  frame: '#3f4650',
  glass: '#62717c',
};
const [X0, X1, Z0, Z1] = P.GYM,
  GX = P.GX,
  W = X1 - X0,
  WALL_H = 4.4,
  RISE = 2.2,
  OVER = 0.45; // the roof's overhang
// the vault: a circle's arc over the span (with the overhang), its top RISE over the walls
const HALF = W / 2 + OVER,
  R = (HALF * HALF + RISE * RISE) / (2 * RISE),
  A = Math.asin(HALF / R),
  YC = WALL_H + RISE - R; // the circle's centre height

// the arch's height over x, at the walls' line
const archY = (x) => YC + Math.sqrt(Math.max(0, R * R - (x - GX) ** 2));

// a circular segment (the arch over a chord at height y0, `inset` in under it), a flat shape in the x-y plane on
// the face at z, facing south (s 1) or north (s -1)
function segment(x0, x1, y0, z, { inset = 0, s = 1 } = {}) {
  const sh = new THREE.Shape();
  const n = 14;
  sh.moveTo(x0, y0);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    sh.lineTo(x, Math.max(y0, archY(x) - inset));
  }
  sh.lineTo(x1, y0);
  const g = new THREE.ShapeGeometry(sh);
  return s > 0 ? g.translate(0, 0, z) : g.rotateY(Math.PI).translate(2 * GX, 0, z);
}

function hall(p, glow) {
  const cz = (Z0 + Z1) / 2,
    D = Z1 - Z0;
  p.box(C.plinth, W + 0.2, 0.3, D + 0.2, GX, 0, cz, { surf: 'concrete' });
  p.box(C.wall, W, WALL_H - 0.3, D, GX, 0.3, cz, { surf: 'concrete' });
  // the long sides: pilasters every bay, the clerestory between them, a band over it
  const bays = Math.round(D / 3.2),
    bw = D / bays;
  for (const [x, s] of [
    [X0, -1],
    [X1, 1],
  ]) {
    for (let i = 0; i <= bays; i++) p.box(C.pilaster, 0.16, WALL_H - 0.3, 0.34, x + s * 0.08, 0.3, Z0 + i * bw);
    for (let i = 0; i < bays; i++) {
      const z0 = Z0 + i * bw + 0.3,
        z1 = Z0 + (i + 1) * bw - 0.3;
      glow.push(new THREE.BoxGeometry(0.03, 1.0, z1 - z0).translate(x + s * 0.02, 3.35, (z0 + z1) / 2));
      p.box(C.frame, 0.06, 0.06, z1 - z0, x + s * 0.04, 2.8, (z0 + z1) / 2);
      for (let k = 1; k < 3; k++) p.box(C.frame, 0.05, 1.0, 0.04, x + s * 0.04, 2.85, z0 + ((z1 - z0) * k) / 3);
    }
    p.box(C.pilaster, 0.1, 0.25, D, x + s * 0.05, WALL_H - 0.25, cz);
  }
}

function roof(p) {
  // the vault: a cylinder's arc, its axis along z, faceted like everything else
  const D = Z1 - Z0 + 2 * OVER;
  const g = new THREE.CylinderGeometry(R, R, D, 18, 1, true, Math.PI - A, 2 * A)
    .rotateX(Math.PI / 2)
    .translate(GX, YC, (Z0 + Z1) / 2);
  p.geo(C.roof, g);
  // its standing seams, ridge to eave every 0.9
  for (let z = Z0 - OVER + 0.45; z < Z1 + OVER - 0.2; z += 0.9)
    p.geo(
      C.seam,
      new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.06, 18, 1, true, Math.PI - A, 2 * A)
        .rotateX(Math.PI / 2)
        .translate(GX, YC, z),
      { cast: false },
    );
  // the dark edge along each eave, and round each arched end
  for (const s of [-1, 1]) p.box(C.edge, 0.14, 0.18, D, GX + s * HALF, WALL_H - 0.1, (Z0 + Z1) / 2);
  for (const z of [Z0 - OVER, Z1 + OVER]) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = Math.PI / 2 - A + (2 * A * i) / 18;
      pts.push([GX + R * Math.cos(t), YC + R * Math.sin(t)]);
    }
    for (let i = 0; i < 18; i++) {
      const [[x0, y0], [x1, y1]] = [pts[i], pts[i + 1]];
      const len = Math.hypot(x1 - x0, y1 - y0);
      p.geo(
        C.edge,
        new THREE.BoxGeometry(len + 0.02, 0.2, 0.08)
          .rotateZ(Math.atan2(y1 - y0, x1 - x0))
          .translate((x0 + x1) / 2, (y0 + y1) / 2 - 0.06, z),
      );
    }
  }
}

// the arched ends: the wall carried up under the vault; in the south one a lunette of glass with mullions
function ends(p, glow) {
  for (const [z, s] of [
    [Z0, -1],
    [Z1, 1],
  ]) {
    p.geo(C.wall, segment(X0, X1, WALL_H - 0.01, z + s * 0.001, { s }), { surf: 'concrete' });
    if (s < 0) continue;
    const lx0 = X0 + 2.2,
      lx1 = X1 - 2.2;
    glow.push(segment(lx0, lx1, WALL_H + 0.15, z + 0.02, { inset: 0.45 }));
    for (let x = lx0; x <= lx1 + 0.01; x += (lx1 - lx0) / 8) {
      const top = archY(x) - 0.45;
      if (top > WALL_H + 0.2) p.box(C.frame, 0.06, top - WALL_H - 0.15, 0.06, x, WALL_H + 0.15, z + 0.04);
    }
    p.box(C.frame, lx1 - lx0, 0.07, 0.07, GX, WALL_H + 0.1, z + 0.04);
  }
}

// the entrance: the glass front, the doors, the canopy and its board, the beds either side
function entrance(p, glow, signs, lights) {
  const f = Z1 + 0.02,
    FW = 6.6, // the glass front's width
    DW = 1.0; // a door leaf
  p.box(C.frame, FW + 0.2, 2.75, 0.1, GX, 0.25, f + 0.02); // the frame behind the glass
  glow.push(new THREE.BoxGeometry(FW, 2.4, 0.02).translate(GX, 0.3 + 1.2, f + 0.09));
  for (let i = 0; i <= 6; i++) p.box(C.frame, 0.07, 2.45, 0.07, GX - FW / 2 + (FW * i) / 6, 0.27, f + 0.11);
  p.box(C.frame, FW, 0.08, 0.07, GX, 2.68, f + 0.11);
  // two pairs of doors in the middle bays, steel pulls, shut
  for (const s of [-1, 1]) {
    const x = GX + s * DW;
    p.box(STEEL.pale, 0.04, 0.5, 0.04, x - s * (DW - 0.12), 0.85, f + 0.16);
    p.box(C.frame, 0.06, 2.1, 0.08, x, 0.27, f + 0.13);
  }
  signs.card('準備中', 'CLOSED', 0.46, 0.3, [GX + 0.5, 1.25, f + 0.14], 0);
  signs.card('準備中', 'CLOSED', 0.46, 0.3, [GX - 0.5, 1.25, f + 0.14], 0);
  // the step and the canopy on two posts, its board standing on the front edge
  p.box(BLOCK.plinth, FW + 0.6, 0.08, 0.9, GX, 0, f + 0.45, { surf: 'concrete' });
  const CD = 1.25;
  p.box(BLOCK.canopy, FW + 1.2, 0.14, CD, GX, 2.95, f + CD / 2);
  p.box(BLOCK.fascia, FW + 1.2, 0.1, 0.08, GX, 2.88, f + CD);
  for (const s of [-1, 1]) p.box(STEEL.dark, 0.1, 2.88, 0.1, GX + s * (FW / 2 + 0.45), 0, f + CD - 0.12);
  signs.board('たいいくかん', 'GYM', '#34505a', 2.8, 0.6, [GX, 3.42, f + CD - 0.1], 0);
  p.box('#2c3b42', 2.84, 0.64, 0.05, GX, 3.1, f + CD - 0.14);
  // two lights under the canopy, pooling on the apron
  for (const s of [-1, 1]) {
    lights.glowParts.push(new THREE.BoxGeometry(0.3, 0.04, 0.3).translate(GX + s * 1.8, 2.86, f + 0.6));
    lights.lit.push([GX + s * 1.8, f + 0.9, 1.1]);
  }
  // the beds either side, between the face and the lane: low shrubs, a little layered
  const [ax0, ax1] = [P.APRON[0], P.APRON[1]];
  for (const [b0, b1] of [
    [X0 + 0.3, ax0 - 0.15],
    [ax1 + 0.15, X1 - 0.3],
  ]) {
    bed(p, [b0, b1, Z1 + 0.15, P.LANE[2] - 0.12], { y: 0.06 });
    for (let x = b0 + 0.45, i = 0; x < b1 - 0.3; x += 0.75, i++)
      mound(
        p,
        x,
        (Z1 + P.LANE[2]) / 2 + (i % 2 ? 0.12 : -0.1),
        0.3 + (i % 3) * 0.05,
        [LEAF.deep, LEAF.mid, LEAF.fresh][i % 3],
        {
          y: 0.06,
        },
      );
  }
}

// builds it all into p (Parts, casts); signs (a shop-signs.js signSet) and lights (a lightSet) take its board, cards
// and lights; root takes the glass, lit after work. Returns the evening switch.
export function* gymSteps(root, p, signs, lights) {
  const glow = [];
  hall(p, glow);
  yield;
  roof(p);
  ends(p, glow);
  yield;
  entrance(p, glow, signs, lights);
  const glass = new THREE.MeshStandardMaterial({
    color: C.glass,
    emissive: new THREE.Color('#ffd7a0'),
    emissiveIntensity: 0,
    roughness: 0.35,
  });
  const g = glow.map((q) => (q.index ? q.toNonIndexed() : q));
  for (const q of g)
    for (const n of Object.keys(q.attributes)) if (n !== 'position' && n !== 'normal') q.deleteAttribute(n);
  const mesh = new THREE.Mesh(mergeGeometries(g), glass);
  g.forEach((q) => q.dispose());
  mesh.name = 'gym:glass';
  root.add(mesh);
  yield;
  return {
    evening() {
      glass.emissiveIntensity = 0.55;
    },
  };
}
