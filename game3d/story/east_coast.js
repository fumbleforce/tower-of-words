// The east coast, walked from the dorm street along the dorm row to the sea terrace, up the coast and on to the onsen
// (docs/game/places.md). The onsen's door is shut for now and says so. West along the row goes back to the dorm
// street; west along the courts walk goes on to the gym and the pool.
export default {
  start: 'arrive',
  on: {
    'talk:dorm_street': 'to_east_lane',
    'zone:row_exit': 'to_east_lane',
    'talk:courts_walk': 'to_sports',
    'zone:courts_exit': 'to_sports',
    'talk:onsen': 'shut',
  },
  goal: { dorm_street: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are back along the row, through the gate off the street.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_east_lane: [{ do: 'trip', to: 'east_lane' }],
    to_sports: [{ do: 'trip', to: 'sports' }],
  },
};
