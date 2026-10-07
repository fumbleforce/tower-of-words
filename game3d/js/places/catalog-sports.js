// The sports ground's things and registration IDs (places/sports.js), kept beside the catalog (catalog.js).
export const SPORTS_DETAILS = {
  things: {
    north_street: { label: 'To the north street', kind: 'thing', verb: 'Go' },
    onsen_path: { label: 'To the onsen path', kind: 'thing', verb: 'Go' },
    office_street: { label: 'To the office street', kind: 'thing', verb: 'Go' },
    gym: { label: 'Gym', kind: 'thing', verb: 'Go in' },
    pool: { label: 'Pool', kind: 'thing', verb: 'Go in' },
    court_display: { label: 'Score display', kind: 'thing small' },
    ball_basket: { label: 'Ball basket', kind: 'thing small' },
    rei: { label: 'Tennis player', kind: 'person' }, // day 3, the afternoon: serves on the west court
  },
  spots: [
    'north_entry',
    'sports_courtside',
    'sports_grove_bench',
    'court_gate',
    'court_bench',
    'court_net',
    'court_baseline_s',
    'court_baseline_n',
    'court_display',
    'court_corner',
  ],
  nooks: ['sports_courtside', 'sports_grove_bench', 'court_corner'], // docs/game/places.md, "Nooks"
  seats: ['court_bench'],
  zones: ['north_exit', 'east_exit', 'west_exit'],
  people: ['rei'],
  hooks: [],
};

// The pool deck's (places/pool.js), walked through the shower pavilion from the sports ground.
export const POOL_DETAILS = {
  things: {
    changing_room: { label: 'Pool exit', kind: 'thing', verb: 'Go' },
    // day 3, the evening: the swimming club's last outdoor swim (story/clubs.js, story/day3/pool.js)
    emi: { label: 'Emi', kind: 'person' },
    kuro: { label: 'Receptionist', kind: 'person' },
    attendant: { label: 'Attendant', kind: 'person' },
    member: { label: 'Club member', kind: 'person' },
    pool_goggles: { label: 'Goggles', kind: 'thing small' },
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
  people: ['emi', 'kuro', 'attendant', 'member'],
  hooks: ['poolSession'],
};

// The gym's lobby and sports hall (places/gym.js), from the sports lane.
export const GYM_DETAILS = {
  things: {
    gym_door: { label: 'To the sports lane', kind: 'thing', verb: 'Go' },
    gym_changing: { label: 'To the pool', kind: 'thing', verb: 'Go' }, // no pin until the story uses it
    booking_terminal: { label: 'Booking terminal', kind: 'thing small' },
    gym_printer: { label: 'Printer', kind: 'thing small' },
    desk_fan: { label: 'Desk fan', kind: 'thing small' },
    gym_board: { label: 'Club board', kind: 'thing' },
    // day 3: the attendant at the reception, Mori's booking visit, Emi and Kuro (story/day3/gym.js, story/clubs.js)
    attendant: { label: 'Attendant', kind: 'person' },
    mori: { label: 'Mr. Mori', kind: 'person' },
    emi: { label: 'Emi', kind: 'person' },
    kuro: { label: 'Receptionist', kind: 'person' },
  },
  spots: ['gym_in', 'gym_desk', 'gym_lobby', 'gym_benches', 'gym_meeting', 'gym_court', 'gym_store', 'gym_lockers'],
  nooks: ['gym_store', 'gym_lockers'], // docs/game/places.md, "Nooks"
  seats: ['gym_bench_n', 'gym_bench_s'],
  zones: [],
  people: ['attendant', 'mori', 'emi', 'kuro'],
  hooks: ['bookingRepair', 'winterClub'],
};
