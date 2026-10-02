// The east lane, the plaza's lane walked on east in the morning (docs/game/places.md). Its shops are shut for now:
// each door says so. West along the lane goes back to the plaza, south down the dorm street to the shop street, east
// along the dorm row to the sea terrace and the east coast, north up the north street to the gym and the pool; the
// dorm courtyard's gate is for after work.
export default {
  start: 'arrive',
  on: {
    'talk:plaza_lane': 'to_plaza',
    'zone:plaza_exit': 'to_plaza',
    'talk:shop_street': 'to_shops',
    'zone:shop_exit': 'to_shops',
    'talk:dorm_row': 'to_coast',
    'zone:row_exit': 'to_coast',
    'talk:north_street': 'to_sports',
    'zone:north_exit': 'to_sports',
    'talk:dorm_gate': [{ if: 'going_home', node: 'to_dorms' }, 'dorms_later'],
    'zone:dorm_exit': [{ if: 'going_home', node: 'to_dorms' }, 'dorms_later'],
    'talk:cafe': 'shut',
    'talk:liquor_shop': 'shut',
    'talk:barber': 'shut',
    'talk:travel_office': 'shut',
  },
  goal: { plaza_lane: '!going_home', dorm_gate: 'going_home' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are through the gate off the street, east of the park.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    dorms_later: ["> That's the gate to the dorm courtyard. The dorms are for after work."],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    to_shops: [{ do: 'trip', to: 'shotengai' }],
    to_coast: [{ do: 'trip', to: 'east_coast' }],
    to_sports: [{ do: 'trip', to: 'sports' }],
    to_dorms: [{ do: 'trip', to: 'dorm_court' }],
  },
};
