// The gym's corner inside its main doors, from the sports lane (docs/game/places.md). Back out through the doors.
export default {
  start: 'arrive',
  on: {
    'talk:gym_door': 'to_sports',
  },
  goal: { gym_door: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are back down the north street, east of the park.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    to_sports: [{ do: 'trip', to: 'sports' }],
  },
};
