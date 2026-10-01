// The six small blocks along the east lane (plaza/east-lane.js), from the plan (plaza/east-plan.js): backdrop
// exteriors in the town palette, nothing inside. Each is its layout footprint and storeys, with a plinth, floor
// bands, windows on every face, a flat roof with a parapet and plant (scenes/dorm-court/roofs.js), and a ground floor
// that says what it is, with its door on its path:
//   office  a glazed entrance under a canopy, window bands either side
//   cafe    a glazed front between piers, an awning over each bay but the door's
//   shop    a shopfront and a door hung with a noren, under a tiled roof
//   house   a plain door with a light over it, a small window beside it
// Everything goes into the place's Parts collector (outdoor/parts.js); the glass is two meshes of its own (one lights
// up after work), and the door lights join the place's light set.
import * as THREE from 'three';
import { TOWN } from '../town.js';
import { flatRoof, tiledRoof } from '../dorm-court/roofs.js';
import { merged, AWNING } from '../plaza-buildings.js';
import { hash2 } from '../outdoor/parts.js';
import { STEEL } from '../outdoor/furniture.js';

const PLINTH = '#6c7178',
  FRAME = '#4f565f',
  SILL = '#a7adb3',
  DOOR = '#3f4650',
  NOREN = '#34425c',
  CAFE_AWNING = '#5a6f66';

// one face of a rectangle [x0, x1, z0, z1]: its start, direction along it, outward normal and length
function face([x0, x1, z0, z1], f) {
  return {
    s: { a: [x0, z1], d: [1, 0], n: [0, 1], L: x1 - x0 },
    n: { a: [x1, z0], d: [-1, 0], n: [0, -1], L: x1 - x0 },
    w: { a: [x0, z0], d: [0, 1], n: [-1, 0], L: z1 - z0 },
    e: { a: [x1, z1], d: [0, -1], n: [1, 0], L: z1 - z0 },
  }[f];
}
// a box on a face: u along it (centre), y up (bottom), o out from it (centre); w along, h up, t out
function onFace(add, F, u, y, o, w, h, t) {
  const x = F.a[0] + F.d[0] * u + F.n[0] * o,
    z = F.a[1] + F.d[1] * u + F.n[1] * o;
  const alongX = F.d[0] !== 0;
  add(alongX ? w : t, h, alongX ? t : w, x, y, z);
}

// caster: the collector for the walls of the blocks `casts(block)` picks (the ones that should throw a shadow)
export function buildFronts(p, lights, blocks, { caster = p, casts = () => false } = {}) {
  const glass = [],
    litGlass = [];
  const box =
    (color, cast = true) =>
    (w, h, d, x, y, z) =>
      p.box(color, w, h, d, x, y, z, { cast });
  // a pane is a flat quad on the face (two-sided glass), not a box
  const pane = (lit) => (w, h, d, x, y, z) => {
    const g = w >= d ? new THREE.PlaneGeometry(w, h) : new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2);
    (lit ? litGlass : glass).push(g.translate(x, y + h / 2, z));
  };

  for (const k of blocks) {
    const [x0, x1, z0, z1] = k.rect,
      w = x1 - x0,
      d = z1 - z0,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    const fh = k.row.floorH,
      n = k.row.storeys,
      H = fh * n,
      wall = TOWN.walls[k.wall];
    (casts(k) ? caster : p).box(wall, w, H, d, cx, 0, cz, { surf: 'plaster' });
    // plinth and floor bands, all round
    p.box(PLINTH, w + 0.06, 0.32, d + 0.06, cx, 0, cz, { cast: false, surf: 'concrete' });
    for (let f = 1; f < n; f++) p.box(TOWN.band, w + 0.08, 0.12, d + 0.08, cx, f * fh - 0.06, cz, { cast: false });

    // windows: every face, every storey above the ground, and the ground floor of the faces without the door
    const shop = k.ground === 'shop';
    for (const f of ['s', 'n', 'w', 'e']) {
      const F = face(k.rect, f);
      const front = f === k.face;
      for (let s = front ? 1 : 0; s < n; s++) {
        const y = s * fh;
        if (k.ground === 'office' && s > 0) {
          // a window band with mullions
          const L = F.L - 0.6;
          onFace(pane(hash2(cx, y, f.charCodeAt(0)) < 0.45), F, F.L / 2, y + 0.55, 0.02, L, 0.9, 0.05);
          onFace(box(SILL, false), F, F.L / 2, y + 0.48, 0.06, L + 0.1, 0.07, 0.12);
          const m = Math.max(2, Math.round(L / 1.2));
          for (let i = 0; i <= m; i++) onFace(box(FRAME, false), F, 0.3 + (L * i) / m, y + 0.55, 0.05, 0.05, 0.9, 0.05);
          continue;
        }
        const cols = Math.max(1, Math.floor(F.L / 1.7)),
          step = F.L / cols;
        for (let c = 0; c < cols; c++) {
          const u = step * (c + 0.5);
          // the shop's back and sides: small high windows on the ground floor
          const [wy, wh] = shop ? [y + 1.0, 0.55] : [y + 0.6, 0.85];
          onFace(pane(hash2(u + cx, y + cz, c) < 0.3), F, u, wy, 0.02, 0.8, wh, 0.05);
          onFace(box(SILL, false), F, u, wy - 0.07, 0.06, 0.92, 0.07, 0.12);
        }
      }
      if (front) groundFloor(p, F, k, fh, { box, pane, lights });
    }

    // the roof
    if (k.tiled) {
      tiledRoof(p, {
        x0: x0 - 0.25,
        x1: x1 + 0.25,
        zf: z0 - 0.45,
        zb: z1 + 0.45,
        eave: H - 0.05,
        ridge: H + 0.95,
        walls: [x0, x1],
        wallZ: [z1, z0],
        gableWall: wall,
      });
    } else {
      const units = [];
      // air-conditioner units in two staggered rows over the whole roof
      const n = 1 + Math.floor(w / 2.4);
      for (let i = 0; i < n; i++) units.push([x0 + 0.9 + ((i + 0.5) * (w - 1.8)) / n, z0 + d * (i % 2 ? 0.74 : 0.3)]);
      flatRoof(p, [x0, x1, z0, z1], H + 0.14, { edges: 'nsew', units, vents: [[x1 - 0.7, z0 + 0.7]] });
      // on the bigger roofs: the stair's housing at the back corner, a duct run from it, a water tank on legs
      if (w > 5) {
        const y = H + 0.14;
        p.box(wall, 1.7, 1.15, 1.5, x0 + 1.25, y, z0 + 1.05);
        p.box('#8d9298', 1.8, 0.08, 1.6, x0 + 1.25, y + 1.15, z0 + 1.05);
        p.box('#9aa0a6', w * 0.35, 0.22, 0.26, x0 + 2.1 + w * 0.175, y + 0.05, z0 + 0.7, { cast: false });
        for (const dx of [-0.35, 0.35]) p.box(STEEL.dark, 0.06, 0.45, 0.06, x1 - 1.4 + dx, y, z1 - 1.0);
        p.box('#a9aeb2', 1.0, 0.6, 0.7, x1 - 1.4, y + 0.45, z1 - 1.0);
      }
    }
  }

  const out = new THREE.MeshStandardMaterial({ color: '#4c5a68', roughness: 0.3, side: THREE.DoubleSide });
  const lit = new THREE.MeshStandardMaterial({
    color: '#4c5a68',
    roughness: 0.3,
    side: THREE.DoubleSide,
    emissive: new THREE.Color('#ffc98a'),
    emissiveIntensity: 0,
  });
  return {
    meshes: (root) => {
      if (glass.length) root.add(merged(glass, out, { cast: false }));
      if (litGlass.length) root.add(merged(litGlass, lit, { cast: false }));
    },
    evening() {
      lit.color.set('#e8c89a');
      lit.emissiveIntensity = 0.6;
    },
  };
}

// the ground floor of the door's face
function groundFloor(p, F, k, fh, { box, pane, lights }) {
  // the door, along the face from its start (k.at is its x on a north or south face, its z on a west or east one)
  const at = F.d[0] ? (k.at - F.a[0]) * F.d[0] : (k.at - F.a[1]) * F.d[1];
  const frame = box(FRAME, false),
    sill = box(SILL, false);
  // a light over the door, its pool on the path
  const lamp = (y) => {
    onFace(box(STEEL.dark, false), F, at, y, 0.09, 0.3, 0.08, 0.16);
    const g = [];
    onFace(
      (w, h, t, x, yy, z) => g.push(new THREE.BoxGeometry(w, h, t).translate(x, yy + h / 2, z)),
      F,
      at,
      y - 0.1,
      0.09,
      0.24,
      0.1,
      0.12,
    );
    lights.glowParts.push(...g);
    const ox = F.a[0] + F.d[0] * at + F.n[0] * 0.9,
      oz = F.a[1] + F.d[1] * at + F.n[1] * 0.9;
    lights.lit.push([ox, oz, 1.2]);
  };
  const doors = (dw) => {
    onFace(pane(true), F, at, 0.02, 0.02, dw, 1.95, 0.05);
    onFace(frame, F, at, 0.02, 0.05, 0.05, 1.95, 0.06);
    for (const s of [-1, 1]) onFace(frame, F, at + (s * dw) / 2, 0.02, 0.05, 0.08, 2.0, 0.08);
    onFace(frame, F, at, 1.97, 0.05, dw + 0.16, 0.08, 0.08);
  };
  // windows either side of the door: a band of glass from `y` `h` tall, broken by piers every `bay`
  const bands = (y, h, bay, gap, lit) => {
    for (const [s0, s1] of [
      [0.35, at - gap],
      [at + gap, F.L - 0.35],
    ]) {
      if (s1 - s0 < 0.6) continue;
      const m = Math.max(1, Math.round((s1 - s0) / bay));
      for (let i = 0; i < m; i++) {
        const c = s0 + ((s1 - s0) * (i + 0.5)) / m,
          bw = (s1 - s0) / m - 0.2;
        onFace(pane(lit), F, c, y, 0.02, bw, h, 0.05);
        onFace(sill, F, c, y - 0.07, 0.06, bw + 0.12, 0.07, 0.12);
      }
    }
  };
  if (k.ground === 'office') {
    doors(1.4);
    onFace(box('#8f969e'), F, at, 2.3, 0.55, 2.4, 0.12, 1.1); // the canopy
    onFace(box(STEEL.dark, false), F, at, 2.26, 1.05, 2.4, 0.04, 0.06);
    bands(0.75, 1.05, 1.6, 1.3, true);
    lamp(2.15);
  } else if (k.ground === 'cafe') {
    doors(1.1);
    // the glazed front between piers, an awning over each bay but the door's
    const bays = Math.max(2, Math.round(F.L / 2.2)),
      bw = F.L / bays;
    for (let i = 0; i < bays; i++) {
      const c = bw * (i + 0.5);
      onFace(box(FRAME, true), F, bw * i, 0, 0.06, 0.18, fh, 0.12);
      if (Math.abs(c - at) < bw / 2) continue;
      onFace(pane(true), F, c, 0.25, 0.02, bw - 0.3, 1.6, 0.05);
      // the awning: a sloping canvas with a valance
      const out = 0.75;
      onFace(
        (w, h, t, x, y, z) =>
          p.geo(
            CAFE_AWNING,
            new THREE.BoxGeometry(w, h, t)
              .rotateX(F.d[0] ? F.n[1] * 0.35 : 0)
              .rotateZ(F.d[1] ? -F.n[0] * 0.35 : 0)
              .translate(x, y, z),
          ),
        F,
        c,
        2.05,
        out / 2,
        bw - 0.35,
        0.03,
        out,
      );
      onFace(box(AWNING.stripe, false), F, c, 1.8, out, bw - 0.35, 0.14, 0.02);
    }
    onFace(box(FRAME, true), F, F.L, 0, 0.06, 0.18, fh, 0.12);
    // a menu board by the door
    onFace(box('#3c4349', false), F, at + 0.95, 0, 0.3, 0.45, 0.75, 0.06);
    lamp(2.2);
  } else if (k.ground === 'shop') {
    doors(1.0);
    // the noren: indigo cloth in strips hung in front of the door
    for (let i = 0; i < 3; i++) onFace(box(NOREN, false), F, at - 0.32 + i * 0.32, 1.45, 0.12, 0.3, 0.5, 0.02);
    onFace(box(STEEL.dark, false), F, at, 1.93, 0.12, 1.05, 0.03, 0.03);
    bands(0.55, 1.15, 1.4, 0.9, true);
    lamp(2.1);
  } else {
    // a house: a solid door, a small window, a light over the door
    onFace(box(DOOR), F, at, 0.02, 0.03, 0.9, 1.9, 0.05);
    onFace(frame, F, at, 1.92, 0.05, 1.06, 0.08, 0.08);
    onFace(box('#8f969e'), F, at, 2.15, 0.35, 1.3, 0.08, 0.7);
    onFace(pane(true), F, at < F.L / 2 ? at + 1.0 : at - 1.0, 1.0, 0.02, 0.7, 0.7, 0.05);
    lamp(2.0);
  }
}
