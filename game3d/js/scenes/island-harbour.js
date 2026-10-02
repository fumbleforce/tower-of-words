// The harbour (docs/game/island.md, "Harbour"), in the island frame: scenes/island-layout.js spreads the paths into
// PATHS and takes the coast into COAST; the harbour chunk builds them (scenes/harbour.js). The walks, the yard, the
// landing and the piers moved here from the day-2 plan (island-plan.js) when the chunk was built, squared up so the
// landing and the yard meet along a side and the ferry pier runs south from the landing's corner, as the island map
// draws them.
//
//   the coast: rocks from the half's north edge down to the landing's north-west corner; then the quays (vertical
//   concrete walls), down the landing's west side, east along its south side, south down the yard's west side and
//   east along its south side; then rocks again round to the sea wall west of the station (island-west.js)
//   the piers stand on piles over the water, so they are paths, not land
import { smooth } from './island-west.js';

const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

// the quays' corners, north-west to south-east: the landing's west side, its south side, the yard's west side, its
// south side (the sea is on the right, as COAST.line runs)
export const QUAY_LINE = pairs([-126, -100, -126, -88, -100, -88, -100, -52.5, -66, -52.5]);
// the rocky shore north-west of the landing, from the half's edge (island-plan.js HALF_EDGE) to the quay
export const ROCKS_NW = smooth(pairs([-154, -134, -151, -122, -144, -111, -135, -104.5, -129, -101.2, -126, -100]), 2);
// the rocky shore from the yard's south-east corner round to where the sea wall west of the station begins
// (island-west.js WEST_COAST's first point, left off here)
export const ROCKS_SE = smooth(pairs([-66, -52.5, -62.4, -50.6, -59.6, -45, -57.8, -39, -56.8, -32.9]), 2).slice(0, -1);
export const HARBOUR_COAST = [...ROCKS_NW.slice(0, -1), ...QUAY_LINE.slice(0, -1), ...ROCKS_SE];

// the walks, the yard, the landing and the piers, [x0, z0, x1, z1]
export const HARBOUR_PATHS = [
  {
    id: 'harbour_walk',
    kind: 'walk',
    rect: [-42.6, -52.5, -40.6, -27.4],
    detail: 'The west coast walk (coast_path) carried north to the office street, inland of the rocks.',
  },
  {
    id: 'supply_yard',
    kind: 'court',
    rect: [-100, -98, -62, -52.5],
    detail:
      'The supply quay’s concrete yard at the office street’s west end: the warehouse, the foreman’s hut, containers and the crane; quays on its west and south sides, the harbour office’s door on its north edge.',
  },
  {
    id: 'supply_pier',
    kind: 'pier',
    rect: [-97, -52.5, -90, -32],
    detail: 'The supply pier, south off the yard’s south quay, the freighter alongside its west face.',
  },
  {
    id: 'ferry_landing',
    kind: 'court',
    rect: [-126, -100, -100, -88],
    detail: 'The ferry landing in front of the terminal, west of the yard, a quay on its west and south sides.',
  },
  {
    id: 'ferry_pier',
    kind: 'pier',
    rect: [-126, -88, -120, -58],
    detail: 'The ferry pier, south from the landing’s south-west corner, the ferry alongside its west face.',
  },
];
