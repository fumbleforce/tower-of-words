// The office quarter, walked from the sports ground round the gym's corner and west along the office street past the
// offices and the bank (docs/game/places.md). Every door is shut for now and says so. East past the gym's corner
// goes back to the sports ground; west past the harbour walk goes on to the harbour.
export default {
  start: 'arrive',
  on: {
    'talk:campus_shed':'to_campus','zone:campus_shed_exit':'to_campus','talk:campus_quarter':'to_campus','zone:campus_quarter_exit':'to_campus',
    'talk:sports_lane': 'to_sports',
    'zone:east_exit': 'to_sports',
    'talk:harbour': 'to_harbour',
    'zone:west_exit': 'to_harbour',
    'talk:trading_office': 'shut',
    'talk:foods_office': 'shut',
    'talk:electric_office': 'shut',
    'talk:logistics_office': 'shut',
    'talk:construction_office': 'shut',
    'talk:insurance_office': 'shut',
    'talk:bank': 'shut',
  },
  goal: { sports_lane: 'true' },
  nodes: {
    to_campus:[{do:'trip',to:'campus'}],
    arrive: [
      {
        if: 'going_home',
        then: [{ do: 'goal', text: 'The dorms are back past the gym and down the north street.' }],
        else: [
          {
            do: 'goal',
            text: 'Head office is back past the gym and the plaza. Take its lift down to B2.',
          },
        ],
      },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_sports: [{ do: 'trip', to: 'sports' }],
    to_harbour: [{ do: 'trip', to: 'harbour' }],
  },
};
