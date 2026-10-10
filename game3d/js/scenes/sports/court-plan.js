// The tennis court Eric can walk on (the west one of the two, nearest the clubhouse), through the courts' gate off
// the courts walk: where it is, what stands round it, and the walk on it, in the island frame (x east, z south),
// moved into the sports chunk's own frame by plan.js pt() and rect(). sports/courts.js lays the courts themselves and
// court-side.js the bench, the ball basket and the display; places/sports.js walks it and frames it.
//
//   the court: a doubles court, its net across the middle (east-west), the run-off round it inside the fence
//   the gate: in the south fence on the gate walk's axis, its leaves standing open; inside it the run-off strip between
//   the two courts, walked north from the gate onto the west court
//   by the net's west post: the players' bench along the fence, the ball basket beside it, the score display on its
//   post facing the court
//   the floodlight masts on the run-off, the west court's lit after dark, the east court's left dark (#272)
import * as LAYOUT from '../island-layout.js';
import * as P from './plan.js';

const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];
export const COURTS = box(path('courts').rect);
const [X0, X1, Z0, Z1] = COURTS;
export const L = 15.8, // a doubles court, 23.8 by 11 m
  W = 7.3;
export const CZ = (Z0 + Z1) / 2;
export const CXS = [X0 + (X1 - X0) * 0.27, X0 + (X1 - X0) * 0.73]; // the two courts' middles
export const CX = CXS[0]; // the one walked: the west court
export const NET = { x0: CX - W / 2 - 0.3, x1: CX + W / 2 + 0.3, z: CZ };
export const GATE_X = (P.GATE_WALK[0] + P.GATE_WALK[1]) / 2;
// along the west fence by the net: the bench (its middle; seat along z, facing east), the basket, the display
export const BENCH = [X0 + 0.55, CZ + 2.2];
export const BENCH_LEN = 1.8;
export const BASKET = [X0 + 0.75, CZ + 3.9];
export const DISPLAY = [NET.x0 - 0.75, CZ - 0.6]; // on its post, facing east across the court

// Both courts and their run-off strips are walkable; each net is blocked.
// Sunday's singles/doubles players use the east court, reached from the south gate.
const STRIP_E = CXS[1] - W / 2 - 0.5;
// the floodlight masts (courts.js, kit lamp 'flood'), on the run-off a step in from the fence, level with each
// court's service lines: the west court lit from both its sides (its west run-off and the strip between the courts),
// the east court's two along its east side left dark ([x, z, face, lit])
const STRIP_MID = (CXS[0] + W / 2 + CXS[1] - W / 2) / 2;
export const MASTS = [-4.6, 4.6].flatMap((dz) => [
  [X0 + 0.32, CZ + dz, Math.PI / 2, true],
  [STRIP_MID, CZ + dz, -Math.PI / 2, true],
  [X1 - 0.32, CZ + dz, -Math.PI / 2, false],
]);
const I_WALKS = [
  [X0 + 0.15, X1 - 0.15, Z0 + 0.15, Z1 - 0.12],
  [GATE_X - 0.7, GATE_X + 0.7, Z1 - 0.3, Z1 + 0.4],
];
// what stands on it: the net (posts and band), the bench, the basket, the display's post, the gate's leaves
const I_BLOCKS = [
  [CXS[1] - W / 2 - 0.38, CXS[1] + W / 2 + 0.38, CZ - 0.08, CZ + 0.08],
  [NET.x0 - 0.08, NET.x1 + 0.08, NET.z - 0.08, NET.z + 0.08],
  [X0, BENCH[0] + 0.65, BENCH[1] - BENCH_LEN / 2 - 0.05, BENCH[1] + BENCH_LEN / 2 + 0.05],
  [BASKET[0] - 0.3, BASKET[0] + 0.3, BASKET[1] - 0.3, BASKET[1] + 0.3],
  [DISPLAY[0] - 0.2, DISPLAY[0] + 0.2, DISPLAY[1] - 0.15, DISPLAY[1] + 0.15],
  ...[-1, 1].map((s) => [GATE_X + s * 0.68 - 0.05, GATE_X + s * 0.68 + 0.05, Z1 - 0.75, Z1]), // the gate's open leaves
  ...MASTS.map(([x, z]) => [x - 0.25, x + 0.25, z - 0.25, z + 0.25]),
];
export const WALKS = I_WALKS.map(P.rect);
export const BLOCKS = I_BLOCKS.map(P.rect);
// the court's frame on screen: both baselines and both sidelines with a little round them (the camera keeps both
// sides of the net in view while he is on it), and where he counts as on it (past the gate's opening)
export const FRAME = P.rect([CX - W / 2 - 0.9, CX + W / 2 + 0.9, CZ - L / 2 - 1.1, CZ + L / 2 + 1.1]);
export const ON = P.rect([X0, STRIP_E, Z0, Z1 - 0.35]);
export const SPOTS = {
  court_gate: P.pt([GATE_X, Z1 - 1.2]),
  court_bench: P.pt([BENCH[0] + 1.3, BENCH[1]]),
  court_net: P.pt([CX, NET.z + 1.0]),
  court_baseline_s: P.pt([CX + 1.2, CZ + L / 2 + 0.8]),
  court_baseline_n: P.pt([CX - 1.2, CZ - L / 2 - 0.8]),
  court_display: P.pt([DISPLAY[0] + 0.7, DISPLAY[1]]),
  court_corner: P.pt([X0 + 0.75, Z0 + 0.75]), // a nook: the run-off's north-west corner, under the clubhouse's windows
};
export const SEAT = { at: BENCH, top: 0.34, ry: Math.PI / 2 };
