// The dorm quarter's buildings as the island layout's rows (scenes/island-layout.js ROWS: id, kind, storeys, floor
// height, wall, roof, windows, footprint [x0, z0, x1, z1]), from the plan (dorm-quarter/plan.js), so the far views,
// the map and the bands draw them where the quarter builds them.
import { BLOCKS, COMMONS, SHED, STOREY } from './plan.js';

const DORM_ROOF = '#555a63',
  ROOF = '#5d636c';
const L = ([x0, x1, z0, z1]) => [x0, z0, x1, z1];
export const QUARTER_ROWS = [
  ...BLOCKS.map((k) => [
    k.id,
    k.villa ? 'house' : 'dorm',
    k.storeys,
    k.villa ? 2 : STOREY,
    k.wall,
    DORM_ROOF,
    k.villa ? 'flat' : 'dorm',
    L(k.rect),
  ]),
  ['dorm_commons_hall', 'low', 1, 2.2, 3, ROOF, 'flat', L(COMMONS)],
  ['garden_shed', 'low', 1, 1.5, 3, ROOF, 'flat', L(SHED)],
];
export const QUARTER_DETAILS = {
  dorm_nw:
    'N-W, five storeys on the park’s north side: balconies over the park, open corridors and its door on the north path behind it.',
  dorm_ne: 'N-E’s five-storey back, its door and open corridors on the west, on a short walk off the north-south walk.',
  dorm_ne_4: 'N-E’s middle, four storeys, stepping down toward the sea: a terrace on its roof for the flats above.',
  dorm_ne_3: 'N-E’s sea end, three storeys, its balconies east over its hedged gardens to the sea.',
  dorm_se:
    'S-E’s east wing, five storeys, balconies east to the sea; its door in the angle with the south wing, off S-E’s court.',
  dorm_se_s:
    'S-E’s south wing, five storeys, balconies south over the villas’ roofs to the sea; open corridors on the court.',
  villa_w:
    'The west senior villa: two storeys and a roof pavilion, its door on the dorm row, a walled garden south to the sea.',
  villa_e: 'The east senior villa, the west one’s twin.',
  dorm_commons_hall:
    'The dorms’ common room, a one-storey pavilion in the park on the promenade, its glazed door on the promenade.',
  garden_shed: 'The residents’ tool shed in the allotments.',
};
