// The office quarter's things and registration IDs (places/office-quarter.js), kept beside the catalog (catalog.js).
export const OFFICE_QUARTER_DETAILS = {
  things: {
    campus_shed: { label: 'North campus', kind: 'thing', verb: 'Go' },
    campus_quarter: { label: 'North campus', kind: 'thing', verb: 'Go' },
    sports_lane: { label: 'To the gym and pool', kind: 'thing', verb: 'Go' },
    harbour: { label: 'To the harbour', kind: 'thing', verb: 'Go' },
    trading_office: { label: 'Amakawa Trading', kind: 'thing', verb: 'Go in' },
    foods_office: { label: 'Amakawa Foods', kind: 'thing', verb: 'Go in' },
    electric_office: {
      label: 'Amakawa Electric',
      kind: 'thing',
      verb: 'Go in',
    },
    logistics_office: {
      label: 'Amakawa Logistics',
      kind: 'thing',
      verb: 'Go in',
    },
    construction_office: {
      label: 'Amakawa Construction',
      kind: 'thing',
      verb: 'Go in',
    },
    insurance_office: { label: 'Amakawa Life', kind: 'thing', verb: 'Go in' },
    bank: { label: 'Bank', kind: 'thing', verb: 'Go in' },
  },
  spots: ['street_entry', 'office_smokers', 'office_vending'],
  nooks: ['office_smokers', 'office_vending'], // docs/game/places.md, "Nooks"
  seats: [],
  zones: ['campus_shed_exit', 'campus_quarter_exit', 'east_exit', 'west_exit'],
  people: [],
  hooks: [],
};
