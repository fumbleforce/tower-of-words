// The dorm common room, through its glazed door off the inner court (docs/game/places.md). Back out the same way.
export default {
  start: 'arrive',
  on: {
    'talk:commons_door': 'to_court',
  },
  goal: { commons_door: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are back along the row, through the gate off the street.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    to_court: [{ do: 'trip', to: 'east_coast' }],
  },
};
