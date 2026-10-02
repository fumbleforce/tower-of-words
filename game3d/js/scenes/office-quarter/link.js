// The gym's corner (office-quarter/plan.js): where the sports lane's west end turns north by gym_link into the office
// street's east end. Both chunks that walk it lay it with this, so the walk across their edge crosses the same
// ground: the sports ground (scenes/sports.js) and the office quarter (scenes/office-quarter.js). In the island frame:
//   the lane's west end and the street's east end are turns of herringbone brick closed on their outer sides
//   (plaza/east-lane.js corner), gym_link the lane's brick between them; the lane's brick east to LINK_E, the
//   street's west to the stub's end, both running on from the plaza's lane
//   the verges: on the street's south side, down gym_link's west side and along the lane's south side (a kerb,
//   ground cover and a low hedge, no trees, so nothing stands between Eric and the camera), post lamps behind them
//   gravel against the gym's west wall; a clipped hedge along the street's north kerb, and behind it a wood of
//   cherries, maples and a zelkova on the lawn between the offices and the gym
//   a finger sign at the street's corner: Offices 事務所 and Bank 銀行 west, Pool プール east
import { laneField, verge } from '../outdoor/lane.js';
import { kerb } from '../outdoor/edges.js';
import { hedge, gravel, sakura, maple, keyaki } from '../outdoor/planting.js';
import { lamps, fingerSign } from '../outdoor/furniture.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { corner } from '../plaza/east-lane.js';
import { LANE as PLAZA_LANE } from '../plaza/plan.js';
import * as LAYOUT from '../island-layout.js';
import * as P from './plan.js';

const PLAZA = LAYOUT.CHUNKS.plaza.at;
export const ORIGIN = [PLAZA_LANE.e[0] + PLAZA[0], PLAZA_LANE.e[2] + PLAZA[1]]; // the lane's brick runs on from the plaza's
export const PAVE_W = P.STUB_X - 1.5; // the street's brick west of here is the office quarter's own (grounds.js)
const { STREET: S, LINK: L, LANE, GYM, LINK_E } = P;
const V = 1.1; // a verge's depth

function* paving(pv) {
  corner(pv, P.LANE_TURN, 'sw');
  laneField(pv, [L[0], L[1], S[3], LANE[2]], { along: 'z', origin: ORIGIN });
  corner(pv, P.STREET_TURN, 'ne');
  laneField(pv, [PAVE_W, L[0], S[2], S[3]], { origin: ORIGIN });
  laneField(pv, [L[1], LINK_E, LANE[2], LANE[3]], { origin: ORIGIN });
  yield;
}

function* edges(p, lights, signRoot) {
  // the outer kerbs: the street's north side, the corner's east side, gym_link's east side, the lane's north side
  kerb(p, [PAVE_W, S[2]], [L[1], S[2]], { off: -0.08 });
  kerb(p, [L[1], S[2]], [L[1], LANE[2]], { off: 0.08 });
  kerb(p, [L[1], LANE[2]], [LINK_E, LANE[2]], { off: -0.08 });
  // the verges: the street's south side to the corner, gym_link's west side down to the lane, the lane's south side
  verge(p, [PAVE_W, S[3]], [L[0] - V, S[3]], 's', { seed: 61 });
  kerb(p, [L[0] - V, S[3]], [L[0], S[3]], { off: 0.08 });
  verge(p, [L[0], S[3]], [L[0], LANE[3]], 'w', { seed: 63 });
  verge(p, [L[0] - V, LANE[3]], [LINK_E, LANE[3]], 's', { seed: 65 });
  // their pools on the paving they light, not the lawn behind the verge
  const [street, link, lane] = P.LINK_LAMPS;
  lamps(lights, p, [street, lane], { pool: 1.2, poolShift: [0, -0.6] });
  lamps(lights, p, [link], { pool: 1.2, poolShift: [0.6, 0] });
  yield;
  // gravel against the gym's west wall, along the corner and gym_link; the hedge on the street's north side
  gravel(p, [L[1] + 0.08, GYM[0] + 0.3, S[2] + 0.1, LANE[2] - 0.08]);
  hedge(p, [PAVE_W + 0.5, S[2] - 0.55], [GYM[0] - 0.5, S[2] - 0.55], {
    w: 0.5,
    h: 0.55,
    seed: 67,
  });
  fingerSign(signRoot, p, ...P.SIGNS.corner, [
    { text: 'Offices', sub: '事務所', dir: -1 },
    { text: 'Bank', sub: '銀行', dir: -1 },
    { text: 'Pool', sub: 'プール', dir: 1 },
  ]);
  yield;
  // the wood between the offices and the gym, north of the street
  yield* belt(
    p,
    [P.block('m5').rect[1] + 1.2, GYM[0] - 1.2, P.block('m4').rect[2] + 1, S[2] - 1.6],
    [sakura, maple, keyaki],
    {
      seed: 69,
      pitch: 3.2,
    },
  );
}

// pv: a paver; p: a Parts collector (or cells' parts); lights: a lightSet; signRoot: the group the finger sign's
// boards go in
export function* linkSteps(pv, p, lights, signRoot) {
  yield* paving(pv);
  yield* edges(p, lights, signRoot);
}
