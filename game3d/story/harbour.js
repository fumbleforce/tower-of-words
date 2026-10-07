// The harbour, walked from the office street's west end into the supply yard, out on the piers, across to the ferry
// landing and down the harbour walk (docs/game/places.md). The terminal and the harbour office are shut for now and
// say so. East along the street past the harbour walk goes back to the office street; up the works lane or the works
// street goes on to the old works.
export default {
  start: 'arrive',
  on: {
    'talk:campus':'to_campus','zone:campus_exit':'to_campus',
    'talk:office_street': 'to_offices',
    'zone:east_exit': 'to_offices',
    'talk:works_lane': 'to_works',
    'zone:lane_exit': 'to_works',
    'talk:works_street': 'to_works_street',
    'zone:street_exit': 'to_works_street',
    'talk:ferry_terminal': 'shut',
    'talk:harbour_office': 'shut',
  },
  goal: { office_street: 'true' },
  nodes: {
    to_campus:[{do:'trip',to:'campus'}],
    arrive: [
      {
        if: 'going_home',
        then: [{ do: 'goal', text: 'The dorms are back along the office street, past the gym and down the north street.' }],
        else: [
          {
            do: 'goal',
            text: 'Head office is back along the office street, past the gym and the plaza. Take its lift down to B2.',
          },
        ],
      },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_offices: [{ do: 'trip', to: 'office_quarter' }],
    to_works: [{ do: 'trip', to: 'works' }],
    to_works_street: [{ do: 'trip', to: 'works' }],
  },
};
