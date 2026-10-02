// The east coast walk and the onsen path (east-coast/plan.js), with what lies along them, in the island frame:
//   the walks: pale slabs on the grid, the stones' joints running on round the corners; kerbs on their open sides
//   (the coast kit lays them, outdoor/coast.js)
//   along the coast: post lamps on the landward edge, two bays with a bench looking over the walk to the sea, a
//   finger sign by the terrace pointing up the coast to the onsen and one where the onsen path turns east; black
//   pines on the land above the coast's wall, a grove of cherries on the lawn behind dorm_4 and dorm_6, pines and
//   zelkovas where the walk turns inland, a clipped hedge along the north residence's back
//   the onsen's grounds: a wood of pines and maples south of the onsen path, kept back from it by a band of layered
//   planting, and a belt of trees between the path and the precinct wall
//   the tennis courts west of the onsen path (sports/courts.js, shared with the sports chunk)
// Built into cells along z (dorm-court/cells.js), so the camera culls what it can't see.
import { GRANITE } from '../outdoor/paving.js';
import { hedge, pine, keyaki, sakura, maple, ginkgo } from '../outdoor/planting.js';
import { lamps, bench, fingerSign } from '../outdoor/furniture.js';
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
    pv.field(q, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [0, 0] });
  });
}

// the walks for the coast kit's kerbs, as its rects [x0, z0, x1, z1]: the first leg is open to the terrace, the
// stone walk inside the gate open to the porch
export function kerbWalks() {
  const kit = ([x0, x1, z0, z1]) => [x0, z0, x1, z1];
  const all = [...P.COAST_LEGS, ...P.ONSEN_LEGS].map((r, i) => ({ rect: kit(r), ...(i === 0 && { open: 'w' }) }));
  all.push({ rect: kit(P.COURTS_STUB), open: 'w' }); // on west as the sports chunk's courts walk
  const g = P.GATE.w / 2 - 0.25;
  all.push({ rect: kit([P.GX - g, P.GX + g, P.WALL_Z - 0.4, P.ONSEN_LEGS[1][2] + 0.01]), open: 'n' });
  return Object.fromEntries(all.map((w, i) => [`w${i}`, w]));
}

export function* walkSteps(c, lights, signRoot, signs) {
  const { parts: p, paver: pv } = c;
  pave(pv, P.COAST_LEGS, P.COAST_WALK.line);
  pave(pv, P.ONSEN_LEGS, P.ONSEN_PATH.line);
  const cs = P.COURTS_STUB; // the courts walk's end, in its grid (the sports chunk's)
  pv.field([cs[0], P.ONSEN_LEGS[0][0], cs[2], cs[3]], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.pale,
    origin: [0, 0],
  });
  yield;
  const [, N1, W1, N2, W2] = P.COAST_LEGS, // the first leg is the link off the terrace
    [N3, E3] = P.ONSEN_LEGS;
  // the bays, paved as the walk, a bench in each facing east over it
  for (const b of P.BAYS) {
    pv.field(b, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [0, 0] });
    bench(p, b[0] + 0.55, (b[2] + b[3]) / 2, Math.PI / 2, { len: 1.4 });
  }
  lamps(lights, p, P.LAMPS, { pool: 1.3 });
  fingerSign(signRoot, p, ...P.SIGNS.terrace, [{ text: 'Onsen', sub: '温泉', dir: 1 }]);
  fingerSign(signRoot, p, ...P.SIGNS.corner, [{ text: 'Onsen', sub: '温泉', dir: 1 }]);
  yield;
  // along the coast: pines on the land above the wall, the cherries behind the dorms, the wood where the walk turns
  // inland (all a few steps off the walk, so nothing stands between him and the camera)
  yield* belt(p, [N1[1] + 1.2, 134.6, -34, -21], [pine, pine, keyaki], { seed: 120, pitch: 3.4 });
  yield* belt(p, [117.5, N1[0] - 1.6, W1[3] + 4.5, -22], [sakura, sakura, maple], { seed: 124, pitch: 3.4 });
  yield* belt(p, [N2[1] + 1.2, 128, W2[2] + 2.4, W1[2] - 1.2], [pine, keyaki, pine], { seed: 128, pitch: 2.8 });
  hedge(p, [W2[0] + 2.5, W2[3] + 0.7], [N2[0], W2[3] + 0.7], { w: 0.5, h: 0.6, seed: 132 });
  yield;
  // the onsen's grounds: the wood south of the onsen path behind a band of layered planting, and the trees between
  // the path and the precinct wall
  drift(p, [N3[1] + 0.6, E3[1] + 6, E3[3] + 0.4, E3[3] + 3.6], { back: 's', seed: 136 });
  yield* belt(p, [N3[1] + 0.8, 131, E3[3] + 4.4, W2[2] - 1.4], [pine, maple, keyaki, pine], { seed: 140, pitch: 3.2 });
  yield* belt(p, [N3[1] + 0.6, P.COURT[0] - 0.6, P.PRECINCT[2], E3[2] - 0.6], [maple, pine, ginkgo], { seed: 144 });
  yield;
  courts(p, signs); // shared with the sports chunk (sports/courts.js)
}
