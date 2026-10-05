// The shop street's things and registration IDs (places/shotengai.js), kept beside the catalog (catalog.js).
export const SHOTENGAI_DETAILS = {
  things: {
    plaza_lane: { label: 'To the plaza', kind: 'thing', verb: 'Go' },
    bike_shop: { label: 'Bike shop', kind: 'thing', verb: 'Go in' },
    store: { label: 'Konbini', kind: 'thing', verb: 'Go in' },
    bakery: { label: 'Bakery', kind: 'thing', verb: 'Go in' },
    game_centre: { label: 'Game centre', kind: 'thing', verb: 'Go in' },
    karaoke: { label: 'Karaoke', kind: 'thing', verb: 'Go in' },
    izakaya: { label: 'Izakaya', kind: 'thing', verb: 'Go in' },
    // day 2's gathering after work (story/day2/shotengai.js): the two from B2 with bodies here, and their bench
    mori: { label: 'Mr. Mori', kind: 'person' },
    kenji: { label: 'Kenji', kind: 'person' },
    party_seat: { label: 'Bench', kind: 'thing', verb: 'Sit' },
    // day 3 (story/day3/shotengai.js): Saturday's shoppers (places/day3/)
    kuroda: { label: 'Mr. Hamada', kind: 'person' },
    aoi: { label: 'Woman from the train', kind: 'person' },
    kuro: { label: 'Receptionist', kind: 'person' },
    rei: { label: 'Tennis player', kind: 'person' },
  },
  spots: [
    'plaza_entry',
    'shotengai_shrine',
    'shotengai_back_alley',
    'shotengai_pine_bench',
    'party_group',
    'party_kenji',
    'party_mio',
  ],
  nooks: ['shotengai_shrine', 'shotengai_back_alley', 'shotengai_pine_bench'], // docs/game/places.md, "Nooks"
  seats: ['party_seat', 'party_mori'],
  zones: ['plaza_exit'],
  people: ['mori', 'kenji', 'kuroda', 'aoi', 'kuro', 'rei'],
  hooks: ['partySetup', 'partyFood'],
};

// The karaoke box's (places/karaoke.js, karaoke-booth.js): the front desk downstairs, through its door off the
// arcade, and one booth upstairs.
export const KARAOKE_DETAILS = {
  things: {
    karaoke_door: { label: 'To the shop street', kind: 'thing', verb: 'Go' },
    karaoke_stairs: { label: 'Upstairs', kind: 'thing', verb: 'Go' },
    karaoke_desk: { label: 'Front desk', kind: 'thing' },
  },
  spots: ['karaoke_in', 'karaoke_desk', 'karaoke_drinks', 'karaoke_bench', 'karaoke_stairs'],
  nooks: ['karaoke_bench'], // docs/game/places.md, "Nooks"
  seats: ['karaoke_bench'],
  zones: [],
  people: [],
  hooks: [],
};
export const KARAOKE_BOOTH_DETAILS = {
  things: {
    booth_door: { label: 'Downstairs', kind: 'thing', verb: 'Go' },
    song_terminal: { label: 'Song selector', kind: 'thing small' },
    booth_screen: { label: 'Screen', kind: 'thing' },
  },
  spots: ['booth_in', 'booth_table', 'booth_screen'],
  nooks: [],
  seats: ['booth_seat_w', 'booth_seat_e'],
  zones: [],
  people: [],
  hooks: [],
};
