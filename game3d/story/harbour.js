// The harbour, walked from the office street's west end into the supply yard, out on the piers, across to the ferry
// landing and down the harbour walk (docs/game/places.md). The terminal and the harbour office are shut for now and
// say so. East along the street past the harbour walk goes back to the office street.
export default {
  start: 'arrive',
  on: {
    'talk:office_street': 'to_offices',
    'zone:east_exit': 'to_offices',
    'talk:ferry_terminal': 'shut',
    'talk:harbour_office': 'shut',
  },
  goal: { office_street: 'true' },
  nodes: {
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
  },
};
