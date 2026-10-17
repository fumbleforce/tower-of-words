// The dorm quarter's buildings (the plan is dorm-quarter/plan.js): exteriors in the town palette, with their ground
// floors and doors, from the shared front kit (plaza/east-fronts.js balconyRow and groundFloor, the dorm window,
// dorm-court/upper-fronts.js, and the apartment roof, dorm-court/roofs.js).
//   the dorm blocks: plaster over a plinth, floor bands; on the door side an open corridor a floor (a slab, a pale
//   parapet with its rail, the flats' steel doors behind with their lights, meter boxes and grilled kitchen windows)
//   and the stair's tall lit window over the entrance; on the balcony side a balcony a room (the front kit's), the
//   ground floor's glazed doors onto their gardens; windows on the ends; a membrane roof with its stair head, tank
//   and units. Where two parts of one block meet (N-E's steps, S-E's wings) the shared wall is left out, and a lower
//   part's roof is a terrace for the flats above: decking, a glass balustrade, planters and screens between flats
//   the villas, the common room and the tool shed (dorm-quarter/houses.js)
// Everything into the place's Parts collector; the glass is two meshes of its own (one lights up after dark).
import * as THREE from 'three';
import { TOWN } from '../town.js';
import { STEEL } from '../outdoor/furniture.js';
import { faces, faceAt, tOf } from '../outdoor/block-face.js';
import { balconyRow, groundFloor } from '../plaza/east-fronts.js';
import { dormWindow } from '../dorm-court/upper-fronts.js';
import { apartmentDeck, apartmentServices, flatRoof } from '../dorm-court/roofs.js';
import { merged } from '../plaza-buildings.js';
import { hash2 } from '../outdoor/parts.js';
import { mound, LEAF } from '../outdoor/planting.js';
import { boards } from '../outdoor/park-kit.js';
import { villa, commons, shed } from './houses.js';
import { lightUp } from '../../kit/light/glow.js';
import * as Q from './plan.js';

const PLINTH = '#6c7178',
  FRAME = '#4f565f',
  SILL = '#a7adb3',
  SLAB = '#9a9ea3',
  PANEL = '#b3bac1',
  DOOR = '#5a6a80',
  METER = '#8a9096',
  DECK = '#8d7b67',
  RAIL_GLASS = '#a9c0c9',
  PLANTER = '#7d8288';
const FH = Q.STOREY;

// a box on a face: u along it (centre), y up (bottom), o out from it (centre); w along, h up, t out
function onFace(add, F, u, y, o, w, h, t) {
  const [x, z] = faceAt(F, u, o);
  add(F.d[0] ? w : t, h, F.d[0] ? t : w, x, y, z);
}
// the spans of a face another block stands against, and how many storeys it covers there: [[t0, t1, storeys]]
function covers(k, F) {
  const out = [];
  for (const o of Q.BLOCKS) {
    if (o === k) continue;
    const [x0, x1, z0, z1] = o.rect;
    const touch = F.d[0]
      ? Math.abs(F.a[1] - z0) < 0.01 || Math.abs(F.a[1] - z1) < 0.01
      : Math.abs(F.a[0] - x0) < 0.01 || Math.abs(F.a[0] - x1) < 0.01;
    if (!touch) continue;
    const [lo, hi] = F.d[0] ? [x0, x1] : [z0, z1];
    const a = tOf(F, lo),
      b = tOf(F, hi);
    const t0 = Math.max(0, Math.min(a, b)),
      t1 = Math.min(F.L, Math.max(a, b));
    if (t1 - t0 > 0.05) out.push([t0, t1, o.storeys]);
  }
  return out;
}
const hidden = (cov, t, s, w = 0) => cov.some(([t0, t1, n]) => s < n && t + w / 2 > t0 && t - w / 2 < t1);

export function* blocksSteps(p, lights, { far = false } = {}) {
  const glass = [],
    litGlass = [];
  const box =
    (color, cast = true) =>
    (w, h, d, x, y, z) =>
      p.box(color, w, h, d, x, y, z, { cast });
  const pane = (lit) => (w, h, d, x, y, z) => {
    const g = w >= d ? new THREE.PlaneGeometry(w, h) : new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2);
    (lit ? litGlass : glass).push(g.translate(x, y + h / 2, z));
  };
  for (const k of Q.BLOCKS) {
    if (k.villa) villa(p, k, { box, pane, lights });
    else dormBlock(p, k, { box, pane, lights, glass, litGlass, far });
    yield;
  }
  commons(p, { box, pane, lights });
  shed(p);
  yield;
  const out = new THREE.MeshStandardMaterial({ color: '#4c5a68', roughness: 0.3, side: THREE.DoubleSide });
  const lit = new THREE.MeshStandardMaterial({
    color: '#4c5a68',
    roughness: 0.3,
    side: THREE.DoubleSide,
    emissive: new THREE.Color('#ffc98a'),
    emissiveIntensity: 0,
  });
  const glows = [{ mat: lit, night: { color: '#e8c89a', emissiveIntensity: 0.6 } }];
  return {
    meshes(root) {
      if (glass.length) root.add(merged(glass, out, { cast: false }));
      if (litGlass.length) root.add(merged(litGlass, lit, { cast: false }));
    },
    glows,
    evening: () => lightUp(glows),
  };
}

// one dorm block: walls, bands, every face by what it is for, the roof
function dormBlock(p, k, { box, pane, lights, glass, litGlass, far }) {
  const [x0, x1, z0, z1] = k.rect,
    w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    n = k.storeys,
    H = n * FH,
    wall = TOWN.walls[k.wall];
  p.box(wall, w, H, d, cx, 0, cz, { surf: 'plaster' });
  p.box(PLINTH, w + 0.06, 0.32, d + 0.06, cx, 0, cz, { cast: false, surf: 'concrete' });
  for (let f = 1; f < n; f++) p.box(TOWN.band, w + 0.08, 0.12, d + 0.08, cx, f * FH - 0.06, cz, { cast: false });
  const F = faces(k.rect);
  for (const side of ['s', 'n', 'w', 'e']) {
    const f = F[side],
      cov = covers(k, f);
    if (cov.some(([t0, t1, m]) => t0 < 0.05 && t1 > f.L - 0.05 && m >= n)) continue; // wholly against a taller part
    if (side === k.galleries) galleries(p, f, side, k, cov, { box, pane, lights });
    else if (side === k.balconies || side === k.terrace) balconyFace(p, f, k, cov, { box, pane });
    else plainFace(p, f, k, cov, glass, litGlass, far);
  }
  // the roof: a lower part's is a terrace for the flats of the taller part beside it, the rest the apartment roof
  const terraceFor = Q.BLOCKS.find(
    (o) => o !== k && o.terrace && o.storeys === n + 1 && covers(o, faces(o.rect)[o.terrace]).length,
  );
  if (terraceFor) roofTerrace(p, k, H, wall, box);
  else {
    const joins = k.joins ? 'nsew'.replace(k.joins, '') : 'nsew';
    apartmentDeck(p, k.rect, H + 0.14, { wall, seams: !far, edges: joins });
    if (k.id === 'dorm_se_s') return; // its wing's roof carries the plant (one stair head for the L)
    const stair =
      k.galleries === 'w' ? [x0 + 0.35, x0 + 1.65, cz - 0.8, cz + 0.85] : [cx - 0.65, cx + 0.65, z0 + 0.35, z0 + 2.0];
    apartmentServices(p, H + 0.14, {
      wall,
      stair,
      tank: [x1 - 1.2, z1 - 1.1],
      units: Array.from({ length: 3 }, (_, i) => [x0 + Math.min(w - 0.6, 1.8 + i * 0.8), z1 - 0.7, Math.PI]),
      vents: [[x1 - 0.6, cz]],
      detail: false,
    });
  }
}

// the open corridors on the door side: a slab and a parapet a floor from 2F up, the flats' doors behind them; the
// stair's window over the entrance, the entrance on the ground floor
function galleries(p, F, side, k, cov, { box, pane, lights }) {
  const door = k.face === side,
    n = k.storeys,
    at = door ? tOf(F, k.at) : F.L / 2,
    D = 0.75; // how far the corridor stands out
  const stair = [at - 0.8, at + 0.8];
  // the runs of the face not against another part, for each storey, and which of their ends meet that part (an
  // inside corner, where the other wing's corridor carries on round it: S-E's)
  const runs = (s) => {
    const cuts = cov.filter(([, , m]) => s < m).map(([t0, t1]) => [t0, t1]);
    const out = [];
    let t = 0;
    for (const [c0, c1] of [...cuts.sort((a, b) => a[0] - b[0]), [F.L, F.L]]) {
      if (c0 - t > 0.3) out.push([t, c0, t > 0.01, c0 < F.L - 0.01]);
      t = Math.max(t, c1);
    }
    return out;
  };
  // at an inside corner the parapet stops a corridor's depth short, where the other wing's turns along it; the
  // slab of the wing that joins the other (k.joins) stops there too, so the corner's square is laid once
  const [x0, x1, z0, z1] = k.rect,
    joint = k.joins ? tOf(F, { e: x1, w: x0, n: z0, s: z1 }[k.joins]) : null,
    trims = (t) => joint !== null && Math.abs(t - joint) < 0.01;
  for (let s = 1; s < n; s++) {
    const y = s * FH;
    for (const [r0, r1, in0, in1] of runs(s)) {
      const t0 = r0,
        t1 = r1;
      // the slab, the parapet and its rail
      const s0 = t0 + (trims(t0) ? D : 0),
        s1 = t1 - (trims(t1) ? D : 0);
      onFace(box(SLAB, false), F, (s0 + s1) / 2, y - 0.14, D / 2, s1 - s0, 0.14, D);
      const p0 = t0 + (in0 || trims(t0) ? D : 0),
        p1 = t1 - (in1 || trims(t1) ? D : 0);
      onFace(box(PANEL), F, (p0 + p1) / 2, y - 0.05, D - 0.045, p1 - p0, 0.62, 0.09);
      onFace(box(SILL, false), F, (p0 + p1) / 2, y + 0.57, D - 0.045, p1 - p0 + 0.02, 0.035, 0.13);
      const L = t1 - t0;
      // the flats' doors, one a flat, clear of the stair
      const flats = Math.max(1, Math.round(L / 2.3)),
        fw = L / flats;
      for (let i = 0; i < flats; i++) {
        const c = t0 + fw * (i + 0.5);
        if (c > stair[0] - 0.5 && c < stair[1] + 0.5) continue;
        onFace(box(DOOR, false), F, c, y + 0.01, 0.012, 0.56, 1.26, 0.02);
        onFace(box(FRAME, false), F, c, y + 1.27, 0.02, 0.64, 0.05, 0.04);
        onFace(box(METER, false), F, c + 0.5, y + 0.9, 0.025, 0.15, 0.22, 0.05);
        onFace(pane(hash2(c + y, s, k.rect[0]) < 0.35), F, c - 0.62, y + 0.72, 0.01, 0.3, 0.36, 0.01);
        onFace(box(FRAME, false), F, c - 0.62, y + 0.7, 0.03, 0.36, 0.02, 0.02);
        onFace(box(FRAME, false), F, c - 0.62, y + 1.1, 0.03, 0.36, 0.02, 0.02);
        const g = [];
        onFace(
          (ww, h, t, x, yy, z) => g.push(new THREE.BoxGeometry(ww, h, t).translate(x, yy + h / 2, z)),
          F,
          c + 0.36,
          y + 1.4,
          0.035,
          0.14,
          0.07,
          0.05,
        );
        lights.glowParts.push(...g);
      }
    }
  }
  // the stair: a tall lit window a floor over the entrance, framed
  for (let s = 1; s < n; s++) {
    const y = s * FH;
    if (hidden(cov, at, s, 1.6)) continue;
    onFace(pane(true), F, at, y + 0.75, D + 0.06, 1.3, 0.9, 0.02);
    onFace(box(FRAME, false), F, at, y + 0.7, D + 0.06, 1.42, 0.05, 0.05);
    onFace(box(FRAME, false), F, at, y + 1.65, D + 0.06, 1.42, 0.05, 0.05);
  }
  // the ground floor: the entrance under its canopy (the front kit's dorm door) with windows either side, or
  // windows along it
  if (door) groundFloor(p, F, { ...k, ground: 'dorm', at: k.at }, FH, { box, pane, lights });
  else
    for (const [t0, t1] of runs(0)) {
      const m = Math.max(1, Math.floor((t1 - t0) / 1.7));
      for (let i = 0; i < m; i++) {
        const u = t0 + ((t1 - t0) / m) * (i + 0.5);
        onFace(pane(hash2(u, 0, k.rect[2]) < 0.3), F, u, 0.6, 0.02, 0.8, 0.85, 0.05);
        onFace(box(SILL, false), F, u, 0.53, 0.06, 0.92, 0.07, 0.12);
      }
    }
}

// the balcony side: a balcony a room on every floor above the ground, glazed doors onto the gardens below; a face
// a lower part stands against gets its balconies from where it rises clear of it (terraces, roofTerrace)
function balconyFace(p, F, k, cov, { box, pane }) {
  const n = k.storeys;
  for (let s = 0; s < n; s++) {
    const y = s * FH;
    const free = !cov.some(([, , m]) => s < m);
    if (!free) continue;
    const onRoof = cov.some(([, , m]) => s === m); // the floor just over a lower part: its terrace is that roof
    if (s === 0 || onRoof) {
      // glazed doors a room, under a slim transom, onto the garden or the terrace
      const rooms = Math.max(1, Math.round(F.L / 2.4)),
        rw = F.L / rooms;
      for (let r = 0; r < rooms; r++) {
        const u = rw * (r + 0.5);
        onFace(pane(hash2(u, s, k.rect[1]) < 0.3), F, u, y + 0.06, 0.02, rw - 0.5, 1.4, 0.05);
        onFace(box(FRAME, false), F, u, y + 1.46, 0.04, rw - 0.4, 0.06, 0.06);
        onFace(box(FRAME, false), F, u, y + 0.06, 0.04, 0.05, 1.4, 0.06);
      }
      if (onRoof && s === n - 1) onFace(box(SLAB, false), F, F.L / 2, n * FH - 0.02, 0.4, F.L + 0.1, 0.16, 0.8); // a canopy over the terrace
      continue;
    }
    balconyRow(F, y, { box, pane, seed: k.rect[0] + k.rect[2] + s });
    if (s === n - 1) onFace(box(SLAB), F, F.L / 2, n * FH - 0.02, 0.4, F.L + 0.1, 0.16, 0.8);
  }
}

// an end or a back: a dorm window per bay on every storey, none where another part stands against it
function plainFace(p, F, k, cov, glass, litGlass, far) {
  const cols = Math.max(1, Math.floor(F.L / 1.7)),
    step = F.L / cols;
  for (let s = 0; s < k.storeys; s++)
    for (let c = 0; c < cols; c++) {
      const u = step * (c + 0.5);
      if (hidden(cov, u, s, 1)) continue;
      if (far && s % 2) continue;
      dormWindow(p, F, u, s * FH + 0.6, glass, litGlass, Math.round(k.rect[0] * 19 + k.rect[2] * 7 + s * 31 + c));
    }
}

// a lower part's roof as the terrace of the flats on the floor above it in the part beside it: timber decking over
// the membrane, a parapet with a glass balustrade on its open edges, a planter box along the sea edge, a screen
// between each flat's terrace, a small table and chairs here and there
function roofTerrace(p, k, H, wall, box) {
  const [x0, x1, z0, z1] = k.rect,
    y = H + 0.14;
  flatRoof(p, k.rect, y, { edges: '' });
  // the decking in boards along x, a hair over the membrane
  boards(p, [x0 + 0.1, x1 - 0.1, z0 + 0.15, z1 - 0.15], { y: y + 0.06, along: 'x', w: 0.3, tones: [DECK, '#86735f'] });
  // the parapet on the open sides (not the one against the taller part), with the glass on it
  const F = faces(k.rect),
    open = ['n', 's', 'e', 'w'].filter((s) => !covers(k, F[s]).some(([, , m]) => m > k.storeys));
  for (const s of open) {
    const f = F[s];
    onFace(box(wall), f, f.L / 2, y, -0.06, f.L + 0.02, 0.32, 0.12);
    onFace(box('#b8bbba'), f, f.L / 2, y + 0.32, -0.06, f.L + 0.06, 0.04, 0.16);
    onFace(box(RAIL_GLASS, false), f, f.L / 2, y + 0.36, -0.06, f.L, 0.6, 0.03);
    onFace(box(STEEL.mid), f, f.L / 2, y + 0.96, -0.06, f.L + 0.02, 0.04, 0.06);
  }
  // planter boxes along the sea edge, a screen between each flat's terrace, a table and two chairs on some
  const E = F.e,
    flats = Math.max(1, Math.round(E.L / 2.4)),
    fw = E.L / flats;
  for (let i = 0; i < flats; i++) {
    const u = fw * (i + 0.5);
    onFace(box(PLANTER), E, u, y, -0.45, fw - 0.6, 0.4, 0.42);
    for (let m = 0; m < 3; m++) {
      const [mx, mz] = faceAt(E, u - fw * 0.3 + m * fw * 0.3, -0.45);
      mound(p, mx, mz, 0.2 + ((i + m) % 3) * 0.04, [LEAF.mid, LEAF.fresh, LEAF.deep][(i + m) % 3], { y: y + 0.4 });
    }
    if (i) onFace(box('#c9c3b6', false), E, fw * i, y, -(x1 - x0) / 2 + 0.05, 0.06, 1.0, x1 - x0 - 0.3);
    if (hash2(i, k.rect[2], 7) < 0.55) {
      const [tx, tz] = faceAt(E, u, -(x1 - x0) / 2);
      p.box('#c9cdd0', 0.42, 0.04, 0.42, tx, y + 0.42, tz);
      p.box(STEEL.dark, 0.05, 0.42, 0.05, tx, y, tz, { cast: false });
      for (const s of [-1, 1]) p.box('#8f969e', 0.3, 0.3, 0.3, tx, y, tz + s * 0.45);
    }
  }
}
