// The bands past each outdoor place's exits (#260), what builds each and where, in the island frame
// ([x0, x1, z0, z1]); scenes/bands.js builds them (its header lists the builders). Rects of one band never overlap,
// and never cover what the place lays itself. Each place's bands stay small (game3d/test/unit/bands-build.test.mjs).
// The lawn at m6, south of the office street's own belts; bank planting is shared with campus.
const M6_LAWN = [[24.4, 31, -45.4, -41], 'keyaki,pine', 3.4];

export const BANDS = {
  east_coast: [
    // the dorm street's foot and the ramen corner, past the dorm row's west end
    {
      by: 'eastLane',
      rects: [
        [70.6, 76, -2, 30],
        [76, 84, 12, 30],
      ],
    },
    // the courts walk on west past the courts' gate, the north residence's door and its hedges
    { by: 'sportsGrounds', rects: [[84, 97.8, -62, -50]] },
    // the field between the dorm cluster and the courts walk, round dorm_6; then the lawn north of the courts (its own
    // band, so each is culled on its own)
    {
      by: 'lawn',
      seed: 310,
      belts: [
        [[90, 106.5, -30, -24.5], 'keyaki,sakura,maple', 3.6],
        [[92, 104, -44, -39.6], 'ginkgo,keyaki,sakura', 3.6],
        [[116, 118.2, -49, -34], 'sakura,pine', 3.4],
        [[106, 118, -55.4, -52.6], 'pine,maple,keyaki', 3.4],
      ],
    },
    { by: 'lawn', seed: 320, belts: [[[88, 100.8, -91, -86.4], 'pine,keyaki,maple', 3.6]] },
    // the boxes nearest the walks given ground floors and doors: the north residence's back on the field, dorm_6
    // facing the coast walk
    {
      by: 'fronts',
      blocks: [
        { id: 'housing_n', face: 's', ground: 'dorm', balconies: 's' },
        { id: 'dorm_6', face: 'e', ground: 'dorm', balconies: 'w' },
      ],
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
    { by: 'lawn', seed: 90, belts: [[[82, 94, 20.6, 25], 'pine,pine,sakura', 3.0]] },
  ],
  east_lane: [
    // the sports lane's corner with the north street and the lawns past it, past the north street's top
    { by: 'sportsGrounds', rects: [[56, 84, -62, -46.5]] },
    {
      by: 'fronts',
      blocks: [
        { id: 'dorm_5', face: 'e', ground: 'dorm', balconies: 'e' },
        { id: 'housing_n', face: 's', ground: 'dorm', balconies: 's' },
      ],
    },
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
    { by: 'lawn', seed: 350, belts: [[[50, 86, -99, -95.2], 'pine,keyaki,maple', 3.6]] },
    {
      by: 'fronts',
      blocks: [
        { id: 'dorm_5', face: 'e', ground: 'dorm', balconies: 'e' },
        { id: 'housing_n', face: 's', ground: 'dorm', balconies: 's' },
      ],
    },
  ],
  office_quarter: [
    { by: 'quarterGrounds', rects: [[-8, 13, -50.4, -19.25]] },
    { by: 'shedGarden', rects: [[-30, -4.4, -51.1, -28.2]] },
    // the lawns south of the office street, behind its own belts, between the bank, the print shop and m6
    {
      by: 'lawn',
      seed: 370,
      belts: [
        [[-22, -17, -45.4, -40.6], 'maple,sakura', 3.4],
        [...M6_LAWN, 384],
      ],
    },
  ],
};
