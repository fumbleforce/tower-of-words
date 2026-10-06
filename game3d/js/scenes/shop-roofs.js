// The shop street's buildings and their roofs (plaza-buildings.js shopStreet), as the picked map draws them
// (art/island/island-map-4-topdown.png): each row is a run of small buildings of one to three bays, each its own
// height and wall colour, under one of three roofs, and the arcade between the rows is a ribbed glass roof.
//   plant   a flat roof behind a coped parapet with condensers along its back, a stair hut and a water tank
//   solar   the same with rows of solar panels and condensers in a corner
//   screen  the same with a louvred plant screen, a stair hut and a tank
//   garden  a roof garden: planters along both parapets and a slatted deck
//   beds    a roof garden: square raised beds of shrubs on gravel round a deck
//   pitch   a gable roof of grey tiles along the street, its eaves over front and back, a ridge cap and tile courses
// Everything goes into a Parts collector (outdoor/parts.js) in the street's own frame: u along the street, v across
// it to the south, y up.
import * as THREE from 'three';
import { hash2 } from './outdoor/parts.js';
import { mound, cluster, LEAF } from './outdoor/planting.js';
import { STEEL } from './outdoor/furniture.js';

// [first bay, last bay, roof (below), extra height] per building; bays are numbered from the rows' west end
// (island-south.js BAYS). The south row leaves out the alleys' bays (1, 6, 11). An extra height of 1.45 is a third
// storey.
export { BLOCKS } from './shop-roof-plan.js';

const C = {
  slabs: ['#868b92', '#90959b', '#7e838a'],
  parapet: '#878d94',
  coping: '#959ba2',
  plant: '#a3a9b0',
  fan: '#5b616b',
  louvre: '#959ba2',
  hut: '#868b92',
  door: '#6c737c',
  tank: '#9aa3ab',
  solar: '#5f6d7c',
  solarLine: '#a1a8b0',
  tile: '#5f6974',
  tileLine: '#555e68',
  ridge: '#4c545e',
  deck: '#8f8d88',
  deckLine: '#7d7b77',
  gravel: '#9d9b95',
  planter: '#7f8186',
};
export const ARCADE = { glass: '#7d93a6', rib: '#5b616b', gutter: '#6c737c' };
const GREENS = [LEAF.mid, LEAF.fresh, LEAF.deep];

// a flat roof's slab in one of three tones, and its parapet all round with a pale coping
function slab(p, u0, u1, v0, v1, h, seed) {
  const w = u1 - u0,
    d = v1 - v0,
    uc = (u0 + u1) / 2,
    vc = (v0 + v1) / 2;
  // the deck sits just under the parapet's top, so the roof reads as a roof and not a tray
  p.box(C.slabs[seed % 3], w - 0.1, 0.14, d - 0.1, uc, h, vc, {
    cast: false,
    surf: 'roof',
  });
  for (const v of [v0 + 0.1, v1 - 0.1]) {
    p.box(C.parapet, w, 0.22, 0.2, uc, h, v);
    p.box(C.coping, w + 0.04, 0.05, 0.26, uc, h + 0.22, v);
  }
  for (const u of [u0 + 0.1, u1 - 0.1]) {
    p.box(C.parapet, 0.2, 0.22, d - 0.4, u, h, vc);
    p.box(C.coping, 0.26, 0.05, d - 0.4, u, h + 0.22, vc);
  }
}

// a condenser: a pale box with a grey fan disc on its top
function condenser(p, u, v, h) {
  p.box(C.plant, 0.95, 0.5, 0.7, u, h, v, { surf: 'metal' });
  for (const x of [-0.32, 0.32]) p.box(STEEL.dark, 0.09, 0.09, 0.62, u + x, h - 0.06, v);
  for (let y = 0.12; y < 0.42; y += 0.065) p.box(C.fan, 0.66, 0.018, 0.016, u, h + y, v + 0.354, { cast: false });
  p.geo(C.fan, new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16).translate(u, h + 0.5, v));
  for (const x of [-0.14, -0.07, 0, 0.07, 0.14])
    p.box(C.louvre, 0.015, 0.018, 0.38, u + x, h + 0.523, v, { cast: false });
}
// the stair hut, its door facing along the roof (dir: +1 east, -1 west), a flat cap over it
function hut(p, u, v, h, dir) {
  p.box(C.hut, 1.3, 1.5, 1.2, u, h, v);
  p.box(C.coping, 1.45, 0.08, 1.35, u, h + 1.5, v);
  p.box(C.door, 0.05, 1.0, 0.6, u + dir * 0.66, h, v);
}
function tank(p, u, v, h) {
  p.box(STEEL.mid, 0.9, 0.35, 0.9, u, h, v);
  p.geo(C.tank, new THREE.CylinderGeometry(0.42, 0.42, 0.8, 12).translate(u, h + 0.75, v));
}

// The three flat roofs (plant, solar, screen). `back`: +1 if the street's back (away from the
// arcade) is at v1, -1 at v0; plant stands toward the back, where the play camera grazes the north row.
function flatRoof(p, variant, u0, u1, v0, v1, h, seed, back) {
  slab(p, u0, u1, v0, v1, h, seed);
  const w = u1 - u0,
    vc = (v0 + v1) / 2,
    vb = vc + back * 1.2, // toward the back
    vf = vc - back * 0.9, // toward the front
    left = hash2(seed, w, 3) < 0.5,
    y = h + 0.14,
    kind = ['plant', 'solar', 'screen'].indexOf(variant);
  if (kind === 0) {
    for (let u = u0 + 1.0 + hash2(seed, 1, 5) * 0.6; u < u1 - 0.8; u += 1.5 + hash2(u, seed, 1) * 1.1)
      condenser(p, u, vb + (hash2(u, seed, 2) - 0.5) * 0.3, y);
    hut(p, left ? u0 + 1.0 : u1 - 1.0, vf, y, left ? 1 : -1);
    if (w > 5) tank(p, (u0 + u1) / 2 + (left ? 1 : -1) * 0.8, vf + back * 0.1, y);
  } else if (kind === 1) {
    // panels in rows across the street, tilted to the south
    for (let u = u0 + 0.7; u < u1 - 1.9; u += 1.25)
      for (const v of [vc - 0.75, vc + 0.75]) {
        p.geo(C.solar, new THREE.BoxGeometry(1.05, 0.05, 1.3).rotateX(0.25).translate(u + 0.55, y + 0.3, v));
        p.geo(C.solarLine, new THREE.BoxGeometry(0.03, 0.06, 1.3).rotateX(0.25).translate(u + 0.55, y + 0.31, v));
      }
    condenser(p, u1 - 1.1, vb, y);
    condenser(p, u1 - 1.1, vb - back * 0.85, y);
  } else {
    const su = left ? u1 - 1.6 : u0 + 1.6;
    p.box(C.louvre, 2.4, 0.9, 1.3, su, y, vb);
    for (let k = -1.05; k <= 1.06; k += 0.3) p.box(C.coping, 0.05, 0.05, 1.3, su + k, y + 0.9, vb);
    hut(p, left ? u0 + 1.0 : u1 - 1.0, vf, y, left ? 1 : -1);
    tank(p, (u0 + u1) / 2, vf, y);
  }
}

// The two roof gardens (garden, beds)
function gardenRoof(p, beds, u0, u1, v0, v1, h, seed) {
  slab(p, u0, u1, v0, v1, h, seed);
  const vc = (v0 + v1) / 2,
    uc = (u0 + u1) / 2,
    y = h + 0.14;
  if (beds) {
    p.box(C.gravel, u1 - u0 - 0.6, 0.03, v1 - v0 - 0.6, uc, y, vc, {
      cast: false,
    });
    const n = Math.max(2, Math.round((u1 - u0) / 2.6));
    for (let i = 0; i < n; i++) {
      const u = u0 + ((u1 - u0) * (i + 0.5)) / n,
        v = vc + (i % 2 ? 0.9 : -0.9);
      p.box(C.planter, 1.3, 0.4, 1.3, u, y, v);
      p.box(LEAF.cover, 1.15, 0.04, 1.15, u, y + 0.4, v, { cast: false });
      cluster(p, u, v, {
        n: 4,
        r: 0.32,
        spread: 0.38,
        seed: seed + i,
        y: y + 0.4,
      });
    }
    p.box(C.deck, 1.6, 0.05, 1.0, uc, y, vc - (n % 2 ? 0.9 : 0));
    return;
  }
  p.box(C.deck, u1 - u0 - 1.2, 0.05, 1.6, uc, y, vc, { surf: 'door' });
  for (let u = u0 + 0.9; u < u1 - 0.6; u += 0.3) p.box(C.deckLine, 0.03, 0.06, 1.6, u, y, vc);
  for (const v of [v0 + 0.65, v1 - 0.65]) {
    p.box(C.planter, u1 - u0 - 0.6, 0.35, 0.7, uc, h, v);
    p.box(LEAF.cover, u1 - u0 - 0.75, 0.04, 0.55, uc, h + 0.35, v, {
      cast: false,
    });
    for (let u = u0 + 0.6; u < u1 - 0.5; u += 0.6 + hash2(u, v, seed) * 0.9)
      mound(p, u, v, 0.24 + hash2(v, u, seed) * 0.16, GREENS[Math.floor(u * 3) % 3], { y: h + 0.35 });
  }
  cluster(p, u0 + 0.9, vc, { n: 4, r: 0.35, spread: 0.45, seed: seed + 3, y });
  p.box(STEEL.dark, 1.2, 0.42, 0.4, u1 - 1.4, y, vc + 0.3); // a bench
}

// the gable: a prism along u, its eaves `over` out past front and back, `rise` high at the ridge
function pitchRoof(p, u0, u1, v0, v1, h) {
  const over = 0.25,
    rise = 1.0,
    half = (v1 - v0) / 2 + over,
    vc = (v0 + v1) / 2,
    L = u1 - u0 + 0.1,
    y0 = h - 0.12;
  // the triangle is drawn across the street (x: v, y: up) and extruded along u
  const shape = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, rise)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false })
    .rotateY(Math.PI / 2)
    .translate(u0 - 0.05, y0, vc);
  p.geo(C.tile, g);
  // the ridge cap, and tile courses down both slopes
  p.box(C.ridge, L, 0.1, 0.22, (u0 + u1) / 2, y0 + rise - 0.03, vc);
  const slope = Math.atan2(rise, half);
  for (const s of [-1, 1])
    for (const t of [0.3, 0.55, 0.8])
      p.geo(
        C.tileLine,
        new THREE.BoxGeometry(L, 0.03, 0.06)
          .rotateX(-s * slope)
          .translate((u0 + u1) / 2, y0 + rise * (1 - t) + 0.02, vc + s * half * t),
      );
}

// one building's roof: u0..u1 along the street, v0..v1 across it, h its eaves; back: +1 if the row's back is at v1,
// -1 at v0
export function roof(p, kind, u0, u1, v0, v1, h, seed, back) {
  if (kind === 'pitch') pitchRoof(p, u0, u1, v0, v1, h);
  else if (kind === 'garden' || kind === 'beds') gardenRoof(p, kind === 'beds', u0, u1, v0, v1, h, seed);
  else flatRoof(p, kind, u0, u1, v0, v1, h, seed, back);
}

// The arcade's roof between the rows (v0..v1 across, u0..u1 along), its eaves at h: a shallow barrel of four glass
// facets on steel ribs every 1.5 and a ridge beam, into p; gutters along both eaves, on the posts, into edge
export function arcadeRoof(p, u0, u1, v0, v1, h, edge = p) {
  const W = v1 - v0,
    L = u1 - u0,
    uc = (u0 + u1) / 2;
  const prof = [0, 0.45, 0.62, 0.45, 0].map((y, i) => [v0 + (W * i) / 4, h + y]);
  for (let i = 0; i < 4; i++) {
    const [va, ya] = prof[i],
      [vb, yb] = prof[i + 1],
      len = Math.hypot(vb - va, yb - ya),
      tilt = Math.atan2(yb - ya, vb - va),
      at = (u, lift) => [u, (ya + yb) / 2 + lift, (va + vb) / 2];
    p.geo(ARCADE.glass, new THREE.BoxGeometry(L, 0.05, len + 0.02).rotateX(-tilt).translate(...at(uc, 0)), {
      cast: false,
    });
    for (let u = u0 + 0.75; u < u1; u += 1.5)
      p.geo(ARCADE.rib, new THREE.BoxGeometry(0.14, 0.08, len + 0.04).rotateX(-tilt).translate(...at(u, 0.05)));
  }
  p.box(ARCADE.rib, L, 0.1, 0.16, uc, h + 0.62, v0 + W / 2);
  for (const v of [v0 + 0.1, v1 - 0.1]) edge.box(ARCADE.gutter, L, 0.16, 0.22, uc, h - 0.1, v);
}
