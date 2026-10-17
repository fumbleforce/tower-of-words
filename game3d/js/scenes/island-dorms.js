// The dorm quarter's paths, green and sand for the island layout (scenes/island-layout.js spreads them into PATHS,
// GREEN and SAND), from its plan (dorm-quarter/plan.js, the one home of its geometry). The map, the skyline's ground
// in the far views and the shared landscape builder all read these. The southern coastal garden's loop south of the
// villas keeps its own footprints (COAST_GARDEN), walked in east_coast.
import * as Q from './dorm-quarter/plan.js';
import { LOOP_RECTS } from './dorm-quarter/fittings.js';

export const COAST_GARDEN = {
  pergola: [86.1, 92.8, 16.6, 19.6],
  entry: [88.7, 90.2, 12, 16.6],
  paths: [
    [92.8, 95.7, 17, 18.8],
    [93.9, 95.7, 18.8, 24.8],
    [95.7, 117, 23, 24.8],
    [117, 118.8, 12, 24.8],
    [104, 111, 24.8, 28.8],
  ],
  lawns: [[96.3, 104, 24.8, 28.8]],
  benches: [
    [105.1, 27.7, 0],
    [109.9, 27.7, 0],
  ],
  lamps: [
    [95.35, 20.6],
    [102.3, 23.3],
    [111.9, 24.5],
    [118.45, 18.6],
  ],
  stones: [
    [97.8, 26.7, 0.16],
    [99.1, 26.7, 0.28],
    [100.4, 26.7, 0.42],
    [101.7, 26.7, 0.28],
    [103, 26.7, 0.16],
  ],
};
// a plan rect [x0, x1, z0, z1] as the layout's [x0, z0, x1, z1]
const L = ([x0, x1, z0, z1]) => [x0, z0, x1, z1];
const p = (id, kind, r, detail) => ({ id, kind, rect: L(r), detail });
export const DORM_PATHS = [
  p(
    'dorm_promenade',
    'lane',
    Q.PROM,
    'The plaza lane carried on east from the dorm street along the park’s south side, past the dorm courtyard’s gate and the common room, to the plaza on the beach promenade.',
  ),
  p(
    'dorm_row',
    'lane',
    Q.ROW,
    'The dorm quarter’s south street: east off the dorm street past the villas’ doors to the sea terrace.',
  ),
  p(
    'sea_terrace',
    'court',
    Q.TERRACE,
    'A paved terrace at the dorm row’s east end, the beach promenade’s south end, with benches looking south to the sea.',
  ),
  p(
    'ns_walk_n',
    'walk',
    Q.NS_N,
    'The quarter’s north-south walk from the courts walk, between N-W and N-E, to the park.',
  ),
  p('ns_walk_park', 'walk', Q.NS_PARK, 'The north-south walk through the park, over the pond on a wooden bridge.'),
  p('ns_walk_s', 'walk', Q.NS_S, 'The north-south walk from the promenade past S-E’s court to the dorm row.'),
  p('north_path', 'walk', Q.NORTH, 'Behind N-W, past the gardens’ gate and N-E’s south end, east to the lookout deck.'),
  p('park_west_walk', 'walk', Q.WEST, 'Along the park’s west side, from the north path to the promenade.'),
  p(
    'park_north_walk',
    'walk',
    Q.PARK_N,
    'Along the park’s north side under N-W’s balconies, east to the beach promenade.',
  ),
  p(
    'courts_walk_east',
    'walk',
    Q.COURTS_EAST,
    'The courts walk on east from the onsen path’s foot to a bench at the water.',
  ),
  ...[...Q.LOOP_LINKS, ...LOOP_RECTS].map((r, i) =>
    p(`park_loop_${i}`, 'walk', r, 'The loop walk round the big lawn, and the walks off it.'),
  ),
  p('park_boardwalk', 'walk', Q.BOARDWALK, 'A boardwalk east off the pond’s bridge to the cherry’s ring seat.'),
  {
    id: 'cherry_ring',
    kind: 'court',
    circle: [Q.RING.x, Q.RING.z, Q.RING.pad],
    detail: 'The paved round under the park’s cherry, its ring seat round the trunk.',
  },
  p('commons_apron', 'court', Q.COMMONS_APRON, 'The paved apron under the common room’s canopy, on the promenade.'),
  p('ne_door_walk', 'walk', Q.NE_DOOR, 'From the north-south walk to N-E’s door.'),
  p('se_door_walk', 'walk', Q.SE_DOOR, 'From the north-south walk across S-E’s court to its door in the angle.'),
  ...Q.VILLA_DOORS.map((r, i) => p(`villa_walk_${i}`, 'walk', r, 'From the dorm row to a villa’s door.')),
  p(
    'garden_path',
    'walk',
    Q.GARDEN_PATH,
    'From the north path into the residents’ allotments, on the courts gate’s axis.',
  ),
  ...Q.PLOT_WALKS.map((r, i) => p(`plot_walk_${i}`, 'walk', r, 'A gravel walk along the allotment plots.')),
  p('pergola_walk', 'walk', Q.PERGOLA_WALK, 'From the north path to N-E’s pergola in the sea garden.'),
  p('pergola_pad', 'court', Q.PERGOLA, 'Under the pergola: two picnic tables.'),
  p(
    'beach_promenade',
    'lane',
    Q.BEACH_PROM,
    'Along the sea wall from the lookout deck to the sea terrace: benches facing the sea, steps to the sand.',
  ),
  p(
    'beach_plaza',
    'court',
    Q.PLAZA,
    'Where the promenade meets the beach: two drinks machines, a bench, a beach tap, wide steps down.',
  ),
  p('fitness_corner', 'court', Q.FITNESS, 'Three bars beside the beach promenade.'),
  p('lookout_deck', 'court', Q.DECK, 'A timber deck over the water at the north path’s end.'),
  ...[...COAST_GARDEN_RECTS()].map((r, i) =>
    p(
      `coast_garden_${i}`,
      i === 1 ? 'court' : 'walk',
      r,
      'The garden loop south of the villas through the pergola to the sea-facing rest court.',
    ),
  ),
];
function COAST_GARDEN_RECTS() {
  return [COAST_GARDEN.entry, COAST_GARDEN.pergola, ...COAST_GARDEN.paths];
}
const g = (id, r, detail) => ({ id, rect: L(r), detail });
export const DORM_GREEN = [
  g(
    'dorm_park',
    Q.PARK,
    'The park at the heart of the dorm quarter: the big lawn, the pond, the cherry, the play corner.',
  ),
  g(
    'dorm_gardens',
    [Q.ORCHARD[0], Q.ORCHARD[1], Q.ORCHARD[2], Q.NORTH[2]],
    'The residents’ allotments and the orchard of plums and persimmons.',
  ),
  g(
    'ne_sea_garden',
    [Q.block('dorm_ne_3')[1], Q.BEACH_PROM[0], -56.5, Q.NORTH[2]],
    'N-E’s gardens and the sea garden with its pergola.',
  ),
  g(
    'quarter_lawns',
    [Q.WEST[0], Q.EDGE[0], Q.PROM[3], Q.ROW[2]],
    'The lawns round the dorm courtyard, Eric’s block and S-E.',
  ),
  g(
    'dorm_row_garden',
    [82, 96.9, 12, 20],
    'Lawn and trees on the dorm row’s south side, between the ramen shop and the villas.',
  ),
  ...COAST_GARDEN.lawns.map((r, i) =>
    g(`coast_garden_lawn_${i}`, r, 'Open coastal lawn with low stone stepping blocks and clear sea views.'),
  ),
];
export const DORM_SAND = [
  { id: 'dorm_beach', poly: Q.SHORE, detail: 'The sand beach under the beach promenade’s sea wall.' },
];
