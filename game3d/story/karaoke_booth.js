// The karaoke box's booth, up the stairs from the front desk (docs/game/places.md). Back down the same way.
export default {
  start: 'arrive',
  on: {
    'talk:booth_door': 'to_desk',
  },
  goal: { booth_door: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are up the street, east of the arcade.' }],
        else: [{ do: 'goal', text: 'Head office is back past the plaza. Take its lift down to B2.' }] },
    ],
    to_desk: [{ do: 'trip', to: 'karaoke' }],
  },
};
