// The sports ground's things and registration IDs (places/sports.js), kept beside the catalog (catalog.js).
export const SPORTS_DETAILS = {
  things: {
    north_street: { label: 'To the north street', kind: 'thing', verb: 'Go' },
    onsen_path: { label: 'To the onsen path', kind: 'thing', verb: 'Go' },
    office_street: { label: 'To the office street', kind: 'thing', verb: 'Go' },
    gym: { label: 'Gym', kind: 'thing', verb: 'Go in' },
    pool: { label: 'Pool', kind: 'thing', verb: 'Go in' },
  },
  spots: ['north_entry', 'sports_courtside', 'sports_grove_bench'],
  nooks: ['sports_courtside', 'sports_grove_bench'], // docs/game/places.md, "Nooks"
  seats: [],
  zones: ['north_exit', 'east_exit', 'west_exit'],
  people: [],
  hooks: [],
};

// The pool deck's (places/pool.js), walked through the shower pavilion from the sports ground.
export const POOL_DETAILS = {
  things: {
    changing_room: { label: 'To the changing room', kind: 'thing', verb: 'Go' },
  },
  spots: [
    'deck_in',
    'pool_steps',
    'pool_blocks',
    'lifeguard_chair',
    'deck_benches',
    'float_rack',
    'pool_fence_corner',
    'pool_lost_property',
  ],
  nooks: ['pool_fence_corner', 'pool_lost_property'], // docs/game/places.md, "Nooks"
  seats: ['deck_bench_n', 'deck_bench_s'],
  zones: [],
  people: [],
  hooks: [],
};
