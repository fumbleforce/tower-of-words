// The pool deck, walked through the shower pavilion from the sports ground's pool walk (docs/game/places.md). Back
// through the men's changing room to the pool walk.
export default {
  start: 'arrive',
  on: {
    'talk:changing_room': 'to_sports',
  },
  goal: { changing_room: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are back down the north street, east of the park.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    to_sports: [{ do: 'trip', to: 'sports' }],
  },
};
