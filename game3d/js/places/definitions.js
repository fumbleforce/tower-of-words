import { TRIPS as DAY2_TRIPS } from '../../story/day2/index.js';
// Narrative place order and source references, consumed by the runtime and its checks.
export const PLACE_FILES = {
  train: 'game3d/js/places/train.js',
  gate: 'game3d/js/places/lobby.js',
  forecourt: 'game3d/js/places/forecourt.js',
  plaza: 'game3d/js/places/plaza.js',
  office: 'game3d/js/places/office.js',
  dorm_court: 'game3d/js/places/dorm-court.js',
  dorms: 'game3d/js/places/dorms.js',
  shotengai: 'game3d/js/places/shotengai.js',
  east_lane: 'game3d/js/places/east-lane.js',
  east_coast: 'game3d/js/places/east-coast.js',
  sports: 'game3d/js/places/sports.js',
  pool: 'game3d/js/places/pool.js',
  gym: 'game3d/js/places/gym.js',
  office_quarter: 'game3d/js/places/office-quarter.js',
  harbour: 'game3d/js/places/harbour.js',
  works: 'game3d/js/places/works.js',
};
// Place names for the save list and the end-of-day photos.
export const PLACE_NAMES = {
  train: 'Monorail',
  gate: 'Station security',
  forecourt: 'Forecourt',
  plaza: 'Fountain plaza',
  office: 'IT support, B2',
  dorm_court: 'Dorm courtyard',
  dorms: "Eric's room",
  shotengai: 'Shop street',
  east_lane: 'East lane',
  east_coast: 'East coast',
  sports: 'Gym and pool',
  pool: 'Pool deck',
  gym: 'Gym',
  office_quarter: 'Office street',
  harbour: 'Harbour',
  works: 'Old works',
};
export const NEXT = { train: 'gate', gate: 'forecourt', forecourt: 'office', dorm_court: 'dorms' };
// The other moves, played by the story's `trip` step: the walks between outdoor chunks, and the way home after work
// (B2 up to the forecourt by lift, then east through the plaza to the dorm courtyard). The shop street is a side
// trip off the plaza; after work its east end goes on up the dorm street to the dorm courtyard. In the morning the
// plaza's lane goes on east into the east lane, which leads back, down to the shop street, and after work in at the
// dorm courtyard's gate. East along the dorm row from the east lane's dorm street is the east coast, up to the
// onsen; north up the east lane's north street is the sports ground, whose courts walk leads on to the onsen path
// in the east coast, so the three make a loop; west past the gym's corner is the office quarter, and west along
// its street the harbour; north out of the harbour, up the works lane or up the works street, are the old works,
// whose two ways both lead back into the harbour, so the two make a loop. The pool deck is through the shower
// pavilion's door at the sports ground's pool walk, and back; the gym's corner through its main doors on the lane.
export const TRIPS = {
  forecourt: ['plaza'],
  plaza: ['forecourt', 'dorm_court', 'shotengai', 'east_lane'],
  office: ['forecourt'],
  shotengai: ['plaza', 'dorm_court'],
  east_lane: ['plaza', 'shotengai', 'dorm_court', 'east_coast', 'sports'],
  east_coast: ['east_lane', 'sports'],
  sports: ['east_lane', 'east_coast', 'office_quarter', 'pool', 'gym'],
  pool: ['sports'],
  gym: ['sports'],
  office_quarter: ['sports', 'harbour'],
  harbour: ['office_quarter', 'works'],
  works: ['harbour'],
};
// Day 2 has its own ways (game3d/story/day2/index.js TRIPS, both periods), and no NEXT line.
export const DAY_TRIPS = { 2: DAY2_TRIPS };
export const canTravel = (from, to, day = 1) =>
  DAY_TRIPS[day] ? !!DAY_TRIPS[day][from]?.includes(to) : NEXT[from] === to || !!TRIPS[from]?.includes(to);
export const STORY_FILES = [
  'train',
  'gate',
  'forecourt',
  'plaza',
  'office',
  'dorm_court',
  'dorms',
  'shotengai',
  'east_lane',
  'east_coast',
  'sports',
  'pool',
  'gym',
  'office_quarter',
  'harbour',
  'works',
  'transitions',
];
