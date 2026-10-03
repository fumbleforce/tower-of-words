// The office row (office-quarter/plan.js BLOCKS): each block as the town's lower offices are built (outdoor/block.js,
// as head office's wing and the facilities office), its door a glazed pair under a deep canopy with the division's
// name standing on it, the kana large and the English small (shop-signs.js), shut on day 1 with a white 準備中 CLOSED
// card on the glass; nothing behind it. In the island frame:
//   the forecourts: the paved ground between a south face and the street, mid-grey slabs; on the deep ones a bed
//   against the face either side of the door, and a company bike rack at m2's and m3's outer ends
//   the walks north: Amakawa Foods' on the shed street's line, Amakawa Construction's between m3 and m5 into a paved
//   court before its door, pale slabs between kerbs
//   the bank: its door and its ATM corner on its east face, on the quarter street at the office street's corner; ATM
//   on a blue board over the corner's glass, which stays lit after work like the rest of the ground floor
// After work the ground floors, the doors' glass, the canopy lights and some windows above are lit.
// The sports ground builds the two blocks nearest the gym (m4, m5) with this as well (scenes/sports.js).
import * as THREE from 'three';
import { officeBlockSteps } from '../outdoor/block.js';
import { faceAt } from '../outdoor/block-face.js';
import { GRANITE } from '../outdoor/paving.js';
import { kerbRect } from '../outdoor/edges.js';
import { bikeRack } from '../outdoor/furniture.js';
import { shrubBed, bike } from '../dorm-court/cluster-yards.js';
import { walk } from '../plaza/east-lane.js';
import { TOWN } from '../town.js';
import * as P from './plan.js';

const SLABS = { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid };
const WALL = { w1: 0, m1: 2, m2: 3, m3: 0, m4: 1, m5: 2, b_h: 1 }; // the layout's walls (island-layout.js ROWS)

// the name standing on the canopy's front edge, a dark back behind it; the card on the right leaf's glass; the
// canopy's two downlights and their pool (the works' server hall has them too, works/buildings.js)
export function fittings(p, signs, lights, k, door) {
  const { f, t, canopy: c } = door,
    ry = Math.atan2(f.n[0], f.n[1]),
    [kana, en, colour] = k.sign;
  const at = (u, o, y) => {
    const [x, z] = faceAt(f, u, o);
    return [x, y, z];
  };
  const bw = Math.min(2.6, c.c1 - c.c0 - 0.2);
  signs.board(kana, en, colour, bw, 0.56, at(t, c.out - 0.14, 2.3 + 0.3), ry);
  const [bx, , bz] = at(t, c.out - 0.17, 0);
  p.box('#2c3b42', f.d[0] ? bw + 0.04 : 0.04, 0.6, f.d[0] ? 0.04 : bw + 0.04, bx, 2.3, bz);
  signs.card('準備中', 'CLOSED', 0.46, 0.3, at(t + 0.3, 0.012, 1.2), ry, { door: k.place });
  for (const s of [-1, 1]) {
    const [x, , z] = at(t + s * (c.c1 - c.c0) * 0.3, c.out * 0.5, 0);
    lights.glowParts.push(new THREE.BoxGeometry(0.26, 0.03, 0.26).translate(x, 2.18, z));
  }
  const [px, , pz] = at(t, 1.0, 0);
  lights.lit.push([px, pz, 1.3]);
}

// the bank's ATM corner: the bay at the face's north end, a blue board over it on the fascia
function atm(signs, k) {
  const ry = Math.atan2(k.F.n[0], k.F.n[1]),
    u = k.F.L - 0.8,
    [x, z] = faceAt(k.F, u, 0.1);
  signs.board('ATM', 'CASH CORNER', '#2f5f8a', 1.3, 0.42, [x, 2.24, z], ry);
}

// a forecourt: its slabs; on a deep one the beds either side of the door and the bike rack with its bikes
function forecourt(pv, p, { id, rect }) {
  pv.field(rect, { ...SLABS, origin: [rect[0], rect[2]] });
  for (const [i, b] of P.BEDS.entries())
    if (b[0] >= rect[0] - 0.01 && b[1] <= rect[1] + 0.01 && b[2] === rect[2]) shrubBed(p, b, 'swe', 71 + i);
  const r = P.RACKS.find((q) => q.id === id);
  if (r) bikeRack(p, r.a, r.b, { n: 4 }).forEach(([x, z], i) => i !== 2 && bike(p, x, z, 0, i + id.length));
}

// the walks north to m1's and m4's doors, and m4's court
function walks(pv, p, ids) {
  if (ids.includes('m1')) {
    walk(pv, P.FOODS_WALK, false);
    kerbRect(p, P.FOODS_WALK, { sides: 'we' });
  }
  if (ids.includes('m4')) {
    walk(pv, P.CON_WALK, false);
    kerbRect(p, P.CON_WALK, { sides: 'we' });
    pv.field(P.CON_COURT, {
      ...SLABS,
      origin: [P.CON_COURT[0], P.CON_COURT[2]],
    });
    kerbRect(p, P.CON_COURT, {
      sides: 'swe',
      gaps: { s: [[P.CON_WALK[0], P.CON_WALK[1]]] },
    });
  }
}

// one block with its door, the name on its canopy and the card on its glass: k as plan.js BLOCKS ({ id, rect, row,
// face, door, w, seed, sign }, and wall, a colour, where the layout's own isn't wanted); the harbour builds its
// terminal and its office with it too (scenes/harbour/fronts.js)
export function* frontSteps(sets, signs, lights, k, { gf } = {}) {
  const { doors } = yield* officeBlockSteps(sets, k.rect, {
    storeys: k.row.storeys,
    fh: k.row.floorH,
    gf,
    wall: k.wall ?? TOWN.walls[WALL[k.id]],
    doors: [
      {
        face: k.face,
        at: k.door[k.face === 's' || k.face === 'n' ? 0 : 1],
        w: k.w,
        canopy: { out: 1.3, side: 0.7 },
      },
    ],
    seed: k.seed,
  });
  fittings(sets.p, signs, lights, k, doors[0]);
}

// sets: outdoor/block.js blockSets() (the caller builds them: buildBlockSets); pv, p: a paver and a Parts collector
// (or cells') for the ground; signs: a shop-signs.js signSet; lights: a lightSet; ids: which blocks (default all)
export function* rowSteps(sets, pv, p, signs, lights, ids = P.BLOCK_IDS) {
  for (const k of P.BLOCKS.filter((b) => ids.includes(b.id))) {
    yield* frontSteps(sets, signs, lights, k);
    if (k.id === 'b_h') atm(signs, k);
    const fc = P.FORECOURTS.find((q) => q.id === k.id);
    if (fc) forecourt(pv, p, fc);
    yield;
  }
  walks(pv, p, ids);
}
