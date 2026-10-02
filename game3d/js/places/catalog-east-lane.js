// The east lane's things and registration IDs (places/east-lane.js), kept beside the catalog (catalog.js).
export const EAST_LANE_DETAILS = {
  things: {
    plaza_lane: { label: 'To the plaza', kind: 'thing', verb: 'Go' },
    shop_street: { label: 'To the shop street', kind: 'thing', verb: 'Go' },
    dorm_row: { label: 'To the sea terrace', kind: 'thing', verb: 'Go' },
    dorm_gate: { label: 'To the dorms', kind: 'thing', verb: 'Go' },
    cafe: { label: 'Café', kind: 'thing', verb: 'Go in' },
    liquor_shop: { label: 'Liquor shop', kind: 'thing', verb: 'Go in' },
    barber: { label: 'Barber', kind: 'thing', verb: 'Go in' },
    travel_office: { label: 'Amakawa Travel', kind: 'thing', verb: 'Go in' },
  },
  spots: ['plaza_entry'],
  seats: [],
  zones: ['plaza_exit', 'shop_exit', 'dorm_exit', 'row_exit'],
  people: [],
  hooks: [],
};
