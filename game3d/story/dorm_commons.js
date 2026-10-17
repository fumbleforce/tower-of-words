// The dorm common room, through its glazed door on the promenade (docs/game/places.md). Back out the same way.
export default {
  start: 'arrive',
  on: {
    'talk:commons_door': 'to_court',
  },
  goal: { commons_door: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorm is west along the promenade, in through the gate on the left.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    to_court: [{ do: 'trip', to: 'east_coast' }],
  },
};
