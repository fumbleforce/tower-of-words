// The shop street's side walks and the alleys' beds, for the seafront (outdoor/seafront.js), in the place's frame
// through its R (an island rect [x0, z0, x1, z1] as [x0, x1, z0, z1]) and at (an island point):
//   alleyWalks(pv, course, R, BW)   the walks down the arcade's mouths and through the alleys, pale slabs between
//                                   soldier borders BW wide; the landing to the clothes shop's side door
//   alleyBeds(p, R, at)             the beds either side of each alley with their kerbs and shrubs (yields per alley)
import { GRANITE } from './paving.js';
import { kerb } from './edges.js';
import { bed, cluster } from './planting.js';
import * as S from '../island-south.js';

const { ALLEYS, LINKS, BAYS, SIDE_DOOR } = S;
const K = 0.14; // the alleys' kerbs

export function alleyWalks(pv, course, R, BW) {
  for (const w of [LINKS.west, LINKS.east, ...ALLEYS]) {
    const [x0, x1, z0, z1] = R(w);
    pv.field([x0, x1, z0, z1], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [x0, z0] });
    for (const x of [x0, x1 - BW]) course([x, x + BW, z0, z1], [BW, 0.15], GRANITE.edge);
  }
  // the landing through the middle alley's west bed to the side door, in the alley's slabs, a border along each
  // side; it stops a hair short of the wall
  const [lx0, lx1, lz0, lz1] = R(SIDE_DOOR.landing);
  pv.field([lx0 + 0.03, lx1, lz0, lz1], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.pale,
    origin: [lx0, lz0],
  });
  for (const z of [lz0, lz1 - BW]) course([lx0 + 0.03, lx1, z, z + BW], [0.15, BW], GRANITE.edge);
}

// the beds between each alley's walk and the next building, kerbed on the walk's side; the middle alley's west bed in
// two, either side of the side door's landing, with a kerb along each of the landing's sides that meets the alley's
// kerb end to end, so no two top stones lie over each other
export function* alleyBeds(p, R, at) {
  const [lx0, lx1, lz0, lz1] = R(SIDE_DOOR.landing);
  for (const w of ALLEYS) {
    const [x0, x1, z0, z1] = R(w),
      gap = BAYS.w / 2 - 1,
      cut = Math.abs(lx1 - x0) < 0.01;
    const spans = cut
      ? [
          [z0 + 0.1, lz0 - K - 0.03],
          [lz1 + K + 0.03, z1 - 0.1],
        ]
      : [[z0 + 0.1, z1 - 0.1]];
    for (const [a, b] of spans) bed(p, [x0 - gap + 0.05, x0 - 0.05, a, b], { y: 0.08 });
    bed(p, [x1 + 0.05, x1 + gap - 0.05, z0 + 0.1, z1 - 0.1], { y: 0.08 });
    kerb(p, [x0, z0], [x0, z1], { w: K, gaps: cut ? [[lz0 - K, lz1 + K]] : [] });
    kerb(p, [x1, z0], [x1, z1], { w: K });
    if (cut) for (const z of [lz0 - K / 2, lz1 + K / 2]) kerb(p, [lx0 + 0.03, z], [x0 + K / 2, z], { w: K });
    S.SOUTH_SHRUBS.forEach(([sx, sz, s = 1], i) => {
      const [lx, lz] = at(sx, sz);
      if (lx < x0 - gap || lx > x1 + gap || lz < z0 || lz > z1) return; // this alley's beds only
      cluster(p, lx, lz, { n: 3, r: 0.3 * s, spread: 0.4 * s, seed: 30 + i, y: 0.08 });
    });
    yield;
  }
}
