// The old works' things and registration IDs (places/works.js), kept beside the catalog (catalog.js). The spots past
// lane_entry are the nooks (docs/game/places.md, "Nooks"): nothing in them yet.
export const WORKS_DETAILS = {
  things: {
    harbour_lane: { label: 'To the harbour', kind: 'thing', verb: 'Go' },
    office_street: { label: 'To the office street', kind: 'thing', verb: 'Go' },
    old_power_plant: { label: 'Old power plant', kind: 'thing', verb: 'Go in' },
    old_factory: { label: 'Old factory', kind: 'thing', verb: 'Go in' },
    server_hall: { label: 'Server hall', kind: 'thing', verb: 'Go in' },
    recycling_centre: { label: 'Recycling centre', kind: 'thing', verb: 'Go in' },
    research_lab: { label: 'Amakawa Research', kind: 'thing', verb: 'Go in' },
  },
  spots: ['lane_entry', 'chimney_foot', 'smoking_corner', 'gatehouse_window', 'transformer_lot', 'weather_station'],
  nooks: ['chimney_foot', 'smoking_corner', 'gatehouse_window', 'transformer_lot', 'weather_station'],
  seats: [],
  zones: ['lane_exit', 'street_exit'],
  people: [],
  hooks: [],
};
