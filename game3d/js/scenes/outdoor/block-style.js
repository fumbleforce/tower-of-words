// The style options of the backdrop block (outdoor/block.js officeBlock), for a building that is more than an
// office: the clinic (plaza/north-clinic.js). Each is off by default, so the town's plain offices are unchanged.
//   upper: 'punched'   each bay a window of its own in a dark frame, a pale sill under it, the wall between
//   glazed: 'sw'       on these faces the ground floor is a glass front: corner piers only, slim mullions, a
//                      transom, frosted to the waist (a clinic's or a bank's reception)
//   stair: { face, at, w }   a glazed stair bay up the upper floors, standing proud of the face and rising past the
//                      parapet to a crown (the place for a sign); lit after work
//   roof: 'plant'      a membrane inside a coped parapet, a stair house, a water tank, condensers on a steel frame
//                      and vents, the west end left free for a roof sign (roofPlant)
// A door may also have:
//   canopy: { out, side }    a deep cantilevered canopy, `side` wider than the door each way, its front a fascia
//                      0.42 tall for a name
//   platform: { from, to, d, h, ramp, rw }   a raised landing along the face from..to (world x or z), `d` deep,
//                      two steps along its front; ramp: 'from' | 'to', a ramp `rw` wide off that end of it running out
//                      from the face, 1 in 12, with handrails both sides
// officeBlock returns { top, doors: [{ f, t, w, canopy: { c0, c1, out, y, h } | null }] }, for a place's signs.
import * as THREE from 'three';
import { STEEL, PAINTED, BARE, handrail } from './furniture.js';
import { ramp as rampSlab } from './edges.js';
import { BLOCK, onFace, faceAt, tOf } from './block-face.js';

const FRAME = '#4f565f',
  SILL = '#c9cccf',
  FROST = '#c5cfd6',
  GLASS_FRONT = '#62778a', // darker than the plain ground floor's, so it reads as glass over a frosted band
  FROST_LIT = '#f3e4d2',
  MEMBRANE = '#7f858c',
  COPING = '#b8bbba',
  UNIT = '#c6c9c7',
  GRILLE = '#6f747b',
  DUCT = '#8d9299',
  CANOPY_TOP = '#aab0b7',
  RIB = '#959ba3',
  STONE = '#7f8186', // dark granite, the landing and its steps
  NOSING = '#c9b46a', // yellow, anti-slip
  MAT = '#6b7480',
  RISER = '#5f6268',
  DOOR_GLASS = '#9fb0bf';
export const STYLE = { glassFront: GLASS_FRONT };

// a glass front's bay t0..t1 on the ground floor, over its glass: frosted to the waist (paler, lit, after work) with
// the film's edge, a kick plate along the foot and a transom
export function glassFront({ p, glass, lit }, f, t0, t1) {
  onFace(glass, FROST, f, t0, t1, 0.42, 1.0, -0.08, -0.076);
  onFace(lit, FROST_LIT, f, t0, t1, 0.42, 1.0, -0.064, -0.062, { cast: false });
  onFace(p, SILL, f, t0, t1, 0.98, 1.01, -0.08, -0.06, { cast: false });
  onFace(p, STEEL.dark, f, t0, t1, 0.3, 0.42, -0.12, -0.06);
  onFace(p, STEEL.mid, f, t0, t1, 1.8, 1.86, -0.12, -0.06);
}

// the roof's parapet in the wall's colour with a pale coping and a shadow line under it
export function copedParapet(p, f, top, wall) {
  onFace(p, wall, f, -0.04, f.L + 0.04, top, top + 0.42, -0.2, 0.04);
  onFace(p, COPING, f, -0.07, f.L + 0.07, top + 0.42, top + 0.48, -0.22, 0.07);
  onFace(p, BLOCK.fascia, f, -0.04, f.L + 0.04, top - 0.06, top, 0.04, 0.05, { cast: false });
}

// a punched window t0..t1 along the face, y0..y1: a dark frame standing a little proud, the glass (or frosted) in it with a
// mullion down its middle and a rail under its top light, a pale sill under it
export function punched({ p, glass, lit }, f, t0, t1, y0, y1, on, frosted) {
  onFace(p, FRAME, f, t0 - 0.05, t1 + 0.05, y0 - 0.05, y1 + 0.05, 0, 0.03);
  onFace(glass, frosted ? FROST : BLOCK.glass, f, t0, t1, y0, y1, 0.03, 0.036);
  if (on) onFace(lit, BLOCK.lit, f, t0, t1, y0, y1, 0.037, 0.042, { cast: false });
  const m = (t0 + t1) / 2,
    r = y0 + (y1 - y0) * 0.74;
  onFace(p, FRAME, f, m - 0.025, m + 0.025, y0, r, 0.03, 0.05);
  onFace(p, FRAME, f, t0, t1, r, r + 0.04, 0.03, 0.05);
  onFace(p, SILL, f, t0 - 0.12, t1 + 0.12, y0 - 0.13, y0 - 0.05, 0, 0.11);
}

// the glazed stair bay: two piers standing proud of the face from the fascia to past the parapet, glass between
// them crossed by a transom at each floor and a mullion, a coped crown over the top floor (where a sign goes)
export function stairBay({ p, glass, lit }, f, [t0, t1], gf, top, fh, storeys, wall) {
  const o = 0.18,
    crown = top + 0.95;
  for (const t of [t0, t1 - 0.14]) onFace(p, wall, f, t, t + 0.14, gf, crown, 0, o);
  onFace(glass, BLOCK.glass, f, t0 + 0.14, t1 - 0.14, gf, top - 0.1, o - 0.08, o - 0.07);
  // after work only a band of each floor is lit (the landings), so the stair doesn't outshine its cross
  for (let k = 0; k + 1 < storeys; k++)
    onFace(lit, BLOCK.lit, f, t0 + 0.14, t1 - 0.14, gf + k * fh + 0.1, gf + k * fh + 0.95, o - 0.065, o - 0.06, {
      cast: false,
    });
  for (let k = 1; k < storeys; k++) {
    const y = gf + (k - 1) * fh;
    onFace(p, FRAME, f, t0 + 0.14, t1 - 0.14, y - 0.04, y + 0.06, o - 0.1, o - 0.04);
  }
  onFace(p, FRAME, f, (t0 + t1) / 2 - 0.025, (t0 + t1) / 2 + 0.025, gf, top - 0.1, o - 0.1, o - 0.05);
  onFace(p, wall, f, t0, t1, top - 0.1, crown, -1.4, o); // the crown, over the stair's head
  onFace(p, COPING, f, t0 - 0.03, t1 + 0.03, crown, crown + 0.06, -1.43, o + 0.03);
  // on top, a hatch and a vent cowl
  onFace(p, FRAME, f, t0 + 0.2, (t0 + t1) / 2 - 0.05, crown + 0.06, crown + 0.12, -1.2, -0.5, { cast: false });
  onFace(p, DUCT, f, t0 + 0.26, (t0 + t1) / 2 - 0.11, crown + 0.12, crown + 0.14, -1.14, -0.56, { cast: false });
  const [vx, vz] = faceAt(f, (t0 + t1) / 2 + 0.35, -0.85);
  p.geo(DUCT, new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8).translate(vx, crown + 0.21, vz));
  p.geo(DUCT, new THREE.CylinderGeometry(0.15, 0.1, 0.08, 8).translate(vx, crown + 0.4, vz));
}

// the roof: a membrane with lap seams; a stair house in the north-east corner with its door and a hood; a panel
// water tank on a steel stand along the north side; condensers on two rails across the south side, east of a
// south stair bay's crown (sx: its x span, if there is one) and a pair west of it; vent cowls in the north-west.
export function roofPlant(p, [x0, x1, z0, z1], top, wall, sx) {
  const w = x1 - x0,
    d = z1 - z0,
    y = top + 0.02;
  p.box(MEMBRANE, w - 0.4, 0.02, d - 0.4, (x0 + x1) / 2, top, (z0 + z1) / 2, { cast: false });
  for (let x = x0 + 1.2; x < x1 - 0.4; x += 1.2)
    p.box('#767c83', 0.03, 0.012, d - 0.4, x, y, (z0 + z1) / 2, { cast: false });
  const hx1 = x1 - 0.5,
    hx0 = hx1 - Math.min(2.0, w * 0.22),
    hz0 = z0 + 0.5,
    hz1 = hz0 + Math.min(2.4, d * 0.42);
  p.box(wall, hx1 - hx0, 2.1, hz1 - hz0, (hx0 + hx1) / 2, top, (hz0 + hz1) / 2);
  p.box(COPING, hx1 - hx0 + 0.14, 0.08, hz1 - hz0 + 0.14, (hx0 + hx1) / 2, top + 2.1, (hz0 + hz1) / 2);
  p.box(FRAME, 0.8, 1.8, 0.04, hx0 + 0.6, top, hz1 + 0.02); // its door, to the south
  p.box(BLOCK.canopy, 1.0, 0.05, 0.35, hx0 + 0.6, top + 1.95, hz1 + 0.17);
  // the water tank: a box of pale panels on a steel stand, west of the stair house
  const tx1 = hx0 - 0.5,
    tx0 = tx1 - Math.min(1.8, w * 0.18),
    tz = z0 + 1.15;
  for (const x of [tx0 + 0.1, tx1 - 0.1]) p.box(STEEL.dark, 0.08, 0.4, 1.1, x, top, tz, PAINTED);
  p.box('#b7c0c6', tx1 - tx0, 1.1, 1.0, (tx0 + tx1) / 2, top + 0.4, tz, PAINTED);
  for (let x = tx0 + 0.5; x < tx1 - 0.1; x += 0.5)
    p.box('#9ea8b0', 0.03, 1.1, 0.02, x, top + 0.4, tz + 0.51, { cast: false });
  p.box('#9ea8b0', tx1 - tx0, 0.03, 0.02, (tx0 + tx1) / 2, top + 0.95, tz + 0.51, { cast: false });
  // the condensers (painted steel cases, kit/materials/), fans to the south, in a row on two rails east of the stair
  // bay, and a pair west of it
  const uz = z1 - 1.25;
  const units = (ux0, n) => {
    for (const dz of [-0.12, 0.12])
      p.box(STEEL.dark, n * 0.85, 0.08, 0.06, ux0 + (n * 0.85) / 2, top, uz + dz, PAINTED);
    for (let i = 0; i < n; i++) {
      const x = ux0 + i * 0.85 + 0.42;
      p.box(UNIT, 0.72, 0.56, 0.34, x, top + 0.08, uz, PAINTED);
      p.box(GRILLE, 0.38, 0.38, 0.02, x - 0.12, top + 0.17, uz + 0.18, { cast: false });
    }
  };
  const ux0 = Math.max(x0 + w * 0.36, sx ? sx[1] + 0.35 : x0);
  units(ux0, Math.max(2, Math.floor((x1 - 0.6 - ux0) / 0.85)));
  if (sx && sx[0] - 0.35 - 1.7 > x0 + 3.2) units(sx[0] - 0.35 - 1.7, 2);
  for (const x of [x0 + 1.0, x0 + 2.6]) {
    p.geo(DUCT, new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8).translate(x, top + 0.2, z0 + 0.9), BARE);
    p.geo(DUCT, new THREE.CylinderGeometry(0.17, 0.11, 0.09, 8).translate(x, top + 0.44, z0 + 0.9), BARE);
  }
}

// a front door: a glazed pair in a pale frame with an automatic door's white band at chest height and pull bars,
// lit after work like the glass front; its landing and ramp (platform), its deep canopy (canopy). Returns the
// canopy's span and front, or null
export function frontDoor({ p, glass, lit }, f, { t, w, canopy, platform }) {
  const h = 2.0;
  onFace(p, STEEL.pale, f, t - w / 2 - 0.06, t + w / 2 + 0.06, 0.08, h + 0.06, -0.1, -0.04);
  for (const [a, b] of [
    [t - w / 2, t - 0.02],
    [t + 0.02, t + w / 2],
  ]) {
    onFace(glass, DOOR_GLASS, f, a, b, 0.08, h, -0.04, -0.01);
    onFace(lit, BLOCK.lit, f, a, b, 0.08, h, -0.008, -0.004, { cast: false });
  }
  onFace(p, STEEL.pale, f, t - 0.03, t + 0.03, 0.08, h, -0.04, 0.0); // the meeting stiles
  onFace(p, SILL, f, t - w / 2, t + w / 2, 1.2, 1.27, -0.01, 0.0, { cast: false });
  for (const c of [t - 0.12, t + 0.12])
    onFace(p, STEEL.pale, f, c - 0.015, c + 0.015, 0.8, 1.5, 0, 0.04, { cast: false });
  if (platform) entrance(p, f, platform, { t, w });
  else onFace(p, BLOCK.plinth, f, t - w / 2 - 0.3, t + w / 2 + 0.3, 0, 0.08, 0, 0.6, { surf: 'concrete' });
  return canopy ? deepCanopy(p, f, t, w, canopy) : null;
}

// a deep canopy on the fascia line with a dark front 0.32 tall and dark ends
function deepCanopy(p, f, t, w, { out = 1.4, side = 0.8 }) {
  const [c0, c1] = [t - w / 2 - side, t + w / 2 + side];
  onFace(p, CANOPY_TOP, f, c0, c1, 2.2, 2.27, 0, out);
  for (let c = c0 + 0.4; c < c1 - 0.2; c += 0.45)
    onFace(p, RIB, f, c - 0.02, c + 0.02, 2.27, 2.3, 0, out - 0.08, { cast: false });
  onFace(p, BLOCK.fascia, f, c0, c1, 2.04, 2.46, out - 0.08, out);
  for (const [a, b] of [
    [c0, c0 + 0.08],
    [c1 - 0.08, c1],
  ])
    onFace(p, BLOCK.fascia, f, a, b, 2.04, 2.46, 0, out);
  return { c0, c1, out, y: 2.04, h: 0.42 };
}

// the raised landing (dark granite over the plinth, a mat at the door), two steps along its front with yellow nosings
// (the upper in the landing's granite, the lower paler),
// and the ramp off one end, a handrail down each side of it
function entrance(p, f, { from, to, d = 1.1, h = 0.15, ramp = 'to', rw = 1.1 }, door) {
  const ta = tOf(f, from),
    tb = tOf(f, to);
  const [a, b] = ta < tb ? [ta, tb] : [tb, ta];
  const end = ramp === 'to' ? tb : ta;
  const r = end === b ? [b - rw, b] : [a, a + rw];
  onFace(p, BLOCK.plinth, f, a, b, 0, h - 0.02, 0, d, { surf: 'concrete' });
  onFace(p, STONE, f, a, b, h - 0.02, h, 0, d, { surf: 'concrete', cast: false });
  for (let t = a + 0.6; t < b - 0.1; t += 0.6)
    onFace(p, RISER, f, t - 0.01, t + 0.01, h, h + 0.003, 0, d, { cast: false });
  onFace(p, RISER, f, a, b, h, h + 0.003, d / 2 - 0.01, d / 2 + 0.01, { cast: false }); // its joints
  onFace(p, MAT, f, door.t - door.w / 2 - 0.1, door.t + door.w / 2 + 0.1, h, h + 0.01, 0.05, 0.75, { cast: false });
  const [s0, s1] = end === b ? [a, r[0] - 0.12] : [r[1] + 0.12, b];
  for (const k of [1, 2]) {
    const y = (h * (3 - k)) / 3,
      o = d + 0.35 * (k - 1);
    onFace(p, k === 1 ? STONE : BLOCK.plinth, f, s0 - 0.05 * k, s1 + 0.05 * k, 0, y, o, o + 0.35, { surf: 'concrete' });
    onFace(p, NOSING, f, s0 - 0.05 * k, s1 + 0.05 * k, y, y + 0.003, o + 0.29, o + 0.35, { cast: false });
    onFace(p, RISER, f, s0 - 0.05 * k, s1 + 0.05 * k, 0, y - 0.004, o + 0.35, o + 0.355, { cast: false });
  }
  onFace(p, NOSING, f, a, b, h, h + 0.003, d - 0.06, d, { cast: false });
  onFace(p, RISER, f, a, b, 0, h - 0.004, d, d + 0.005, { cast: false });
  const L = h * 12;
  rampSlab(p, faceAt(f, (r[0] + r[1]) / 2, d), faceAt(f, (r[0] + r[1]) / 2, d + L), r[1] - r[0], h);
  for (const t of [r[0] + 0.06, r[1] - 0.06])
    handrail(p, [
      [...faceAt(f, t, d - 0.3), h],
      [...faceAt(f, t, d), h],
      [...faceAt(f, t, d + L - 0.05), 0],
      [...faceAt(f, t, d + L + 0.2), 0], // a level return past the foot
    ]);
}
