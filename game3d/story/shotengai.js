// The shop street and the seafront, a side trip off the plaza (docs/game/places.md). Its shops are shut for now:
// each door says so. Out the east end goes back to the plaza, or after work up the dorm street to the dorm
// courtyard.
export default {
  start: 'arrive',
  on: {
    'talk:plaza_lane': [{ if: 'going_home', node: 'to_dorms' }, 'to_plaza'],
    'zone:plaza_exit': [{ if: 'going_home', node: 'to_dorms' }, 'to_plaza'],
    'talk:bike_shop': 'shut',
    'talk:store': 'shut',
    'talk:bakery': 'shut',
    'talk:game_centre': 'shut',
    'talk:karaoke': 'shut',
    'talk:izakaya': 'shut',
  },
  goal: { plaza_lane: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are up the street, east of the arcade.' }],
        else: [{ do: 'goal', text: 'Head office is back past the plaza. Take its lift down to B2.' }] },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    to_dorms: [{ do: 'trip', to: 'dorm_court' }],
  },
};
