// The east coast's things and registration IDs (places/east-coast.js), kept beside the catalog (catalog.js).
export const EAST_COAST_DETAILS = {
  things: {
    dorm_street: { label: 'To the dorm street', kind: 'thing', verb: 'Go' },
    courts_walk: { label: 'To the gym and pool', kind: 'thing', verb: 'Go' },
    lookout: { label: 'Lookout', kind: 'thing', verb: 'Look' }, // the nook east_coast_lookout
    onsen: { label: 'Onsen', kind: 'thing', verb: 'Go in' },
  },
  spots: ['row_entry', 'east_coast_lookout', 'east_coast_shrine'],
  nooks: ['east_coast_lookout', 'east_coast_shrine'], // docs/game/places.md, "Nooks"
  seats: [],
  zones: ['row_exit', 'courts_exit'],
  people: [],
  hooks: [],
};
