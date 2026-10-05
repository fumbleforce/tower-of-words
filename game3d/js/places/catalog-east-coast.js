// The east coast's things and registration IDs (places/east-coast.js), kept beside the catalog (catalog.js).
export const EAST_COAST_DETAILS = {
  things: {
    dorm_street: { label: 'To the dorm street', kind: 'thing', verb: 'Go' },
    courts_walk: { label: 'To the gym and pool', kind: 'thing', verb: 'Go' },
    lookout: { label: 'Lookout', kind: 'thing', verb: 'Look' }, // the nook east_coast_lookout
    kuroda: { label: 'Mr. Hamada', kind: 'person' }, // day 2, after work, at the telescope
    // day 3 (story/day3/east_coast.js): Emi's lunch on the terrace, Aoi's walk in the evening (places/day3/)
    emi: { label: 'Emi', kind: 'person' },
    aoi: { label: 'Woman from the train', kind: 'person' },
    onsen: { label: 'Onsen', kind: 'thing', verb: 'Go in' },
    commons: { label: 'Common room', kind: 'thing', verb: 'Go in' },
  },
  spots: ['row_entry', 'east_coast_lookout', 'east_coast_shrine', 'lookout_view', 'inner_court', 'inner_court_bench'],
  nooks: ['east_coast_lookout', 'east_coast_shrine'], // docs/game/places.md, "Nooks"
  seats: [],
  zones: ['row_exit', 'courts_exit'],
  people: ['kuroda', 'emi', 'aoi'],
  hooks: ['coastVisit'],
};

// The dorm common room's (places/commons.js), through its glazed door on the inner court.
export const DORM_COMMONS_DETAILS = {
  things: {
    commons_door: { label: 'To the inner court', kind: 'thing', verb: 'Go' },
    commons_printer: { label: 'Printer', kind: 'thing small' },
    art_table: { label: 'Art materials', kind: 'thing small' },
    drying_rack: { label: 'Drying rack', kind: 'thing' },
    commons_board: { label: 'Notice board', kind: 'thing' },
    kenji: { label: 'Kenji', kind: 'person' }, // day 3, the evening: the replay on the TV (places/day3/)
  },
  spots: [
    'commons_in',
    'commons_table',
    'commons_sofa',
    'commons_kitchen',
    'commons_rack',
    'commons_books',
    'commons_fridge',
  ],
  nooks: ['commons_books', 'commons_fridge'], // docs/game/places.md, "Nooks"
  seats: ['commons_sofa'],
  zones: [],
  people: ['kenji'],
  hooks: [],
};
