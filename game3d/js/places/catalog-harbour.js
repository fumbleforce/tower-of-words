// The harbour's things and registration IDs (places/harbour.js), kept beside the catalog (catalog.js).
export const HARBOUR_DETAILS = {
  things: {
    office_street: { label: 'To the office street', kind: 'thing', verb: 'Go' },
    works_lane: { label: 'To the old works', kind: 'thing', verb: 'Go' },
    works_street: { label: 'To the works street', kind: 'thing', verb: 'Go' },
    ferry_terminal: { label: 'Ferry terminal', kind: 'thing', verb: 'Go in' },
    harbour_office: { label: 'Harbour office', kind: 'thing', verb: 'Go in' },
  },
  spots: ['street_entry', 'harbour_pier_end', 'harbour_shed_back', 'harbour_ferry_lookout'],
  nooks: ['harbour_pier_end', 'harbour_shed_back', 'harbour_ferry_lookout'], // docs/game/places.md, "Nooks"
  seats: [],
  zones: ['east_exit', 'lane_exit', 'street_exit'],
  people: [],
  hooks: [],
};
