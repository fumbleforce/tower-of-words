// A backdrop office block for the outdoor kit (scenes/outdoor/): one of the town's lower office buildings as the
// streets see it. A ground floor of square piers with recessed glass between them on a granite plinth, under a
// dark fascia; above it floor bands, pale mullions and a ribbon window on every floor; a parapet and a little roof
// plant. Its doors are glazed pairs under a pale flat canopy on two posts (or a short hood), on a step, with a pale
// name plate beside them; after work the ground floor and some windows above are lit. Outside only, nothing
// inside. Everything goes into Parts collectors (outdoor/parts.js), so once the place merges its statics a block
// costs no draw calls of its own.
//   const sets = blockSets();                        opaque parts, glass, and the windows lit after work
//   officeBlock(sets, rect, { storeys, fh, gf, wall, doors: [{ face: 'w', at, w, porch }], seed })
//     and the style options for a building that is more than an office (the clinic): upper, glazed, stair, roof,
//     a door's canopy and platform (outdoor/block-style.js)
//   const { lit } = buildBlockSets(sets, root);      lit starts hidden; lit.visible = true in the evening
// The palette and face maths are in outdoor/block-face.js, the style options' parts in outdoor/block-style.js.
// rect [x0, x1, z0, z1] on the grid. Faces: n (z0), s (z1), w (x0), e (x1); a door's `at` is its middle along
// the face (x on n and s, z on w and e), and doorAt(rect, face, at) gives the middle of the bay nearest it.
import * as THREE from 'three';
import { Parts, hash2 } from './parts.js';
import { STEEL } from './furniture.js';
import { BLOCK, faces, onFace, tOf, vOf, bayOf } from './block-face.js';
import { drain } from '../../perf/slice.js';
import { STYLE, glassFront, copedParapet, punched, stairBay, roofPlant, frontDoor } from './block-style.js';

export { BLOCK, faces, faceAt, tOf } from './block-face.js';

export function blockSets() {
  return { p: new Parts(), glass: new Parts(), lit: new Parts() };
}
export function buildBlockSets({ p, glass, lit }, root) {
  p.build(root);
  for (const m of glass.build(root)) m.material = glassMat;
  const [litMesh = null] = lit.build(root);
  if (litMesh) {
    litMesh.material = litMat;
    litMesh.name = 'block:lit'; // named, so the merge and the perf batch leave it alone and the evening finds it
    litMesh.castShadow = false;
    litMesh.visible = false;
  }
  return { lit: litMesh };
}
const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05 });
const litMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  emissive: new THREE.Color('#ffc98a'),
  emissiveIntensity: 0.9,
});

const snap = (f, at) => {
  const bw = bayOf(f.L);
  return (Math.min(Math.round(f.L / bw) - 1, Math.max(0, Math.floor(tOf(f, at) / bw))) + 0.5) * bw;
};
// the middle of the bay nearest `at` on a face, in world x or z, and the width of a door that fills it
export function doorAt(rect, face, at) {
  const f = faces(rect)[face];
  return { at: vOf(f, snap(f, at)), w: bayOf(f.L) - 0.36 };
}

// officeBlockSteps is the same as a generator that yields after every face, for a place built in slices
// (js/perf/slice.js)
export const officeBlock = (...a) => drain(officeBlockSteps(...a));
export function* officeBlockSteps(
  sets,
  rect,
  {
    storeys = 4,
    fh = 2,
    gf = 2.4,
    wall = '#8a8f96',
    doors = [],
    seed = 1,
    upper = 'ribbon',
    glazed = '',
    stair = null,
    roof = 'plain',
  } = {},
) {
  const { p, glass, lit } = sets;
  const [x0, x1, z0, z1] = rect,
    w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const top = gf + (storeys - 1) * fh;
  const out = { top, doors: [] };
  // the body: the ground floor's dark wall set back behind the piers, the upper floors flush with the face
  p.box(BLOCK.core, w - 0.3, gf, d - 0.3, cx, 0, cz, { surf: 'concrete' });
  p.box(wall, w, top - gf, d, cx, gf, cz, { surf: 'concrete' });
  const F = faces(rect);
  for (const [id, f] of Object.entries(F)) {
    const bw = bayOf(f.L),
      bays = Math.round(f.L / bw);
    const front = glazed.includes(id);
    // a door stands where it is asked for, as wide as a bay's glass unless it says; the piers in its way go, and
    // the bays it overlaps are walled, not glazed (doorAt finds a bay's middle, for a door that fills one bay)
    const myDoors = doors
      .filter((o) => o.face === id)
      .map((o) => ({ ...o, t: tOf(f, o.at), w: o.w ?? bw - 0.36, porch: o.porch ?? true }));
    const inDoor = (t0, t1) => myDoors.some((o) => t1 > o.t - o.w / 2 - 0.05 && t0 < o.t + o.w / 2 + 0.05);
    // the stair bay's span along this face, if it is on this one
    const st = stair?.face === id ? [tOf(f, stair.at) - stair.w / 2, tOf(f, stair.at) + stair.w / 2] : null;
    // ground floor: plinth, piers on the bay lines (a glass front keeps its corner piers, slim mullions between),
    // glass between them, the fascia over all
    const cuts = [-0.02, ...myDoors.flatMap((o) => [o.t - o.w / 2 - 0.06, o.t + o.w / 2 + 0.06]), f.L + 0.02];
    for (let i = 0; i + 1 < cuts.length; i += 2)
      onFace(p, BLOCK.plinth, f, cuts[i], cuts[i + 1], 0, 0.3, -0.15, 0.03, { surf: 'concrete' });
    for (let i = 0; i <= bays; i++) {
      if (myDoors.some((o) => Math.abs(i * bw - o.t) < o.w / 2 + 0.15)) continue;
      if (front && i > 0 && i < bays)
        onFace(p, STEEL.dark, f, i * bw - 0.04, i * bw + 0.04, 0.3, gf - 0.32, -0.13, -0.05);
      else onFace(p, wall, f, i * bw - 0.17, i * bw + 0.17, 0.3, gf - 0.32, -0.15, 0.02, { surf: 'concrete' });
    }
    for (let i = 0; i < bays; i++) {
      const e0 = front && i > 0 ? 0.035 : 0.17,
        e1 = front && i < bays - 1 ? 0.035 : 0.17;
      const [t0, t1] = [i * bw + e0, (i + 1) * bw - e1];
      if (!inDoor(t0, t1)) {
        onFace(glass, front ? STYLE.glassFront : BLOCK.glassLow, f, t0, t1, 0.3, gf - 0.32, -0.12, -0.08);
        // after work the ground floor is lit
        onFace(lit, BLOCK.lit, f, t0, t1, 0.3, gf - 0.32, -0.075, -0.065, { cast: false });
        if (front) glassFront(sets, f, t0, t1);
      } else onFace(p, BLOCK.core, f, t0, t1, 0.3, gf - 0.32, -0.15, -0.1);
    }
    onFace(p, BLOCK.fascia, f, -0.04, f.L + 0.04, gf - 0.32, gf, -0.15, 0.06);
    // upper floors: a floor band, then the ribbon (a window band, mullions on the bay lines) or punched windows
    for (let k = 1; k < storeys; k++) {
      const y = gf + (k - 1) * fh;
      onFace(p, BLOCK.band, f, -0.03, f.L + 0.03, y, y + 0.14, 0, 0.05);
      for (let i = 0; i < bays; i++) {
        const on = hash2(i + seed * 13, k, id.charCodeAt(0)) < 0.28;
        if (upper === 'punched') {
          const [t0, t1] = [i * bw + 0.26, (i + 1) * bw - 0.26];
          // a few frosted (the washrooms, the treatment rooms)
          const frosted = hash2(i + seed * 7, k, id.charCodeAt(0) + 5) < 0.18;
          if (!(st && t1 > st[0] && t0 < st[1])) punched(sets, f, t0, t1, y + 0.5, y + 1.62, on, frosted);
          continue;
        }
        const [t0, t1] = [i * bw + 0.04, (i + 1) * bw - 0.04];
        onFace(glass, BLOCK.glass, f, t0, t1, y + 0.55, y + 1.7, 0.003, 0.012); // thin, so its edges catch no light
        if (on) onFace(lit, BLOCK.lit, f, t0, t1, y + 0.55, y + 1.7, 0.014, 0.02, { cast: false });
      }
      if (upper !== 'punched')
        for (let i = 0; i <= bays; i++)
          onFace(p, BLOCK.band, f, i * bw - 0.04, i * bw + 0.04, y + 0.5, y + 1.75, 0, 0.06);
    }
    if (roof === 'plant') copedParapet(p, f, top, wall);
    else onFace(p, BLOCK.band, f, -0.06, f.L + 0.06, top, top + 0.38, -0.16, 0.06); // the parapet
    if (st) stairBay(sets, f, st, gf, top, fh, storeys, wall);
    for (const o of myDoors) out.doors.push({ f, t: o.t, w: o.w, canopy: door(sets, f, o) });
    yield;
  }
  if (roof === 'plant') {
    const sf = stair?.face === 's' && [stair.at - stair.w / 2, stair.at + stair.w / 2];
    roofPlant(p, rect, top, wall, sf);
  } else {
    // roof plant: an air-handling box and a stair housing, placed by the seed
    const u = hash2(seed, 1),
      v = hash2(seed, 2);
    p.box(
      BLOCK.plant,
      Math.min(2.2, w * 0.35),
      0.8,
      Math.min(1.4, d * 0.3),
      x0 + w * (0.25 + u * 0.2),
      top,
      cz - d * 0.15,
    );
    p.box(wall, Math.min(1.8, w * 0.3), 1.3, Math.min(1.6, d * 0.35), x0 + w * (0.65 + v * 0.1), top, cz + d * 0.12);
  }
  return out;
}

// a door: a glazed pair in a steel frame filling the ground floor's height under the fascia, a flat canopy
// over it on the fascia line, a granite step in front, a pale name plate on the pier beside it
// porch: a canopy on two slim posts at its outer corners (a front or staff door); else a short hood (a service door)
// canopy, platform: a front door (outdoor/block-style.js), which returns its canopy's span and front, for its name
function door(sets, f, { t, w, porch, canopy, platform }) {
  const { p, glass } = sets;
  const h = 2.0;
  if (canopy || platform) return frontDoor(sets, f, { t, w, canopy, platform });
  onFace(p, STEEL.dark, f, t - w / 2 - 0.06, t + w / 2 + 0.06, 0.08, h + 0.06, -0.1, -0.04);
  onFace(glass, BLOCK.glassLow, f, t - w / 2, t - 0.02, 0.08, h, -0.04, -0.01);
  onFace(glass, BLOCK.glassLow, f, t + 0.02, t + w / 2, 0.08, h, -0.04, -0.01);
  onFace(p, STEEL.mid, f, t - 0.03, t + 0.03, 0.08, h, -0.04, 0.0); // the meeting stiles
  onFace(p, BLOCK.plinth, f, t - w / 2 - 0.3, t + w / 2 + 0.3, 0, 0.08, 0, 0.6, { surf: 'concrete' }); // the step
  const [c0, c1, out] = porch ? [t - w / 2 - 0.45, t + w / 2 + 0.45, 1.15] : [t - w / 2 - 0.15, t + w / 2 + 0.15, 0.45];
  onFace(p, BLOCK.canopy, f, c0, c1, 2.12, 2.22, 0, out);
  onFace(p, BLOCK.fascia, f, c0, c1, 2.04, 2.12, out - 0.1, out); // its dark edge
  if (porch)
    for (const c of [c0 + 0.06, c1 - 0.06])
      onFace(p, STEEL.dark, f, c - 0.04, c + 0.04, 0, 2.04, out - 0.14, out - 0.06);
  onFace(p, BLOCK.plate, f, t + w / 2 + 0.22, t + w / 2 + 0.52, 1.25, 1.5, 0.02, 0.05, { cast: false });
  return null;
}
