// The onsen path and the courts walk's ends (east-coast/plan.js), with what lies along them, in the island frame
// (the dorm quarter's own walks and their furniture are dorm-quarter/):
//   the walks: pale slabs on the grid, the stones' joints running on round the corners; kerbs on their open sides
//   (the coast kit lays them, outdoor/coast.js)
//   post lamps along the courts walk's east end and the onsen path's outer edge; a finger sign where the north-south
//   walk meets the courts walk and one where the onsen path turns east, pointing to the onsen
//   the onsen's grounds: a wood of pines and maples south of the onsen path, kept back from it by a band of layered
//   planting, and a belt of trees between the path and the precinct wall
//   the tennis courts west of the onsen path (sports/courts.js, shared with the sports chunk)
// Built into cells along z (dorm-court/cells.js), so the camera culls what it can't see.
import { GRANITE } from '../outdoor/paving.js';
import { pine, keyaki, maple, ginkgo } from '../outdoor/planting.js';
import { lamps, fingerSign } from '../outdoor/furniture.js';
import { drift } from '../forecourt/gardens.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { courts } from '../sports/courts.js';
import * as P from './plan.js';

export const Z_CUTS = [-72, -56, -40, -24, -8, 8];

// a line path's legs paved in one grid, each leg less the corner square the leg before it laid
function pave(pv, legs, line) {
  legs.forEach((r, i) => {
    const q = [...r];
    if (i) {
      const [x0, z0] = line[i],
        [x1, z1] = line[i + 1],
        w = r[1] - r[0] < r[3] - r[2] ? r[1] - r[0] : r[3] - r[2];
      if (x1 > x0) q[0] += w;
      else if (x1 < x0) q[1] -= w;
      else if (z1 > z0) q[2] += w;
      else q[3] -= w;
    }
    pv.field(q, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [0, 0], h: 0.006 });
  });
}

// the walks for the coast kit's kerbs, as its rects [x0, z0, x1, z1]: the onsen path open to the courts walk at its
// foot, the stone walk inside the gate open to the porch
export function kerbWalks() {
  const kit = ([x0, x1, z0, z1]) => [x0, z0, x1, z1];
  const all = P.ONSEN_LEGS.map((r, i) => ({ rect: kit(r), ...(i === 0 && { open: 's' }) }));
  all.push({ rect: kit(P.COURTS_STUB), open: 'we' }); // on west as the sports chunk's courts walk, east as the quarter's
  const g = P.GATE.w / 2 - 0.25;
  all.push({ rect: kit([P.GX - g, P.GX + g, P.WALL_Z - 0.4, P.ONSEN_LEGS[1][2] + 0.01]), open: 'n' });
  return Object.fromEntries(all.map((w, i) => [`w${i}`, w]));
}

export function* walkSteps(c, lights, signRoot, signs) {
  const { parts: p, paver: pv } = c;
  pave(pv, P.ONSEN_LEGS, P.ONSEN_PATH.line);
  const cs = P.COURTS_STUB; // the courts walk's end, in its grid (the sports chunk's)
  pv.field([cs[0], P.ONSEN_LEGS[0][0], cs[2], cs[3]], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.pale,
    origin: [0, 0],
  });
  yield;
  const [N3, E3] = P.ONSEN_LEGS;
  lamps(lights, p, P.LAMPS, { pool: 1.3 });
  fingerSign(signRoot, p, ...P.SIGNS.courts, [{ text: 'Onsen', sub: '温泉', dir: -1 }]);
  fingerSign(signRoot, p, ...P.SIGNS.corner, [{ text: 'Onsen', sub: '温泉', dir: 1 }]);
  yield;
  // the onsen's grounds: the wood south of the onsen path behind a band of layered planting, and the trees between
  // the path and the precinct wall
  drift(p, [N3[1] + 0.6, E3[1] + 6, E3[3] + 0.4, E3[3] + 3.6], { back: 's', seed: 136 });
  yield* belt(p, [N3[1] + 0.8, 131, E3[3] + 4.4, -61.6], [pine, maple, keyaki, pine], { seed: 140, pitch: 3.2 });
  yield* belt(p, [N3[1] + 0.6, P.COURT[0] - 0.6, P.PRECINCT[2], E3[2] - 0.6], [maple, pine, ginkgo], { seed: 144 });
  yield;
  courts(p, signs); // shared with the sports chunk (sports/courts.js)
}
