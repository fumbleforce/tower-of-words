// The bands past each outdoor place's exits (#260), what builds each and where, in the island frame
// ([x0, x1, z0, z1]); scenes/bands.js builds them (its header lists the builders). Rects of one band never overlap,
// and never cover what the place lays itself. Each place's bands stay small (game3d/test/unit/bands-build.test.mjs).
import { CHUNKS } from './island-chunks.js';
import { LANE as PLAZA_LANE, STOP, TERRACE, FOOTPATH } from './plaza/plan.js';

// The fountain plaza seen down the lane from a neighbour (#658), from x0 to x1 in the plaza's frame, between the
// canteen's front and the footpath behind the shops. The neighbour lays the lane itself over [l0, l1] (its brick
// runs in under the circle's border ring and its planting stops at the plaza's verges), so that strip stays out.
function plazaView(x0, x1, [l0, l1]) {
  const [px, pz] = CHUNKS.plaza.at,
    [z0, z1] = [TERRACE[2], FOOTPATH[2]],
    [lz0, lz1] = PLAZA_LANE.w.slice(2);
  const rects = [
    [x0, l0, z0, z1],
    [l0, l1, z0, lz0],
    [l0, l1, lz1, z1],
    [l1, x1, z0, z1],
  ].filter((r) => r[1] - r[0] > 0.01);
  return { by: 'fountainPlaza', rects: rects.map(([a, b, c, d]) => [a + px, b + px, c + pz, d + pz]) };
}

// The lawn east of m6, south of the office street's own belts; bank planting is shared with campus.
const M6_LAWN = [[24.4, 31, -45.4, -41], 'keyaki,pine', 3.4];

export const BANDS = {
  // the plaza at the lane's end, past the gateposts, on to the jog (forecourt/plan.js stops the lane's planting there)
  forecourt: [plazaView(-STOP, PLAZA_LANE.e[1], [-STOP, PLAZA_LANE.w[1]])],
  dorm_court: [
    // The pocket park and its actual shop fronts across the courtyard's gate.
    // Stop at the street's western curb so the courtyard keeps ownership of its lane.
    {
      by: 'eastLane',
      rects: [
        [54, 73.04, -30, 10.4],
        [73.04, 77, 14.7, 22.4],
      ],
      skip: ['r9'],
    },
  ],
  east_coast: [
    // the dorm street's foot and the ramen corner, past the dorm row's west end
    {
      by: 'eastLane',
      rects: [
        [70.6, 76, -14, 30],
        [76, 84, 12, 30],
      ],
    },
    // the courts walk on west past the courts' gate, its hedges and the orchard's
    { by: 'sportsGrounds', rects: [[79, 97.8, -62, -56.2]] },
    // the lawn north of the courts
    {
      by: 'lawn',
      seed: 320,
      belts: [[[88, 100.8, -91, -86.4], 'pine,keyaki,maple', 3.6]],
    },
  ],
  shotengai: [
    // the dorm street north of the shop walk and the ramen corner, past the east mouth
    {
      by: 'eastLane',
      rects: [
        [66.4, 90, -2, 10.4],
        [76, 90, 10.4, 30],
        [73, 76, 22.4, 30],
      ],
      skip: ['izakaya', 'ramen'],
    },
    // the dorm cluster's belt of pines south of the row's garden, as dorm-court/cluster-yards.js plants it
    {
      by: 'lawn',
      seed: 90,
      belts: [[[82, 94, 20.6, 25], 'pine,pine,sakura', 3.0]],
    },
  ],
  east_lane: [
    // the plaza west along the lane: its circle, fountain and ring, and the lane on west past it
    plazaView(-20, STOP, [PLAZA_LANE.e[0], STOP]),
    // the sports lane's corner with the north street and the lawns past it, past the north street's top
    { by: 'sportsGrounds', rects: [[56, 84, -62, -46.5]] },
  ],
  sports: [
    // past the sports lane's west end: the office street's lawns south of it, as the office quarter plants them
    { by: 'officeLawns', rects: [[14, 36, -52.4, -40]] },
    { by: 'lawn', seed: 380, belts: [M6_LAWN] },
    // the north street south of the back lane, with r9's front, past the north street's foot
    {
      by: 'eastLane',
      rects: [
        [67.8, 82, -33, -12],
        [62, 67.8, -30, -12],
      ],
      skip: ['r3', 'block_e3'],
    },
    // the onsen path north from the courts walk's end, and its woods
    { by: 'coastWalk', rects: [[102, 113, -84, -50]] },
    // north of the pool's pavilion and the courts' hall
    {
      by: 'lawn',
      seed: 350,
      belts: [[[50, 86, -99, -95.2], 'pine,keyaki,maple', 3.6]],
    },
    // the dorm quarter's orchard and allotments behind the courts walk's hedge
    { by: 'dormQuarter', rects: [[79, 104, -56.3, -41.6]] },
  ],
  campus: [
    // past the service lane's closed gate: the canteen's loading yard, m6's walk, and the trees west of the yard on
    // the lawn south of the lane
    {
      by: 'canteenYard',
      rects: [
        [15.79, 30, -39.1, -23.5],
        [9.5, 15.79, -30, -21.5],
      ],
    },
    // m6 over the yard, its office door on its walk
    { by: 'fronts', blocks: [{ id: 'm6', face: 's', ground: 'office' }] },
    // the coast walk on south past the shed's north end, as the shop street's coast builds it
    { by: 'westCoast', rects: [[-50, -32.6, -25.4, -4]], pave: ['coast_path'] },
    // the office street past the quarter and shed streets' north mouths, with its verge on this side
    { by: 'officeStreet', rects: [[-38, 26, -60, -51.2]] },
    // the office row across the street from the mouths and the coast lawn, and m1 at the head of the Foods walk
    { by: 'officeRow', ids: ['w1', 'm1', 'm2', 'm3'] },
    // the office street's southern belts, as the office quarter plants them: west of the print shop's border, and
    // east of the quarter street
    {
      by: 'officeLawns',
      rects: [
        [-44, -24.6, -51.2, -45.5],
        [7, 31, -51.2, -45.5],
      ],
    },
    // nobody's lawns: pines along the sea wall west of the coast walk; a wood west of m6 behind the quarter street's
    // strip; the trees east of m6
    {
      by: 'lawn',
      seed: 410,
      belts: [
        [[-54.6, -51.6, -45, -26.5], 'pine,pine,sakura', 3.2],
        [[8.6, 12.6, -44.6, -34.4], 'ginkgo,keyaki,sakura', 3.3],
        [...M6_LAWN, 384], // as the office street sees it
      ],
    },
  ],
  office_quarter: [
    { by: 'quarterGrounds', rects: [[-8, 13, -50.4, -19.25]] },
    { by: 'shedGarden', rects: [[-30, -4.4, -51.1, -28.2]] },
    // the lawn east of m6, behind the office street's own belts (the campus's lawns are its shedGarden)
    { by: 'lawn', seed: 370, belts: [[...M6_LAWN, 384]] },
  ],
};
