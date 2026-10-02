// The two ships moored in the harbour (harbour/plan.js), still, made of plain painted parts: the mainland ferry along
// the ferry pier's west face and the island's freighter along the supply pier's west face. In the island frame;
// each ship is laid out along its own length (u, from the stern) and across it (v, + to port), then turned and moved
// onto its berth with its bow to the south, out to sea.
//   the ferry: a white hull over a dark blue boot top with a teal band, a long two-tier white superstructure with
//   ribbon windows, the bridge forward with its wings out to the sides, a teal funnel aft with a white band, orange
//   lifeboats on the upper deck, rails along the decks, a mast with a radar bar; あまかわ AMAKAWA FERRY on the
//   superstructure's fore end over the bow, and a gangway down to the pier at the door amidships (both ships lie
//   with the pier on their port side)
//   the freighter: a dark green hull over a red-brown boot top, two hatch covers with a few containers on them and a
//   deck crane between, the white deckhouse aft with its bridge and a funnel
// After work their windows are lit (the block sets' lit mesh, outdoor/block.js).
import * as THREE from 'three';
import { STEEL, rod } from '../outdoor/furniture.js';
import * as P from './plan.js';

const FERRY = {
  hull: '#e8e8e4',
  boot: '#2f4357',
  band: '#2f7f86',
  deck: '#9ea4a6',
  house: '#eeeeea',
  glass: '#3a4a58',
  funnel: '#2f7f86',
  funnelTop: '#2c3036',
  boat: '#d0703a',
};
const FREIGHTER = {
  hull: '#3f5a4d',
  boot: '#7a4038',
  deck: '#7d7f7a',
  hatch: '#5c6f80',
  house: '#e6e5df',
  glass: '#3a4a58',
  funnel: '#3f5a4d',
  band: '#e6e5df',
  crane: '#c9a23f',
};
const LIT = '#ffd9a6';

// a hull's outline in (u, v): a square-ish stern with rounded corners, straight sides, the bow drawn to a point over
// the last `bow` of its length; `out` grows it all round (for a band laid over the hull)
function hullShape(L, B, bow, out = 0) {
  const h = B / 2 + out,
    s = new THREE.Shape();
  s.moveTo(-out, -h + 0.5);
  s.quadraticCurveTo(-out, -h, 0.6, -h);
  s.lineTo(L - bow, -h);
  s.quadraticCurveTo(L - bow * 0.25, -h, L + out, 0);
  s.quadraticCurveTo(L - bow * 0.25, h, L - bow, h);
  s.lineTo(0.6, h);
  s.quadraticCurveTo(-out, h, -out, h - 0.5);
  s.closePath();
  return s;
}
// the shape extruded from y0 up to y1, in the ship's own frame (x = u along, z = -v across)
function slab(shape, y0, y1) {
  return new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 5 })
    .rotateX(-Math.PI / 2)
    .translate(0, y0, 0);
}

// a ship's builder: parts put in the ship's frame (u along from the stern, y up, v across to port) land on its berth
// in the island frame: the stern at (x, z0), the bow toward +z
function berth(sets, x, z0) {
  const M = new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(x, 0, z0);
  const put = (set, color, g, o) => set.geo(color, g.applyMatrix4(M), o);
  return {
    geo: (color, g, o) => put(sets.p, color, g, o),
    glass: (color, g) => put(sets.glass, color, g),
    lit: (g) => put(sets.lit, LIT, g, { cast: false }),
    // a box from u0 to u1 along, v0 to v1 across, y0 to y1 up
    box(color, [u0, u1], [v0, v1], [y0, y1], set = 'p', o) {
      const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0).translate(
        (u0 + u1) / 2,
        (y0 + y1) / 2,
        -(v0 + v1) / 2,
      );
      put(sets[set], set === 'lit' ? LIT : color, g, set === 'lit' ? { cast: false } : o);
    },
    // a point of the ship's frame in the island frame
    at: (u, y, v) => new THREE.Vector3(u, y, -v).applyMatrix4(M).toArray(),
  };
}

// a rail along a deck edge: a top bar and posts every 1.2
function rail(s, [u0, u1], v, y) {
  s.box(STEEL.pale, [u0, u1], [v - 0.02, v + 0.02], [y + 0.5, y + 0.55], 'p', { cast: false });
  for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / Math.max(1, Math.round((u1 - u0) / 1.2)))
    s.box(STEEL.pale, [u - 0.02, u + 0.02], [v - 0.02, v + 0.02], [y, y + 0.5], 'p', { cast: false });
}
// a tier of the superstructure: a white box with a window band round its sides and ends, lit after work
function tier(s, color, [u0, u1], half, [y0, y1], glass, band = [0.42, 0.78]) {
  s.box(color, [u0, u1], [-half, half], [y0, y1]);
  const [g0, g1] = [y0 + (y1 - y0) * band[0], y0 + (y1 - y0) * band[1]];
  for (const v of [-half - 0.02, half + 0.02]) {
    s.box(glass, [u0 + 0.3, u1 - 0.3], [v - 0.015, v + 0.015], [g0, g1], 'glass');
    s.box(
      null,
      [u0 + 0.45, u1 - 0.45],
      [v - 0.025 * Math.sign(v), v + 0.025 * Math.sign(v)].sort((a, b) => a - b),
      [g0 + 0.05, g1 - 0.05],
      'lit',
    );
  }
  for (const u of [u0 - 0.02, u1 + 0.02])
    s.box(glass, [u - 0.015, u + 0.015], [-half + 0.3, half - 0.3], [g0, g1], 'glass');
}

// a gangway across the gap from a ship's door [x, y] down to the pier [x, y], 1 wide, centred on z: a sloped plank
// with a rail down each side
function gangway(p, [xa, ya], [xb, yb], z) {
  const len = Math.hypot(xb - xa, yb - ya),
    a = Math.atan2(yb - ya, xb - xa);
  p.geo('#8e9297', new THREE.BoxGeometry(len, 0.06, 1.0).rotateZ(a).translate((xa + xb) / 2, (ya + yb) / 2, z));
  for (const dz of [-0.48, 0.48]) rod(p, STEEL.pale, [xa, ya + 0.9, z + dz], [xb, yb + 0.9, z + dz], 0.025);
}
// mooring lines from a ship's bow and stern (us, along it) to the bitts on the pier's west edge level with them
function mooring(p, s, us, y, B, pier) {
  for (const u of us) {
    const a = s.at(u, y, B / 2 - 0.5),
      z = Math.min(pier[3] - 0.8, Math.max(pier[2] + 0.8, a[2] + (u > 5 ? 2.5 : -2.5)));
    rod(p, '#d9d6cc', a, [pier[0] + 0.45, 0.25, z], 0.03);
  }
}

// the ferry, along the ferry pier's west face
function* ferry(sets, signs) {
  const L = 26,
    B = 6.4,
    { SEA_Y } = P;
  const pier = P.FERRY_PIER,
    x = pier[0] - 0.55 - B / 2,
    z0 = pier[2] + 2.2;
  const s = berth(sets, x, z0),
    C = FERRY,
    DECK = 0.7;
  // the hull: the boot top to just over the water, the white above it, the teal band between, the deck on top
  s.geo(C.boot, slab(hullShape(L, B, 7), SEA_Y - 0.5, 0.0), { surf: 'paint' });
  s.geo(C.band, slab(hullShape(L, B, 7, 0.02), 0.0, 0.16), { surf: 'paint' });
  s.geo(C.hull, slab(hullShape(L, B, 7), 0.16, DECK + 0.35), { surf: 'paint' });
  s.geo(C.deck, slab(hullShape(L - 0.3, B - 0.4, 6.8), DECK + 0.35, DECK + 0.37), { cast: false });
  yield;
  // the superstructure: two tiers, the upper shorter, the bridge at the upper's fore end with its wings
  tier(s, C.house, [3, 18.5], B / 2 - 0.55, [DECK + 0.37, DECK + 2.1], C.glass);
  tier(s, C.house, [6, 17.2], B / 2 - 1.0, [DECK + 2.1, DECK + 3.6], C.glass);
  s.box(C.house, [16.2, 17.6], [-B / 2 + 0.1, B / 2 - 0.1], [DECK + 3.0, DECK + 3.75]); // the bridge and its wings
  s.box(C.glass, [17.6, 17.64], [-B / 2 + 0.6, B / 2 - 0.6], [DECK + 3.15, DECK + 3.6], 'glass');
  for (const v of [-B / 2 + 0.08, B / 2 - 0.08])
    s.box(C.glass, [16.4, 17.4], [v - 0.02, v + 0.02], [DECK + 3.15, DECK + 3.6], 'glass');
  s.box(C.house, [15.6, 17.4], [-1.2, 1.2], [DECK + 3.75, DECK + 3.85]); // the wheelhouse roof
  // the mast and its radar bar, the funnel aft
  s.geo(STEEL.pale, new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6).translate(16.4, DECK + 5.1, 0));
  s.box(STEEL.dark, [16.3, 16.5], [-0.8, 0.8], [DECK + 5.4, DECK + 5.48]);
  s.geo(C.funnel, new THREE.CylinderGeometry(0.7, 0.8, 1.9, 10).scale(1.4, 1, 1).translate(8.4, DECK + 4.55, 0), {
    surf: 'paint',
  });
  s.geo(C.house, new THREE.CylinderGeometry(0.72, 0.74, 0.3, 10).scale(1.4, 1, 1).translate(8.4, DECK + 4.6, 0));
  s.geo(C.funnelTop, new THREE.CylinderGeometry(0.66, 0.7, 0.18, 10).scale(1.4, 1, 1).translate(8.4, DECK + 5.55, 0));
  // the lifeboats either side of the upper tier, on davits
  for (const v of [-1, 1])
    for (const u of [9.8, 13.2]) {
      s.geo(
        C.boat,
        new THREE.CapsuleGeometry(0.42, 1.6, 3, 8)
          .rotateZ(Math.PI / 2)
          .scale(1, 0.75, 1)
          .translate(u, DECK + 2.55, -v * (B / 2 - 0.62)),
      );
      s.box(
        STEEL.pale,
        [u - 0.9, u - 0.84],
        [v * (B / 2 - 1.05), v * (B / 2 - 0.55)].sort((a, b) => a - b),
        [DECK + 2.1, DECK + 3.0],
        'p',
        { cast: false },
      );
      s.box(
        STEEL.pale,
        [u + 0.84, u + 0.9],
        [v * (B / 2 - 1.05), v * (B / 2 - 0.55)].sort((a, b) => a - b),
        [DECK + 2.1, DECK + 3.0],
        'p',
        { cast: false },
      );
    }
  yield;
  // rails: round the open decks fore and aft, along the upper tier's edges
  for (const v of [-B / 2 + 0.18, B / 2 - 0.18]) {
    rail(s, [0.6, 3], v, DECK + 0.37);
    rail(s, [18.5, L - 5.2], v * 0.9, DECK + 0.37);
    rail(s, [3.2, 18.3], v * 0.82, DECK + 2.1);
  }
  rail(s, [0.6, 0.62], 0, DECK + 0.37);
  // the fore deck's winch and bitts, the aft deck's
  s.box(STEEL.dark, [20.4, 21.4], [-0.7, 0.7], [DECK + 0.37, DECK + 0.85]);
  for (const [u, v] of [
    [22.5, 1.5],
    [22.5, -1.5],
    [1.4, 2.2],
    [1.4, -2.2],
  ])
    s.geo(STEEL.dark, new THREE.CylinderGeometry(0.14, 0.16, 0.4, 8).translate(u, DECK + 0.57, -v));
  // the name on the lower tier's fore end, under its windows, facing out over the bow
  signs.board('あまかわ', 'AMAKAWA FERRY', C.boot, 3.4, 0.55, s.at(18.53, DECK + 0.78, 0), 0);
  // the door in the lower tier amidships, the gangway from it down to the pier with its rails
  const GU = 12.4; // the door's middle, along
  s.box('#3b4048', [GU - 0.6, GU + 0.6], [B / 2 - 0.56, B / 2 - 0.53], [DECK + 0.4, DECK + 2.0]);
  gangway(sets.p, [x + B / 2 - 0.5, DECK + 0.4], [pier[0] + 1.2, 0.02], z0 + GU);
  mooring(sets.p, s, [24.6, 0.8], DECK + 0.6, B, pier);
  yield;
}

// the freighter, along the supply pier's west face
function* freighter(sets) {
  const L = 17,
    B = 5,
    { SEA_Y } = P;
  const pier = P.SUPPLY_PIER,
    x = pier[0] - 0.55 - B / 2,
    z0 = pier[2] + 2.4;
  const s = berth(sets, x, z0),
    C = FREIGHTER,
    DECK = 0.35;
  const TOP = DECK + 0.65;
  s.geo(C.boot, slab(hullShape(L, B, 4.5), SEA_Y - 0.5, -0.45), { surf: 'paint' });
  s.geo(C.hull, slab(hullShape(L, B, 4.5), -0.45, TOP), { surf: 'paint' });
  s.geo(C.deck, slab(hullShape(L - 0.3, B - 0.36, 4.3), TOP, TOP + 0.02), { cast: false });
  yield;
  for (const [u0, u1] of [
    [5.2, 8.6],
    [9.4, 12.8],
  ]) {
    s.box(C.hatch, [u0, u1], [-B / 2 + 0.6, B / 2 - 0.6], [TOP, TOP + 0.35]);
    for (let u = u0 + 0.85; u < u1; u += 0.85)
      s.box('#51637a', [u - 0.03, u + 0.03], [-B / 2 + 0.6, B / 2 - 0.6], [TOP + 0.35, TOP + 0.38], 'p', {
        cast: false,
      });
  }
  // a few containers on the after hatch
  for (const [u, v, c] of [
    [5.3, -0.85, '#3f6178'],
    [5.3, 0.85, '#8a4b44'],
  ])
    s.box(c, [u, u + 3.2], [v - 0.78, v + 0.78], [TOP + 0.35, TOP + 1.65]);
  // the deck crane between the hatches: a post, a house, a jib laid forward over the fore hatch
  s.geo(C.crane, new THREE.CylinderGeometry(0.22, 0.26, 2.2, 8).translate(9.0, TOP + 1.1, -1.2));
  s.box(C.crane, [8.6, 9.5], [0.75, 1.65], [TOP + 2.2, TOP + 2.9]);
  const jib = new THREE.BoxGeometry(5.2, 0.18, 0.22).rotateZ(-0.32).translate(11.4, TOP + 3.3, 1.2);
  s.geo(C.crane, jib);
  // the deckhouse aft: three white tiers, the bridge on top with its wings, the funnel behind it
  tier(s, C.house, [0.4, 4.4], B / 2 - 0.35, [TOP, TOP + 1.4], C.glass);
  tier(s, C.house, [0.8, 4.1], B / 2 - 0.65, [TOP + 1.4, TOP + 2.7], C.glass);
  s.box(C.house, [2.6, 4.2], [-B / 2 + 0.05, B / 2 - 0.05], [TOP + 2.7, TOP + 3.5]);
  s.box(C.glass, [4.2, 4.24], [-B / 2 + 0.4, B / 2 - 0.4], [TOP + 2.9, TOP + 3.3], 'glass');
  s.geo(C.funnel, new THREE.CylinderGeometry(0.45, 0.5, 1.6, 8).scale(1.3, 1, 1).translate(1.6, TOP + 3.5, 0), {
    surf: 'paint',
  });
  s.geo(C.band, new THREE.CylinderGeometry(0.47, 0.49, 0.26, 8).scale(1.3, 1, 1).translate(1.6, TOP + 3.6, 0));
  s.geo(STEEL.pale, new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6).translate(15.6, TOP + 1.1, 0)); // the foremast
  for (const v of [-B / 2 + 0.15, B / 2 - 0.15]) rail(s, [4.6, L - 4.6], v, TOP);
  mooring(sets.p, s, [15.8, 0.6], TOP + 0.2, B, pier);
  yield;
}

// sets: outdoor/block.js blockSets(); signs: a shop-signs.js signSet
export function* shipsSteps(sets, signs) {
  yield* ferry(sets, signs);
  yield* freighter(sets);
}
