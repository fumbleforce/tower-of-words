// The old works, walked from the supply yard up the works lane and along the yard, down the works street and along
// the research walk (docs/game/places.md). The factory's gates and the power plant's door are chained; the server
// hall, the recycling centre and Amakawa Research are shut for now and say so. Down the lane goes back into the
// supply yard, down the street onto the office street.
export default {
  start: 'arrive',
  on: {
    'talk:harbour_lane': 'to_harbour',
    'zone:lane_exit': 'to_harbour',
    'talk:office_street': 'to_street',
    'zone:street_exit': 'to_street',
    'talk:old_power_plant': 'chained',
    'talk:old_factory': 'chained',
    'talk:server_hall': 'shut',
    'talk:recycling_centre': 'shut',
    'talk:research_lab': 'shut',
  },
  goal: { office_street: 'true' },
  nodes: {
    arrive: [
      {
        if: 'going_home',
        then: [
          {
            do: 'goal',
            text: 'The dorms are back down the works street, east along the office street, past the gym and down the north street.',
          },
        ],
        else: [
          {
            do: 'goal',
            text: 'Head office is back down the works street and east along the office street, past the gym and the plaza. Take its lift down to B2.',
          },
        ],
      },
    ],
    chained: ['> It is chained shut.'],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_harbour: [{ do: 'trip', to: 'harbour' }],
    to_street: [{ do: 'trip', to: 'harbour' }],
  },
};
