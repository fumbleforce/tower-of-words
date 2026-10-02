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
  },
  spots: ['plaza_entry', 'shotengai_shrine', 'shotengai_back_alley', 'shotengai_pine_bench'],
  nooks: ['shotengai_shrine', 'shotengai_back_alley', 'shotengai_pine_bench'], // docs/game/places.md, "Nooks"
  seats: [],
  zones: ['plaza_exit'],
  people: [],
  hooks: [],
};
